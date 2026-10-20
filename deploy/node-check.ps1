# Shared by start.ps1 and run-here.ps1. Finds a Node.js that has the built-in SQLite (22.13+) or explains how to get one.
function Resolve-Node([string]$App, [string]$Explicit) {
  $candidates = @(
    $Explicit,
    (Join-Path $App "node\node.exe"),                                  # portable Node unzipped into the app folder
    (Get-Command node -ErrorAction SilentlyContinue).Source,
    "C:\Program Files\nodejs\node.exe"
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

  $found = @()
  foreach ($path in $candidates) {
    $version = [version](& $path -p "process.versions.node")
    if ($version -ge [version]"22.13") { return $path }
    $found += "  $path is version $version"
  }

  $message = "This app needs Node.js 22.13 or newer (it uses Node's built-in SQLite)."
  if ($found) { $message += "`nFound only:`n" + ($found -join "`n") } else { $message += "`nNo Node.js was found." }
  $message += "`n`nEasiest fix, without touching the Node you already have:" +
    "`n  1. Download the Windows 64-bit .zip from https://nodejs.org/dist/latest-v22.x/ (node-v22.x.x-win-x64.zip)" +
    "`n  2. Unzip it and rename the folder to 'node', placing it inside the app folder: $App\node" +
    "`n     (or pass its node.exe with -NodePath)"
  throw $message
}
