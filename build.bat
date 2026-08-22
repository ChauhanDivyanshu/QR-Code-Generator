@echo off
color 0A
cls
echo ================================================================
echo    QR CODE GENERATOR - HIGH PERFORMANCE BUILD SCRIPT
echo ================================================================
echo.

REM Automatically stop running EXE if open in background
taskkill /F /IM QR_Code_Generator.exe /T >nul 2>&1

echo [1/5] Building React Frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)
echo Frontend done!
echo.

echo [2/5] Copying files to backend...
cd ..
if exist "backend\static" rmdir /s /q backend\static
mkdir backend\static
xcopy /E /I /Y /Q frontend\build\* backend\static\ >nul
echo Copied!
echo.

echo [3/5] Cleaning old builds...
cd backend
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist
if exist "QR_Code_Generator.spec" del /q QR_Code_Generator.spec
echo Cleaned!
echo.

echo [4/5] Checking Dependencies...
pip install --quiet flask flask-cors openpyxl pandas segno qrcode pillow werkzeug pyinstaller python-calamine
echo Dependencies OK!
echo.

echo [5/5] Building EXE (This takes ~1 minute)...
echo.

pyinstaller --onefile --noconsole ^
  --name "QR_Code_Generator" ^
  --add-data "static;static" ^
  --exclude-module torch ^
  --exclude-module tensorflow ^
  --exclude-module transformers ^
  --exclude-module scipy ^
  --exclude-module sklearn ^
  --exclude-module matplotlib ^
  --exclude-module cv2 ^
  --hidden-import=openpyxl ^
  --hidden-import=openpyxl.cell._writer ^
  --hidden-import=pandas ^
  --hidden-import=python_calamine ^
  --hidden-import=segno ^
  --hidden-import=qrcode ^
  --hidden-import=qrcode.image.pil ^
  --hidden-import=PIL ^
  --hidden-import=PIL._tkinter_finder ^
  --hidden-import=flask_cors ^
  --collect-all=flask ^
  --collect-all=werkzeug ^
  --collect-all=segno ^
  --collect-all=python_calamine ^
  app.py

if errorlevel 1 (
    echo EXE build failed!
    pause
    exit /b 1
)

echo.
echo ================================================================
echo    BUILD SUCCESSFUL!
echo ================================================================
echo    EXE Location: %CD%\dist\QR_Code_Generator.exe
echo ================================================================
start "" "%CD%\dist"
pause
