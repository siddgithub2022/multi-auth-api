#Requires -Version 5.1
# Multi-Auth Realtime API - One-Click GUI Launcher
# Run anywhere: Right-click -> Run with PowerShell
# Provides separate Server / Client run buttons

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $root "server"
$clientPath = Join-Path $root "client"

$global:serverProc = $null
$global:clientProc = $null

function Test-Node {
  try { Get-Command node -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}
function Test-Port($port){
  try { $c = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop; return $true } catch { return $false }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Multi-Auth Realtime API - One-Click Launcher (Run Anywhere)"
$form.Size = New-Object System.Drawing.Size(620,460)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::WhiteSmoke

$title = New-Object System.Windows.Forms.Label
$title.Text = "Multi-Auth Realtime API"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(20,15)
$title.Size = New-Object System.Drawing.Size(400,25)
$form.Controls.Add($title)

$sub = New-Object System.Windows.Forms.Label
$sub.Text = "Single BaseUrl for all 7 auth types: http://localhost:3000  •  Client standalone: http://localhost:8080"
$sub.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$sub.ForeColor = [System.Drawing.Color]::DimGray
$sub.Location = New-Object System.Drawing.Point(20,42)
$sub.Size = New-Object System.Drawing.Size(560,15)
$form.Controls.Add($sub)

# Status
$statusBox = New-Object System.Windows.Forms.TextBox
$statusBox.Location = New-Object System.Drawing.Point(20,340)
$statusBox.Size = New-Object System.Drawing.Size(560,70)
$statusBox.Multiline = $true
$statusBox.ScrollBars = "Vertical"
$statusBox.ReadOnly = $true
$statusBox.Font = New-Object System.Drawing.Font("Consolas", 8)
$statusBox.Text = "Ready. Click buttons below.`r`nNode: $(if(Test-Node){'found '+ (node -v)}else{'NOT FOUND - install from nodejs.org'})`r`n"
$form.Controls.Add($statusBox)
function Log($msg){ $statusBox.AppendText("[$([DateTime]::Now.ToString('HH:mm:ss'))] $msg`r`n") }

# Buttons
$btnServer = New-Object System.Windows.Forms.Button
$btnServer.Text = "▶ START SERVER`n(Port 3000 - Dedicated)"
$btnServer.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnServer.BackColor = [System.Drawing.Color]::FromArgb(22,163,74)
$btnServer.ForeColor = [System.Drawing.Color]::White
$btnServer.FlatStyle = "Flat"
$btnServer.Location = New-Object System.Drawing.Point(20,70)
$btnServer.Size = New-Object System.Drawing.Size(180,60)
$form.Controls.Add($btnServer)

$btnClient = New-Object System.Windows.Forms.Button
$btnClient.Text = "▶ START CLIENT`n(Port 8080 - Standalone)"
$btnClient.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnClient.BackColor = [System.Drawing.Color]::FromArgb(37,99,235)
$btnClient.ForeColor = [System.Drawing.Color]::White
$btnClient.FlatStyle = "Flat"
$btnClient.Location = New-Object System.Drawing.Point(220,70)
$btnClient.Size = New-Object System.Drawing.Size(180,60)
$form.Controls.Add($btnClient)

$btnBoth = New-Object System.Windows.Forms.Button
$btnBoth.Text = "⚡ START BOTH`n(One-Click)"
$btnBoth.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnBoth.BackColor = [System.Drawing.Color]::FromArgb(124,58,237)
$btnBoth.ForeColor = [System.Drawing.Color]::White
$btnBoth.FlatStyle = "Flat"
$btnBoth.Location = New-Object System.Drawing.Point(420,70)
$btnBoth.Size = New-Object System.Drawing.Size(160,60)
$form.Controls.Add($btnBoth)

$btnDash = New-Object System.Windows.Forms.Button
$btnDash.Text = "📊 Dashboard"
$btnDash.Location = New-Object System.Drawing.Point(20,150)
$btnDash.Size = New-Object System.Drawing.Size(130,35)
$form.Controls.Add($btnDash)

$btnRunner = New-Object System.Windows.Forms.Button
$btnRunner.Text = "🧪 Runner"
$btnRunner.Location = New-Object System.Drawing.Point(160,150)
$btnRunner.Size = New-Object System.Drawing.Size(130,35)
$form.Controls.Add($btnRunner)

$btnSwagger = New-Object System.Windows.Forms.Button
$btnSwagger.Text = "📄 Swagger"
$btnSwagger.Location = New-Object System.Drawing.Point(300,150)
$btnSwagger.Size = New-Object System.Drawing.Size(130,35)
$form.Controls.Add($btnSwagger)

$btnLayman = New-Object System.Windows.Forms.Button
$btnLayman.Text = "📖 Layman"
$btnLayman.Location = New-Object System.Drawing.Point(440,150)
$btnLayman.Size = New-Object System.Drawing.Size(140,35)
$form.Controls.Add($btnLayman)

$btnOpenServer = New-Object System.Windows.Forms.Button
$btnOpenServer.Text = "Open http://localhost:3000"
$btnOpenServer.Location = New-Object System.Drawing.Point(20,200)
$btnOpenServer.Size = New-Object System.Drawing.Size(180,30)
$form.Controls.Add($btnOpenServer)

$btnOpenClient = New-Object System.Windows.Forms.Button
$btnOpenClient.Text = "Open http://localhost:8080"
$btnOpenClient.Location = New-Object System.Drawing.Point(220,200)
$btnOpenClient.Size = New-Object System.Drawing.Size(180,30)
$form.Controls.Add($btnOpenClient)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "■ STOP ALL"
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(220,38,38)
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.FlatStyle = "Flat"
$btnStop.Location = New-Object System.Drawing.Point(420,200)
$btnStop.Size = New-Object System.Drawing.Size(160,30)
$form.Controls.Add($btnStop)

$info = New-Object System.Windows.Forms.Label
$info.Text = "Server: Node + Express + WS/SSE/Socket.IO  •  Client: http-server (static) — both auto-install deps. Keep launcher open."
$info.Font = New-Object System.Drawing.Font("Segoe UI", 7)
$info.ForeColor = [System.Drawing.Color]::Gray
$info.Location = New-Object System.Drawing.Point(20,240)
$info.Size = New-Object System.Drawing.Size(560,30)
$form.Controls.Add($info)

# Actions
$btnServer.Add_Click({
  if(-not (Test-Node)){ [System.Windows.Forms.MessageBox]::Show("Node.js not found. Install from https://nodejs.org","Error"); return }
  if(Test-Port 3000){ Log "Server already running on 3000"; return }
  Log "Starting SERVER..."
  $global:serverProc = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $serverPath -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 3
  if(Test-Port 3000){ Log "SERVER started PID $($global:serverProc.Id) → http://localhost:3000" } else { Log "SERVER failed to start - check server/server.log" }
})

$btnClient.Add_Click({
  if(-not (Test-Node)){ [System.Windows.Forms.MessageBox]::Show("Node.js not found","Error"); return }
  if(Test-Port 8080){ Log "Client already running on 8080"; Start-Process "http://localhost:8080"; return }
  Log "Starting CLIENT (installing http-server if needed)..."
  # Ensure http-server available via npx
  $global:clientProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx http-server . -p 8080 --cors -c-1" -WorkingDirectory $clientPath -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 3
  if(Test-Port 8080){ Log "CLIENT started → http://localhost:8080"; Start-Process "http://localhost:8080" } else { Log "CLIENT starting... wait 2s and try http://localhost:8080" }
})

$btnBoth.Add_Click({ $btnServer.PerformClick(); Start-Sleep -Seconds 1; $btnClient.PerformClick(); Start-Sleep -Seconds 2; Start-Process "http://localhost:3000/dashboard.html" })

$btnDash.Add_Click({ Start-Process "http://localhost:3000/dashboard.html" })
$btnRunner.Add_Click({ Start-Process "http://localhost:3000/runner.html" })
$btnSwagger.Add_Click({ Start-Process "http://localhost:3000/docs" })
$btnLayman.Add_Click({ Start-Process "http://localhost:3000/layman" })
$btnOpenServer.Add_Click({ Start-Process "http://localhost:3000" })
$btnOpenClient.Add_Click({ Start-Process "http://localhost:8080" })
$btnStop.Add_Click({
  Log "Stopping..."
  Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | ForEach-Object { try{ Stop-Process $_ -Force; Log "Stopped PID $($_.Id)" }catch{} }
  Log "Stopped. Ports 3000/8080 freed."
})

$form.Add_FormClosing({ Log "Launcher closing - servers keep running in background. Use STOP ALL to kill." })

[void]$form.ShowDialog()
