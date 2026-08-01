@echo off
color 0A
echo.
echo ================================================================
echo    QR CODE GENERATOR - EXE BUILDER
echo ================================================================
echo.

cd backend

echo [1/3] Cleaning old builds...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist
if exist "QR_Code_Generator.spec" del /q QR_Code_Generator.spec
echo Done.
echo.

echo [2/3] Building EXE... (Please wait 2-3 minutes)
echo.

pyinstaller --onefile --noconsole ^
  --name "QR_Code_Generator" ^
  --add-data "static;static" ^
  --hidden-import=openpyxl ^
  --hidden-import=openpyxl.cell._writer ^
  --hidden-import=pandas ^
  --hidden-import=qrcode ^
  --hidden-import=qrcode.image.pil ^
  --hidden-import=PIL ^
  --hidden-import=PIL._tkinter_finder ^
  --hidden-import=flask_cors ^
  --collect-all=flask ^
  --collect-all=werkzeug ^
  app.py

echo.
echo [3/3] Build process complete!
echo.
echo ================================================================
echo    SUCCESS!
echo ================================================================
echo.
echo    Your EXE is ready at:
echo    backend\dist\QR_Code_Generator.exe
echo.
echo ================================================================
echo.
pause