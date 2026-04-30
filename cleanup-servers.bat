@echo off
echo ========================================
echo   Payment App - Server Cleanup Script
echo ========================================
echo.
echo Stopping all Node.js processes...
echo.

taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo [OK] All Node.js processes stopped successfully
) else (
    echo [INFO] No Node.js processes were running
)

echo.
echo Waiting for ports to be released...
timeout /t 2 /nobreak >nul

echo.
echo Checking port status...
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 3000 is still in use
) else (
    echo [OK] Port 3000 is now available
)

netstat -ano | findstr :5174 >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 5174 is still in use
) else (
    echo [OK] Port 5174 is now available
)

echo.
echo ========================================
echo   Cleanup Complete!
echo ========================================
echo.
echo You can now start the servers:
echo   Backend:  npm run dev (in backend folder)
echo   Frontend: npm run dev (in frontend folder)
echo.
pause
