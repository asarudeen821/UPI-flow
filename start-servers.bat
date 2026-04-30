@echo off
echo ========================================
echo   Payment App - Start All Servers
echo ========================================
echo.

REM Check if Node.js processes are already running
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Port 3000 is already in use!
    echo Please run cleanup-servers.bat first
    pause
    exit /b 1
)

netstat -ano | findstr :5174 >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Port 5174 is already in use!
    echo Please run cleanup-servers.bat first
    pause
    exit /b 1
)

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5174
echo.
echo Press any key to exit this window...
pause >nul
