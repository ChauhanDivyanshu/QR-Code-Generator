@echo off
color 0A
cls
echo.
echo ================================================================
echo    QR CODE GENERATOR - ONE-CLICK BUILD SCRIPT
echo ================================================================
echo.
echo    This will create QR_Code_Generator.exe file
echo    Time: 3-5 minutes
echo.
echo ================================================================
echo.
pause

REM Step 1: Frontend Build
echo.
echo [1/5] Building React Frontend...
echo --------------------------------
cd frontend
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
echo Frontend build SUCCESS
echo.

REM Step 2: Copy to backend
echo [2/5] Copying build files to backend...
echo ---------------------------------------
cd ..
if exist "backend\static" rmdir /s /q backend\static
mkdir backend\static
xcopy /E /I /Y /Q frontend\build\* backend\static\ >nul
echo Copy SUCCESS
echo.

REM Step 3: Clean old builds
echo [3/5] Cleaning old builds...
echo ----------------------------
cd backend
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist
if exist "QR_Code_Generator.spec" del /q QR_Code_Generator.spec
echo Cleaned!
echo.

REM Step 4: Install dependencies
echo [4/5] Installing/Checking dependencies...
echo -----------------------------------------
pip install --quiet flask flask-cors openpyxl pandas segno qrcode pillow werkzeug pyinstaller
echo Dependencies OK
echo.

REM Step 5: Build EXE
echo [5/5] Building EXE (this takes 3-5 minutes)...
echo ----------------------------------------------
echo.

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
    echo.
    echo ERROR: EXE build failed!
    pause
    exit /b 1
)

echo.
echo ================================================================
echo    BUILD COMPLETE!
echo ================================================================
echo.
echo    EXE Location:
echo    %CD%\dist\QR_Code_Generator.exe
echo.
echo    Opening dist folder...
echo ================================================================

start "" "%CD%\dist"

echo.
pause