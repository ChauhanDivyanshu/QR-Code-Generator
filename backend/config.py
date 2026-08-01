import os
import sys
from pathlib import Path


def get_app_data_folder():
    """
    User ke Desktop par 'QR_Code_Generator' folder banayega
    Har user ke apne system mein save hoga
    """
    try:
        # User ka Desktop path nikalte hain
        desktop = Path.home() / "Desktop"
        
        # Agar Desktop nahi mila to Documents use karo
        if not desktop.exists():
            desktop = Path.home() / "Documents"
        
        # Agar wo bhi nahi mila to Home directory
        if not desktop.exists():
            desktop = Path.home()
        
        app_folder = desktop / "QR_Code_Generator"
        app_folder.mkdir(exist_ok=True)
        
        return str(app_folder)
    
    except Exception:
        # Fallback: EXE ke saath wala folder
        if getattr(sys, 'frozen', False):
            return os.path.dirname(sys.executable)
        return os.path.abspath(".")


class Config:
    # Main app folder (User ke Desktop par)
    APP_DATA_FOLDER = get_app_data_folder()
    
    # Sub folders
    UPLOAD_FOLDER = os.path.join(APP_DATA_FOLDER, "Temp_Uploads")
    QR_OUTPUT_FOLDER = os.path.join(APP_DATA_FOLDER, "Generated_QR_Codes")
    
    # File settings
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv"}
    SECRET_KEY = "company-qr-dashboard-2024"

    @staticmethod
    def init_folders():
        """Ensure all folders exist"""
        os.makedirs(Config.APP_DATA_FOLDER, exist_ok=True)
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.QR_OUTPUT_FOLDER, exist_ok=True)
    
    @staticmethod
    def get_folder_info():
        """Return folder info for display"""
        return {
            "app_folder": Config.APP_DATA_FOLDER,
            "qr_folder": Config.QR_OUTPUT_FOLDER,
        }