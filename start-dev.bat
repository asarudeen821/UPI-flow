@echo off
title SmartPay Dev Servers
color 0A

echo.
echo ========================================
echo   SmartPay - Starting Dev Environment
echo ========================================
echo.

:: Kill any existing processes on ports 3000 and 5174
echo [1/3] Freeing ports 3000 and 5174...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5174 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start backend in a new window
echo [2/3] Starting backend on port 3000...
start "SmartPay Backend :3000" cmd /k "cd /d d:\payment\backend && npm run dev"

:: Wait for backend to be ready (poll port 3000)
echo [3/3] Waiting for backend to be ready...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/api/health >nul 2>&1
if errorlevel 1 (
    echo     Backend not ready yet, waiting...
    goto wait_loop
)
echo     Backend is ready!

:: Start frontend in a new window
echo.
echo Starting frontend on port 5174...
start "SmartPay Frontend :5174" cmd /k "cd /d d:\payment\frontend && npm run dev"

echo.
echo ========================================
echo   Both servers started!
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5174
echo ========================================
echo.
echo Close this window or press Ctrl+C to stop watching.
pause
