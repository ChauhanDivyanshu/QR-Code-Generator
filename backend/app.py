import os
import sys
import time
import shutil
import socket
import webbrowser
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import Config
from utils.excel_parser import read_excel_preview, parse_excel_with_columns, is_allowed_file
from utils.qr_generator import generate_batch_parallel, create_zip_streaming
from utils.job_manager import job_manager


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


def find_free_port(start_port=5000, max_tries=20):
    for port in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start_port


static_dir = resource_path("static")
app = Flask(__name__, static_folder=static_dir, static_url_path="")
app.config.from_object(Config)
CORS(app)
Config.init_folders()


# Store uploaded files temporarily by session
uploaded_files = {}


# =====================
# Frontend Routes
# =====================
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static_files(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


# =====================
# API: Health
# =====================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "running",
        "save_location": Config.QR_OUTPUT_FOLDER,
    }), 200


# =====================
# API: Preview File (Step 1)
# =====================
@app.route("/api/preview", methods=["POST"])
def preview_file():
    """
    Upload file and return column preview
    User will then select which columns to use
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not is_allowed_file(file.filename, Config.ALLOWED_EXTENSIONS):
        return jsonify({"error": "Invalid format. Use .xlsx, .xls, .csv"}), 400

    try:
        # Save file with unique upload ID
        upload_id = f"upload_{int(time.time() * 1000)}"
        safe_name = secure_filename(file.filename)
        upload_name = f"{upload_id}_{safe_name}"
        upload_path = os.path.join(Config.UPLOAD_FOLDER, upload_name)
        file.save(upload_path)
        
        # Read preview
        preview = read_excel_preview(upload_path, sample_size=5)
        
        # Store file reference for later use
        uploaded_files[upload_id] = {
            "path": upload_path,
            "original_name": safe_name,
            "uploaded_at": time.time(),
        }
        
        return jsonify({
            "upload_id": upload_id,
            "filename": safe_name,
            "columns": preview["columns"],
            "column_names": preview["column_names"],
            "preview_rows": preview["preview_rows"],
            "total_rows": preview["total_rows"],
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================
# Background Processing Function
# =====================
def process_qr_generation(job_id, upload_path, session_dir, qr_size, qr_column, id_column):
    """Runs in background thread"""
    try:
        job_manager.update_progress(job_id, 0, 100, "Reading Excel file...")
        
        parse_result = parse_excel_with_columns(upload_path, qr_column, id_column)
        data_list = parse_result["data"]
        
        if not data_list:
            job_manager.fail_job(job_id, "No valid data found in selected column")
            return
        
        total = len(data_list)
        job_manager.update_progress(job_id, 0, total, f"Generating {total:,} QR codes...")
        
        def progress_callback(current, total_count):
            job_manager.update_progress(
                job_id, 
                current, 
                total_count, 
                f"Generated {current:,} of {total_count:,} QR codes"
            )
        
        results = generate_batch_parallel(
            data_list,
            session_dir,
            box_size=qr_size,
            progress_callback=progress_callback,
            max_workers=8,
        )
        
        success_count = sum(1 for r in results if r and r.get("status") == "success")
        error_count = total - success_count
        
        job_manager.update_progress(job_id, total, total, "Creating ZIP file...")
        zip_path, zip_name = create_zip_streaming(results, session_dir)
        
        # Clean upload file
        try:
            os.remove(upload_path)
        except OSError:
            pass
        
        job_manager.complete_job(job_id, {
            "session_id": os.path.basename(session_dir),
            "save_location": session_dir,
            "stats": {
                "total": total,
                "generated": success_count,
                "failed": error_count,
                "qr_column": parse_result["qr_column"],
                "id_column": parse_result["id_column"],
            },
            "sample_results": [r for r in results[:20] if r],
            "zip_file": zip_name,
        })
        
    except Exception as e:
        job_manager.fail_job(job_id, str(e))


# =====================
# API: Generate (Step 2)
# =====================
@app.route("/api/generate", methods=["POST"])
def start_generation():
    """
    Start QR generation with user-selected columns
    """
    data = request.json
    upload_id = data.get("upload_id")
    qr_column = data.get("qr_column")
    id_column = data.get("id_column")  # Optional
    qr_size = int(data.get("size", 8))
    
    if not upload_id or upload_id not in uploaded_files:
        return jsonify({"error": "Invalid or expired upload ID. Please upload again."}), 400
    
    if not qr_column:
        return jsonify({"error": "QR column not selected"}), 400
    
    try:
        file_info = uploaded_files[upload_id]
        upload_path = file_info["path"]
        original_name = file_info["original_name"]
        
        if not os.path.exists(upload_path):
            return jsonify({"error": "Uploaded file not found. Please upload again."}), 400
        
        # Create session folder
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        original_stem = os.path.splitext(original_name)[0][:30]
        folder_name = f"{timestamp}_{original_stem}"
        session_dir = os.path.join(Config.QR_OUTPUT_FOLDER, folder_name)
        os.makedirs(session_dir, exist_ok=True)
        
        # Create job
        job_id = f"job_{int(time.time() * 1000)}"
        job_manager.create_job(job_id)
        
        # Start background thread
        thread = threading.Thread(
            target=process_qr_generation,
            args=(job_id, upload_path, session_dir, qr_size, qr_column, id_column),
            daemon=True,
        )
        thread.start()
        
        del uploaded_files[upload_id]
        
        return jsonify({
            "job_id": job_id,
            "message": "Generation started",
        }), 202
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================
# API: Job Status
# =====================
@app.route("/api/job/<job_id>", methods=["GET"])
def get_job_status(job_id):
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job), 200


# =====================
# API: Cancel Upload
# =====================
@app.route("/api/cancel-upload/<upload_id>", methods=["DELETE"])
def cancel_upload(upload_id):
    if upload_id in uploaded_files:
        try:
            path = uploaded_files[upload_id]["path"]
            if os.path.exists(path):
                os.remove(path)
            del uploaded_files[upload_id]
        except Exception:
            pass
    return jsonify({"message": "Upload cancelled"}), 200


# =====================
# API: Serve QR Image
# =====================
@app.route("/api/qr/<session_id>/<filename>", methods=["GET"])
def serve_qr_image(session_id, filename):
    directory = os.path.join(Config.QR_OUTPUT_FOLDER, session_id)
    if os.path.exists(os.path.join(directory, filename)):
        return send_from_directory(directory, filename)
    return jsonify({"error": "File not found"}), 404


# =====================
# API: Download ZIP
# =====================
@app.route("/api/download-zip/<session_id>", methods=["GET"])
def download_zip(session_id):
    directory = os.path.join(Config.QR_OUTPUT_FOLDER, session_id)
    zip_path = os.path.join(directory, "qr_codes_bundle.zip")
    if os.path.exists(zip_path):
        return send_file(zip_path, as_attachment=True, download_name=f"{session_id}_qr_codes.zip")
    return jsonify({"error": "ZIP not found"}), 404


# =====================
# API: Open Folder
# =====================
@app.route("/api/open-folder/<session_id>", methods=["GET"])
def open_folder(session_id):
    directory = os.path.join(Config.QR_OUTPUT_FOLDER, session_id)
    try:
        if os.path.exists(directory):
            if sys.platform == "win32":
                os.startfile(directory)
            elif sys.platform == "darwin":
                os.system(f'open "{directory}"')
            else:
                os.system(f'xdg-open "{directory}"')
            return jsonify({"message": "Folder opened"}), 200
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"error": "File exceeds 100MB limit"}), 413


def open_browser(port):
    time.sleep(2)
    webbrowser.open(f"http://127.0.0.1:{port}")


def cleanup_old_uploads():
    """Remove uploads older than 1 hour"""
    while True:
        time.sleep(600)  # Every 10 min
        try:
            now = time.time()
            to_remove = []
            for uid, info in uploaded_files.items():
                if now - info["uploaded_at"] > 3600:
                    if os.path.exists(info["path"]):
                        os.remove(info["path"])
                    to_remove.append(uid)
            for uid in to_remove:
                del uploaded_files[uid]
        except Exception:
            pass


if __name__ == "__main__":
    PORT = find_free_port(5000)
    
    print("")
    print("=" * 65)
    print("   QR CODE GENERATOR - PROFESSIONAL EDITION")
    print("=" * 65)
    print(f"   URL           : http://127.0.0.1:{PORT}")
    print(f"   Save Location : {Config.QR_OUTPUT_FOLDER}")
    print(f"   Capacity      : 200,000+ QR codes")
    print("=" * 65)
    print("")
    
    threading.Thread(target=cleanup_old_uploads, daemon=True).start()
    threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()
    
    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True)
