@echo off
color 0A
cls
echo ================================================================
echo    QR CODE GENERATOR - BUILDING EXE
echo ================================================================
echo.

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

echo [2/5] Copying files...
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

echo [4/5] Installing dependencies...
pip install --quiet flask flask-cors openpyxl pandas segno qrcode pillow werkzeug pyinstaller
echo Done!
echo.

echo [5/5] Building EXE (3-5 minutes)...
pyinstaller --onefile --noconsole ^
  --name "QR_Code_Generator" ^
  --add-data "static;static" ^
  --hidden-import=openpyxl ^
  --hidden-import=openpyxl.cell._writer ^
  --hidden-import=pandas ^
  --hidden-import=segno ^
  --hidden-import=qrcode ^
  --hidden-import=qrcode.image.pil ^
  --hidden-import=PIL ^
  --hidden-import=PIL._tkinter_finder ^
  --hidden-import=flask_cors ^
  --collect-all=flask ^
  --collect-all=werkzeug ^
  --collect-all=segno ^
  app.py

if errorlevel 1 (
    echo EXE build failed!
    pause
    exit /b 1
)

echo.
echo ================================================================
echo    BUILD COMPLETE!
echo ================================================================
echo    EXE: %CD%\dist\QR_Code_Generator.exe
echo ================================================================
start "" "%CD%\dist"
pause
