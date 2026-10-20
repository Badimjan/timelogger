# Registers a scheduled task that starts Timelogger whenever you sign in to Windows.
# Needs no administrator rights.
#   powershell -ExecutionPolicy Bypass -File scripts\install-startup.ps1            install
#   powershell -ExecutionPolicy Bypass -File scripts\install-startup.ps1 -Remove    uninstall
param([switch]$Remove)

$name = "Timelogger"

if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  Write-Host "Removed the '$name' scheduled task."
  return
}

# wscript runs the .vbs launcher, which starts the server with no console window.
$launcher = Join-Path $PSScriptRoot "start-hidden.vbs"
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "//B //Nologo `"$launcher`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
# Restart if it crashes; no time limit, since the server is meant to run all day.
$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
  -Description "Starts the Timelogger web app at sign-in" -Force | Out-Null

Write-Host "Installed. Timelogger will start the next time you sign in to Windows."
Write-Host "Start it now without restarting:  schtasks /run /tn $name"
Write-Host "Stop it:                          powershell -ExecutionPolicy Bypass -File scripts\stop-server.ps1"
Write-Host "Log file:                         $(Join-Path (Split-Path $PSScriptRoot -Parent) 'logs\server.log')"
