@echo off
title Stop All - Multi-Auth API
color 0C
echo Stopping all Node servers (3000 + 8080) and tunnels...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ssh.exe >nul 2>&1
echo.
echo Checking ports...
netstat -ano | findstr ":3000 :8080" | findstr LISTENING
if %errorlevel% equ 0 (
  echo Still listening - check Task Manager
) else (
  echo Ports 3000 and 8080 freed.
)
echo Done. You can now double-click start-server.bat or start-all.bat again.
pause
