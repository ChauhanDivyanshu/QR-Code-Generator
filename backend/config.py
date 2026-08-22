import os
import sys
from pathlib import Path


def get_app_data_folder():
    try:
        desktop = Path.home() / "Desktop"
        if not desktop.exists():
            desktop = Path.home() / "Documents"
        if not desktop.exists():
            desktop = Path.home()
        app_folder = desktop / "QR_Code_Generator"
        app_folder.mkdir(exist_ok=True)
        return str(app_folder)
    except Exception:
        if getattr(sys, "frozen", False):
            return os.path.dirname(sys.executable)
        return os.path.abspath(".")


class Config:
    APP_DATA_FOLDER = get_app_data_folder()
    UPLOAD_FOLDER = os.path.join(APP_DATA_FOLDER, "Temp_Uploads")
    QR_OUTPUT_FOLDER = os.path.join(APP_DATA_FOLDER, "Generated_QR_Codes")

    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB
    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv"}
    SECRET_KEY = "company-qr-dashboard-2024"

    @staticmethod
    def init_folders():
        os.makedirs(Config.APP_DATA_FOLDER, exist_ok=True)
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.QR_OUTPUT_FOLDER, exist_ok=True)
