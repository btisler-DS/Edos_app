@echo off
title EDOS Startup
echo ========================================
echo         EDOS - Starting Up
echo ========================================
echo.

:: Set the project directory
set PROJECT_DIR=D:\Claude_Code\project_2\Edos

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Node.js found:
node --version
echo.

:: Start the server in a new window
echo [2/4] Starting EDOS Server on port 3001...
start "EDOS Server" cmd /k "cd /d %PROJECT_DIR%\server && set PORT=3001 && npm run dev"

:: Wait for server to initialize
echo [3/4] Waiting for server to initialize...
timeout /t 5 /nobreak >nul

:: Start the client in a new window
echo [4/4] Starting EDOS Client on port 3000...
start "EDOS Client" cmd /k "cd /d %PROJECT_DIR%\client && npm run dev"

:: Wait a moment for client to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo         EDOS is starting!
echo ========================================
echo.
echo Server: http://localhost:3001
echo Client: http://localhost:3000
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul

:: Open the browser
start http://localhost:3000

echo.
echo EDOS should now be open in your browser.
echo.
echo To stop EDOS, close the Server and Client terminal windows.
echo.
pause
