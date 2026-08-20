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

    # Filename = only uniqueID.png
    filename = f"{unique_id}.png"
    filepath = os.path.join(output_dir, filename)

    # Handle duplicate unique IDs
    if os.path.exists(filepath):
        filename = f"{unique_id}_{idx + 1}.png"
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
    """
    Generate QR codes in parallel.
    Optimized for 600,000+ QR codes using chunked processing.
    """
    if max_workers is None:
        max_workers = OPTIMAL_WORKERS

    total = len(data_list)
    results = [None] * total
    completed = [0]

    # Chunk size: process in batches to manage memory
    # For 600K: process 25K at a time
    CHUNK_SIZE = 25000

    update_interval = max(100, total // 500)

    def process_chunk(chunk_args, chunk_start):
        chunk_results = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_idx = {
                executor.submit(_process_single_item, args): args[0]
                for args in chunk_args
            }

            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    chunk_results[idx] = future.result()
                except Exception as e:
                    chunk_results[idx] = {
                        "index": idx + 1,
                        "status": "error",
                        "error": str(e),
                    }

                with progress_lock:
                    completed[0] += 1
                    if progress_callback and completed[0] % update_interval == 0:
                        progress_callback(completed[0], total)

        return chunk_results

    # Process in chunks
    for chunk_start in range(0, total, CHUNK_SIZE):
        chunk_end = min(chunk_start + CHUNK_SIZE, total)
        chunk_data = data_list[chunk_start:chunk_end]

        chunk_args = [
            (chunk_start + i, item, output_dir, box_size)
            for i, item in enumerate(chunk_data)
        ]

        chunk_results = process_chunk(chunk_args, chunk_start)

        for idx, result in chunk_results.items():
            results[idx] = result

    # Final progress update
    if progress_callback:
        progress_callback(completed[0], total)

    return results


def create_zip_streaming(results, output_dir, progress_callback=None):
    """
    Create ZIP. For very large batches (100K+), uses no compression for speed.
    For 600K+, skips ZIP if it would be too large and returns None.
    """
    successful = [r for r in results if r and r.get("status") == "success" and r.get("filename")]
    total = len(successful)

    # For 300K+ files, ZIP becomes impractical (several GB)
    # Skip ZIP creation and let user access folder directly
    if total > 300000:
        if progress_callback:
            progress_callback(total, total)
        return None, None

    zip_name = "qr_codes_bundle.zip"
    zip_path = os.path.join(output_dir, zip_name)

    # No compression = much faster for large batches
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
        for idx, r in enumerate(successful):
            fpath = os.path.join(output_dir, r["filename"])
            if os.path.exists(fpath):
                zf.write(fpath, r["filename"])

            if progress_callback and idx % 2000 == 0:
                progress_callback(idx + 1, total)

    if progress_callback:
        progress_callback(total, total)

    return zip_path, zip_name
