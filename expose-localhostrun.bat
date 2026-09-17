@echo off
title Free Public URL - localhost.run (KEEP THIS WINDOW OPEN)
color 0A
echo ========================================================
echo  FREE PUBLIC URL via localhost.run (no install, no token)
echo  Server must be running: http://192.168.0.45:3000
echo  Single BaseUrl for all 7 auth types will be public
echo ========================================================
echo.
echo 1. This window MUST stay open - closing it kills the URL
echo 2. Copy the https://xxxx.lhr.life URL shown below
echo 3. In C2M paste: https://xxxx.lhr.life/api/public/info  (test first)
echo 4. If you see "no tunnel here" - you closed window or used OLD URL
echo    -> Double-click this bat again to get a FRESH URL
echo 5. Free URLs change each run (random). For fixed URL create
echo    free account at https://admin.localhost.run
echo.
echo Ensure OpenSSH Client is enabled (Settings ^> Apps ^> Optional Features)
echo.
echo Starting tunnel to http://localhost:3000 ...
echo Waiting for URL - look for "tunneled with tls, https://..."
echo.
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:3000 nokey@localhost.run
echo.
echo Tunnel closed. If you saw "no tunnel here" in browser, run this bat again
echo for a fresh URL and keep window open while using C2M.
pause
