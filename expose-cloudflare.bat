@echo off
title Free Public URL - Cloudflare Tunnel (no account)
echo Trying Cloudflare Tunnel (FREE, no token)...
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
  echo cloudflared not found. Downloading...
  echo From https://developers.cloudflare.com/cloudflare-one/connections/connect/networks/downloads/
  echo Or use: winget install Cloudflare.cloudflared
  echo Falling back to localhost.run...
  call "%~dp0expose-localhostrun.bat"
  exit /b
)
echo.
echo Starting tunnel to http://localhost:3000 ...
echo Keep this window open. Copy the https://...trycloudflare.com URL into C2M.
echo.
cloudflared tunnel --url http://localhost:3000
pause
