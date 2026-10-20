# Starts Timelogger from this bundle (plain `node server.js`; no npm and no build needed).
# Settings, database and logs live OUTSIDE the bundle folder so an update never touches them:
#   %TIMELOGGER_HOME%  (default C:\ProgramData\Timelogger)
#     timelogger.env   KEY=VALUE settings, see deploy\timelogger.env.example
#     data\            the SQLite database
#     logs\server.log  output
$ErrorActionPreference = "Stop"
$app = Split-Path $PSScriptRoot -Parent
$root = if ($env:TIMELOGGER_HOME) { $env:TIMELOGGER_HOME } else { Join-Path $env:ProgramData "Timelogger" }
New-Item -ItemType Directory -Force (Join-Path $root "data"), (Join-Path $root "logs") | Out-Null
$log = Join-Path $root "logs\server.log"

# Load settings from timelogger.env (blank lines and # comments are ignored).
$envFile = Join-Path $root "timelogger.env"
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    $line = $line.Trim()
    if (-not $line -or $line.StartsWith("#")) { continue }
    $key, $value = $line -split "=", 2
    if ($value -ne $null) { Set-Item "Env:$($key.Trim())" $value.Trim() }
  }
}

# Defaults for anything the file leaves out.
if (-not $env:PORT) { $env:PORT = "3000" }
if (-not $env:HOSTNAME) { $env:HOSTNAME = "127.0.0.1" }   # reverse proxy in front; use 0.0.0.0 to expose directly
if (-not $env:DB_PATH) { $env:DB_PATH = Join-Path $root "data\timelogger.db" }
$env:NODE_USE_SYSTEM_CA = "1"   # also trust certificates installed in Windows (NODE_EXTRA_CA_CERTS adds a PEM file)

# A proxy in the environment would not reach internal servers; the app does not use one.
foreach ($name in "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy") { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }

. (Join-Path $PSScriptRoot "node-check.ps1")
try { $node = Resolve-Node $app $env:NODE_PATH_OVERRIDE } catch {
  "[$(Get-Date -Format s)] $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
  exit 1
}

Set-Location $app
"[$(Get-Date -Format s)] Starting Timelogger on $($env:HOSTNAME):$($env:PORT) (db: $($env:DB_PATH))" | Out-File $log -Append -Encoding utf8
& $node server.js 2>&1 | Out-File $log -Append -Encoding utf8
