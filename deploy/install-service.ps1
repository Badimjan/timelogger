#Requires -RunAsAdministrator
# Installs Timelogger as a startup task: it starts when Windows boots (no one needs to sign in), runs without
# any window, and restarts if it crashes. Run from an elevated PowerShell:
#   powershell -ExecutionPolicy Bypass -File deploy\install-service.ps1            install and start
#   powershell -ExecutionPolicy Bypass -File deploy\install-service.ps1 -Remove    uninstall
param([switch]$Remove)

$name = "Timelogger"

if ($Remove) {
  schtasks /end /tn $name 2>$null | Out-Null
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  Write-Host "Removed the '$name' task."
  return
}

$start = Join-Path $PSScriptRoot "start.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$start`""
$trigger = New-ScheduledTaskTrigger -AtStartup
# SYSTEM runs in the background session, so there is no window to close and no password to store.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
  -Description "Timelogger web app" -Force | Out-Null
schtasks /run /tn $name | Out-Null

$root = if ($env:TIMELOGGER_HOME) { $env:TIMELOGGER_HOME } else { Join-Path $env:ProgramData "Timelogger" }
Write-Host "Installed and started. It will also start at every boot."
Write-Host "Settings: $root\timelogger.env     Log: $root\logs\server.log     Data: $root\data"
