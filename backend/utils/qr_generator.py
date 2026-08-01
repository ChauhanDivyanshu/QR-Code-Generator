import qrcode
from qrcode.constants import ERROR_CORRECT_M
import os
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock


progress_lock = Lock()


def generate_single_qr(data, filename, output_dir, box_size=8, border=2):
    """Optimized QR generation"""
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        path = os.path.join(output_dir, filename)
        img.save(path, "PNG", optimize=True)
        return True
    except Exception:
        return False


def _process_single_item(args):
    """Worker function for thread pool"""
    idx, item, output_dir, box_size = args
    
    content = item["content"]
    unique_id = item["unique_id"]
    
    # Filename format: QR1_UniqueID.png
    filename = f"QR{idx + 1}_{unique_id}.png"
    
    success = generate_single_qr(content, filename, output_dir, box_size)
    
    return {
        "index": idx + 1,
        "content": content,
        "unique_id": unique_id,
        "filename": filename if success else None,
        "row_number": item.get("row_number", idx + 1),
        "status": "success" if success else "error",
    }


def generate_batch_parallel(data_list, output_dir, box_size=8, progress_callback=None, max_workers=8):
    """
    Generate QR codes using multi-threading
    """
    results = [None] * len(data_list)
    completed = [0]
    
    args_list = [
        (idx, item, output_dir, box_size)
        for idx, item in enumerate(data_list)
    ]
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(_process_single_item, args): args[0]
            for args in args_list
        }
        
        for future in as_completed(future_to_index):
            idx = future_to_index[future]
            try:
                result = future.result()
                results[idx] = result
            except Exception as e:
                results[idx] = {
                    "index": idx + 1,
                    "status": "error",
                    "error": str(e),
                }
            
            with progress_lock:
                completed[0] += 1
                if progress_callback and completed[0] % 100 == 0:
                    progress_callback(completed[0], len(data_list))
        
        if progress_callback:
            progress_callback(completed[0], len(data_list))
    
    return results


def create_zip_streaming(results, output_dir):
    """Create ZIP file with all QR codes"""
    zip_name = "qr_codes_bundle.zip"
    zip_path = os.path.join(output_dir, zip_name)
    
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for r in results:
            if r and r.get("status") == "success" and r.get("filename"):
                fpath = os.path.join(output_dir, r["filename"])
                if os.path.exists(fpath):
                    zf.write(fpath, r["filename"])
    
    return zip_path, zip_name