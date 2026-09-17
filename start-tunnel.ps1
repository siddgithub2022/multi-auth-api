param([switch]$stop)
$log = "E:\Basic API Creation\tunnel.log"
$err = "$log.err"
$urlFile = "E:\Basic API Creation\public-url.txt"
$envFile = "E:\Basic API Creation\server\.env"

if($stop){
  Get-Process ssh -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*localhost.run*" } | Stop-Process -Force
  Write-Host "Tunnel stopped"
  exit
}

Write-Host "Starting PERSISTENT free tunnel via localhost.run..."
Remove-Item $log -ErrorAction SilentlyContinue
Remove-Item $err -ErrorAction SilentlyContinue
$proc = Start-Process -FilePath "ssh" -ArgumentList "-o","StrictHostKeyChecking=no","-o","ServerAliveInterval=60","-R","80:localhost:3000","nokey@localhost.run" -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $err
Start-Sleep -Seconds 7
$content = Get-Content $log -Raw -ErrorAction SilentlyContinue
$url = [regex]::Match($content, 'https://[a-z0-9\-]+\.lhr\.life').Value
if($url){
  Write-Host "PUBLIC URL: $url" -ForegroundColor Green
  $url | Set-Content $urlFile
  $envContent = @()
  if(Test-Path $envFile){
    $envContent = Get-Content $envFile | Where-Object { $_ -notmatch "^BASE_URL=" }
  }
  $envContent + "BASE_URL=$url" | Set-Content $envFile
  Write-Host "Updated $envFile BASE_URL=$url"
  Get-Content $envFile | Select-Object -Last 5 | Write-Host
  # Test public URL
  Write-Host "Testing public URL..."
  try{
    $r = Invoke-RestMethod -Uri "$url/api/public/info" -TimeoutSec 8
    Write-Host "PUBLIC TEST OK: $($r.message)" -ForegroundColor Green
  } catch { Write-Host "Public test pending (wait 3s and try curl $url/api/public/info)" -ForegroundColor Yellow }
} else {
  Write-Host "URL not found yet, raw log:"
  Get-Content $log -Raw | Write-Host
}
Get-Process -Id $proc.Id -ErrorAction SilentlyContinue | Select-Object Id,ProcessName | Write-Host
Write-Host "Tunnel PID $($proc.Id) KEEP RUNNING - do not close this window. Use -stop to kill."
