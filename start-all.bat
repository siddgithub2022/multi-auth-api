@echo off
title Multi-Auth API - One Click (Server + Client)
color 0E
echo ==========================================
echo  ONE-CLICK RUN ANYWHERE
echo  Server: http://localhost:3000
echo  Client: http://localhost:8080 (standalone)
echo  Dashboard: http://localhost:3000/dashboard.html
echo  Runner: http://localhost:3000/runner.html
echo ==========================================
echo.

:: Start Server in new window
start "API Server :3000" cmd /k "%~dp0start-server.bat"
timeout /t 4 >nul
:: Start Client in new window
start "API Client :8080" cmd /k "%~dp0start-client.bat"
timeout /t 3 >nul

echo.
echo Opening Dashboards...
start http://localhost:3000
start http://localhost:3000/dashboard.html
start http://localhost:8080
echo.
echo Both windows opened. Keep them open!
echo Press any key to open Swagger/Postman...
pause >nul
start http://localhost:3000/docs
start http://localhost:3000/swagger.json
pause
