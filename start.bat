@echo off
echo ========================================
echo   Payment App - Quick Start
echo ========================================
echo.
echo [1/3] Stopping any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Stopped existing processes
) else (
    echo [INFO] No processes to stop
)

echo.
echo [2/3] Waiting for ports to be released...
timeout /t 3 /nobreak >nul
echo [OK] Ports released

echo.
echo [3/3] Starting servers...
echo.

REM Start backend in new window
start "Backend Server (Port 3000)" cmd /k "cd backend && echo Starting backend... && node server.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Frontend Server (Port 5174)" cmd /k "cd frontend && echo Starting frontend... && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5174
echo.
echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
echo.
echo Press any key to exit this window...
pause >nul
