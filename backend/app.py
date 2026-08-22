import os
import sys
import time
import socket
import webbrowser
import threading
import multiprocessing

# CRITICAL for PyInstaller executables
if __name__ == "__main__":
    multiprocessing.freeze_support()

from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from config import Config
from utils.excel_parser import read_excel_preview, parse_excel_with_columns, is_allowed_file
from utils.qr_generator import generate_batch_parallel, create_zip_streaming, OPTIMAL_WORKERS, USE_SEGNO
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
app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
CORS(app)
Config.init_folders()

uploaded_files = {}


@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static_files(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "running",
        "save_location": Config.QR_OUTPUT_FOLDER,
        "workers": OPTIMAL_WORKERS,
        "engine": "segno" if USE_SEGNO else "qrcode",
    }), 200


@app.route("/api/preview", methods=["POST"])
def preview_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not is_allowed_file(file.filename, Config.ALLOWED_EXTENSIONS):
        return jsonify({"error": "Invalid format. Use .xlsx, .xls, .csv"}), 400

    try:
        upload_id = f"upload_{int(time.time() * 1000)}"
        safe_name = secure_filename(file.filename) or "upload.xlsx"
        upload_name = f"{upload_id}_{safe_name}"
        upload_path = os.path.join(Config.UPLOAD_FOLDER, upload_name)

        file.save(upload_path)

        preview = read_excel_preview(upload_path, sample_size=5)

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
        return jsonify({"error": f"Preview failed: {str(e)}"}), 500


def format_time(seconds):
    if seconds is None or seconds < 0:
        return "—"
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        return f"{int(seconds // 60)}m {int(seconds % 60)}s"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h {m}m"


def process_qr_generation(job_id, upload_path, session_dir, qr_size, qr_column, id_column):
    try:
        start_time = time.time()
        job_manager.update_progress(job_id, 0, 100, "Reading Excel file...")

        parse_result = parse_excel_with_columns(upload_path, qr_column, id_column)
        data_list = parse_result["data"]

        if not data_list:
            job_manager.fail_job(job_id, "No valid data found in selected column")
            return

        total = len(data_list)
        parse_time = time.time() - start_time

        job_manager.update_progress(
            job_id, 0, total, f"Starting generation of {total:,} QR codes..."
        )

        gen_start = time.time()

        def progress_callback(current, total_count):
            elapsed = time.time() - gen_start
            if current > 0 and elapsed > 0:
                rate = current / elapsed
                eta_seconds = (total_count - current) / rate if rate > 0 else 0
                eta_str = format_time(eta_seconds)
                message = f"Generated {current:,} / {total_count:,} | Speed: {rate:.0f} QR/sec | ETA: {eta_str}"
            else:
                message = f"Generated {current:,} / {total_count:,}"

            job_manager.update_progress(job_id, current, total_count, message)

        results = generate_batch_parallel(
            data_list,
            session_dir,
            box_size=qr_size,
            progress_callback=progress_callback,
            max_workers=OPTIMAL_WORKERS,
        )

        gen_time = time.time() - gen_start
        success_count = sum(1 for r in results if r and r.get("status") == "success")
        error_count = total - success_count

        zip_name = None
        zip_time = 0.0

        if success_count <= 200000:
            job_manager.update_progress(job_id, total, total, "Creating ZIP file...")
            zip_start = time.time()

            def zip_progress(current, total_zip):
                job_manager.update_progress(
                    job_id, current, total_zip, f"Creating ZIP: {current:,} / {total_zip:,} files"
                )

            _zip_path, zip_name = create_zip_streaming(results, session_dir, zip_progress)
            zip_time = time.time() - zip_start
        else:
            job_manager.update_progress(
                job_id, total, total, f"Skipping ZIP ({success_count:,} files). Use Open Folder."
            )

        total_time = time.time() - start_time

        try:
            if os.path.exists(upload_path):
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
                "parse_time": round(parse_time, 2),
                "generation_time": round(gen_time, 2),
                "zip_time": round(zip_time, 2),
                "total_time": round(total_time, 2),
                "speed": round(success_count / gen_time, 0) if gen_time > 0 else 0,
            },
            "sample_results": [r for r in results[:20] if r],
            "zip_file": zip_name,
        })

    except Exception as e:
        job_manager.fail_job(job_id, str(e))
        try:
            if upload_path and os.path.exists(upload_path):
                os.remove(upload_path)
        except OSError:
            pass


