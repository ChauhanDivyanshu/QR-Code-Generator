import threading
from datetime import datetime


class JobManager:
    def __init__(self):
        self.jobs = {}
        self.lock = threading.Lock()
    
    def create_job(self, job_id):
        with self.lock:
            self.jobs[job_id] = {
                "job_id": job_id,
                "status": "pending",
                "progress": 0,
                "total": 0,
                "current": 0,
                "message": "Job created",
                "started_at": datetime.now().isoformat(),
                "completed_at": None,
                "result": None,
                "error": None,
            }
        return self.jobs[job_id]
    
    def update_progress(self, job_id, current, total, message=None):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["current"] = current
                self.jobs[job_id]["total"] = total
                self.jobs[job_id]["progress"] = round((current / total) * 100, 1) if total > 0 else 0
                self.jobs[job_id]["status"] = "processing"
                if message:
                    self.jobs[job_id]["message"] = message
    
    def complete_job(self, job_id, result):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "completed"
                self.jobs[job_id]["progress"] = 100
                self.jobs[job_id]["completed_at"] = datetime.now().isoformat()
                self.jobs[job_id]["result"] = result
                self.jobs[job_id]["message"] = "Completed successfully"
    
    def fail_job(self, job_id, error):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = "failed"
                self.jobs[job_id]["error"] = str(error)
                self.jobs[job_id]["message"] = f"Failed: {str(error)}"
                self.jobs[job_id]["completed_at"] = datetime.now().isoformat()
    
    def get_job(self, job_id):
        with self.lock:
            return self.jobs.get(job_id)


job_manager = JobManager()