import os
import zipfile
import multiprocessing
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

try:
    import segno
    USE_SEGNO = True
except ImportError:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M
    USE_SEGNO = False


progress_lock = Lock()
CPU_COUNT = multiprocessing.cpu_count()
OPTIMAL_WORKERS = min(CPU_COUNT * 2, 16)


def generate_qr_segno(data, filepath, scale=4):
    try:
        qr = segno.make(data, error='m', micro=False)
        qr.save(filepath, scale=scale, border=2, dark='black', light='white')
        return True
    except Exception:
        return False


def generate_qr_pillow(data, filepath, box_size=8):
    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_M,
            box_size=box_size,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(filepath, "PNG", optimize=False)
        return True
    except Exception:
        return False


def _process_single_item(args):
    idx, item, output_dir, scale = args
    
    content = item["content"]
    unique_id = item["unique_id"]
    filename = f"QR{idx + 1}_{unique_id}.png"
    filepath = os.path.join(output_dir, filename)
    
    if USE_SEGNO:
        success = generate_qr_segno(content, filepath, scale)
    else:
        success = generate_qr_pillow(content, filepath, scale)
    
    return {
        "index": idx + 1,
        "content": content,
        "unique_id": unique_id,
        "filename": filename if success else None,
        "row_number": item.get("row_number", idx + 1),
        "status": "success" if success else "error",
    }


def generate_batch_parallel(data_list, output_dir, box_size=4, progress_callback=None, max_workers=None):
    if max_workers is None:
        max_workers = OPTIMAL_WORKERS
    
    total = len(data_list)
    results = [None] * total
    completed = [0]
    
    args_list = [
        (idx, item, output_dir, box_size)
        for idx, item in enumerate(data_list)
    ]
    
    update_interval = max(50, total // 200)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(_process_single_item, args): args[0]
            for args in args_list
        }
        
        for future in as_completed(future_to_index):
            idx = future_to_index[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = {
                    "index": idx + 1,
                    "status": "error",
                    "error": str(e),
                }
            
            with progress_lock:
                completed[0] += 1
                if progress_callback and completed[0] % update_interval == 0:
                    progress_callback(completed[0], total)
        
        if progress_callback:
            progress_callback(completed[0], total)
    
    return results


def create_zip_streaming(results, output_dir, progress_callback=None):
    zip_name = "qr_codes_bundle.zip"
    zip_path = os.path.join(output_dir, zip_name)
    
    successful = [r for r in results if r and r.get("status") == "success" and r.get("filename")]
    total = len(successful)
    
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
        for idx, r in enumerate(successful):
            fpath = os.path.join(output_dir, r["filename"])
            if os.path.exists(fpath):
                zf.write(fpath, r["filename"])
            
            if progress_callback and idx % 1000 == 0:
                progress_callback(idx + 1, total)
    
    return zip_path, zip_name