@app.route("/api/generate", methods=["POST"])
def start_generation():
    data = request.get_json(silent=True) or {}
    upload_id = data.get("upload_id")
    qr_column = data.get("qr_column")
    id_column = data.get("id_column") or None
    qr_size = int(data.get("size", 6))

    if not upload_id or upload_id not in uploaded_files:
        return jsonify({"error": "Invalid or expired upload. Please upload again."}), 400

    if not qr_column:
        return jsonify({"error": "QR column not selected"}), 400

    try:
        file_info = uploaded_files[upload_id]
        upload_path = file_info["path"]
        original_name = file_info["original_name"]

        if not os.path.exists(upload_path):
            return jsonify({"error": "File not found. Please upload again."}), 400

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        original_stem = os.path.splitext(original_name)[0][:30]
        folder_name = f"{timestamp}_{original_stem}"
        session_dir = os.path.join(Config.QR_OUTPUT_FOLDER, folder_name)
        os.makedirs(session_dir, exist_ok=True)

        job_id = f"job_{int(time.time() * 1000)}"
        job_manager.create_job(job_id)

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


@app.route("/api/job/<job_id>", methods=["GET"])
def get_job_status(job_id):
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job), 200


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
    return jsonify({"message": "Cancelled"}), 200


@app.route("/api/qr/<session_id>/<filename>", methods=["GET"])
def serve_qr_image(session_id, filename):
    directory = os.path.join(Config.QR_OUTPUT_FOLDER, session_id)
    safe_name = os.path.basename(filename)
    full = os.path.join(directory, safe_name)
    if os.path.exists(full) and os.path.isfile(full):
        return send_from_directory(directory, safe_name)
    return jsonify({"error": "Not found"}), 404


@app.route("/api/download-zip/<session_id>", methods=["GET"])
def download_zip(session_id):
    directory = os.path.join(Config.QR_OUTPUT_FOLDER, session_id)
    zip_path = os.path.join(directory, "qr_codes_bundle.zip")
    if os.path.exists(zip_path):
        return send_file(zip_path, as_attachment=True, download_name=f"{session_id}_qr_codes.zip")
    return jsonify({"error": "ZIP not found."}), 404


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
            return jsonify({"message": "Opened", "path": directory}), 200
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"error": "File exceeds 500MB limit"}), 413


def open_browser(port):
    time.sleep(2)
    webbrowser.open(f"http://127.0.0.1:{port}")


def cleanup_old_uploads():
    while True:
        time.sleep(600)
        try:
            now = time.time()
            to_remove = []
            for uid, info in list(uploaded_files.items()):
                if now - info["uploaded_at"] > 3600:
                    if os.path.exists(info["path"]):
                        try:
                            os.remove(info["path"])
                        except OSError:
                            pass
                    to_remove.append(uid)
            for uid in to_remove:
                uploaded_files.pop(uid, None)
        except Exception:
            pass


if __name__ == "__main__":
    PORT = find_free_port(5000)
    engine = "Segno (Ultra Fast)" if USE_SEGNO else "QRCode (Standard)"

    print("")
    print("=" * 70)
    print("   QR CODE GENERATOR - HIGH PERFORMANCE EDITION")
    print("=" * 70)
    print(f"   URL           : http://127.0.0.1:{PORT}")
    print(f"   Save Location : {Config.QR_OUTPUT_FOLDER}")
    print(f"   QR Engine     : {engine}")
    print(f"   Worker Cores  : {OPTIMAL_WORKERS}")
    print(f"   Capacity      : 650,000+ QR codes supported")
    print("=" * 70)
    print("")

    threading.Thread(target=cleanup_old_uploads, daemon=True).start()
    threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()

    app.run(host="127.0.0.1", port=PORT, debug=False, threaded=True, use_reloader=False)
