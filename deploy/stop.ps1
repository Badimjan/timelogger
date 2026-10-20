# Stops Timelogger: ends the startup task and the node process serving it.
# Only a process whose command line mentions server.js is killed, never another Node app.
schtasks /end /tn Timelogger 2>$null | Out-Null
$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) { Write-Host "Timelogger is not running."; return }

$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
if ($proc.CommandLine -notmatch "server\.js") {
  Write-Host "Port $port is used by something else ($($proc.Name)); leaving it alone."
  return
}
Stop-Process -Id $proc.ProcessId -Force
Write-Host "Stopped Timelogger (PID $($proc.ProcessId))."
