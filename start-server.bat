@echo off
title Multi-Auth API - Server (Port 3000)
color 0A
echo ==========================================
echo  Starting DEDICATED SERVER
echo  BaseUrl: http://localhost:3000
echo  All 7 auth types + Realtime
echo ==========================================
:: Auto-kill if port 3000 already in use (fixes EADDRINUSE)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Port 3000 already in use by PID %%a - stopping old server...
  taskkill /F /PID %%a >nul 2>&1
  timeout /t 2 >nul
)
cd /d "%~dp0server"
if not exist node_modules (
  echo Installing server dependencies...
  call npm install
)
echo.
echo Starting server on 0.0.0.0:3000 ...
echo (If you see EADDRINUSE again, close other server window or run stop.bat)
node server.js
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Port 3000 still in use. Run stop.bat or close other window.
  echo Or: taskkill /F /IM node.exe
)
pause
