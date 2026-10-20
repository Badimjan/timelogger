# Stops the Timelogger server: ends the scheduled task and the Next.js process listening on port 3000.
# Only a process whose command line mentions "next" is killed, never another Node app.
schtasks /end /tn Timelogger 2>$null | Out-Null

$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) { Write-Host "Timelogger is not running."; return }

$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
if ($proc.CommandLine -notmatch "next") {
  Write-Host "Port 3000 is used by something else ($($proc.Name)); leaving it alone."
  return
}
Stop-Process -Id $proc.ProcessId -Force
Write-Host "Stopped Timelogger (PID $($proc.ProcessId))."
