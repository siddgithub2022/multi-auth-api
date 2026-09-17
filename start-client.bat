@echo off
title Multi-Auth API - Client (Port 8080)
color 0B
echo ==========================================
echo  Starting STANDALONE CLIENT
echo  Client: http://localhost:8080
echo  Server API still: http://localhost:3000
echo  (Client auto-fallback to 3000 if needed)
echo ==========================================
cd /d "%~dp0client"
if not exist node_modules (
  echo Installing client dependencies (http-server)...
  call npm install
)
echo.
echo Starting client on http://localhost:8080 ...
echo Opening browser...
start http://localhost:8080
npx http-server . -p 8080 --cors -c-1
pause
