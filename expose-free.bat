@echo off
title Free Public URL - Auto (Cloudflare -> localhost.run -> VS Code)
color 0E
echo ==========================================
echo  FREE PUBLIC URL (no ngrok, no payment)
echo  Single BaseUrl for all 7 auth types
echo ==========================================
echo.
echo  WHY "no tunnel here" ?
echo  - You closed the tunnel window, or
echo  - You used an OLD https://xxxx.lhr.life URL from previous run
echo  - Free URLs are TEMPORARY - new URL each time, keep window OPEN
echo.
where cloudflared >nul 2>&1
if %errorlevel% equ 0 (
  echo Found cloudflared - using trycloudflare.com (best free, more stable)...
  call "%~dp0expose-cloudflare.bat"
  exit /b
)
where ssh >nul 2>&1
if %errorlevel% equ 0 (
  echo cloudflared not found, using localhost.run via SSH (no install)...
  echo (For stable fixed subdomain: https://admin.localhost.run - free account)
  call "%~dp0expose-localhostrun.bat"
  exit /b
)
echo No cloudflared and no ssh found.
echo Install one:
echo  1) Cloudflare: winget install Cloudflare.cloudflared  (then run expose-free.bat again)
echo  2) Enable OpenSSH: Settings ^> Apps ^> Optional Features ^> OpenSSH Client
echo  3) Or VS Code: Ports panel -^> Forward 3000 -^> Public
pause
