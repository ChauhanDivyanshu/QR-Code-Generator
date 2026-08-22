import os
import json
import time
from threading import Lock

job_lock = Lock()

def _get_job_file_path(job_id):
    from config import Config
    return os.path.join(Config.UPLOAD_FOLDER, f"{job_id}.json")

class JobManager:
    def create_job(self, job_id):
        job_data = {
            "job_id": job_id,
            "status": "pending",
            "progress": 0.0,
            "total": 0,
            "current": 0,
            "message": "Initializing process...",
            "started_at": time.time(),
            "completed_at": None,
            "result": None,
            "error": None,
        }
        self.save_job(job_id, job_data)
        return job_data

    def save_job(self, job_id, job_data):
        filepath = _get_job_file_path(job_id)
        temp_filepath = f"{filepath}.tmp"
        try:
            with open(temp_filepath, "w", encoding="utf-8") as f:
                json.dump(job_data, f, ensure_ascii=False)
            if os.path.exists(filepath):
                os.remove(filepath)
            os.rename(temp_filepath, filepath)
        except Exception:
            pass

    def update_progress(self, job_id, current, total, message=None):
        job = self.get_job(job_id)
        if not job:
            job = {
                "job_id": job_id,
                "status": "processing",
                "progress": 0.0,
                "total": total,
                "current": current,
                "message": message or "Processing...",
                "started_at": time.time(),
            }

        job["current"] = current
        job["total"] = total
        job["progress"] = round((current / total) * 100, 1) if total > 0 else 0.0
        job["status"] = "processing"
        if message:
            job["message"] = message

        self.save_job(job_id, job)

    def complete_job(self, job_id, result):
        job = self.get_job(job_id) or {}
        job["status"] = "completed"
        job["progress"] = 100.0
        job["completed_at"] = time.time()
        job["result"] = result
        job["message"] = "Completed successfully"
        self.save_job(job_id, job)

    def fail_job(self, job_id, error):
        job = self.get_job(job_id) or {}
        job["status"] = "failed"
        job["error"] = str(error)
        job["message"] = f"Failed: {str(error)}"
        job["completed_at"] = time.time()
        self.save_job(job_id, job)

    def get_job(self, job_id):
        filepath = _get_job_file_path(job_id)
        if not os.path.exists(filepath):
            return None
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

job_manager = JobManager()
