# Starts Timelogger (production mode) and appends its output to logs\server.log.
# Run by the scheduled task from install-startup.ps1, or by hand:
#   powershell -ExecutionPolicy Bypass -File scripts\start-server.ps1
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# The shell's HTTP(S)_PROXY would not reach the internal servers; the app does not use a proxy.
foreach ($name in "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy") {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force logs | Out-Null
$log = "logs\server.log"

if (-not (Test-Path ".next\BUILD_ID")) {
  "[$(Get-Date -Format s)] No build found, running npm run build" | Out-File $log -Append -Encoding utf8
  npm run build 2>&1 | Out-File $log -Append -Encoding utf8
}

"[$(Get-Date -Format s)] Starting Timelogger" | Out-File $log -Append -Encoding utf8
npm start 2>&1 | Out-File $log -Append -Encoding utf8
