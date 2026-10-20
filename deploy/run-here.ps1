# Runs Timelogger in this window. Ctrl+C stops it. No service and no admin rights needed.
#   .\deploy\run-here.ps1                       listens on every address, port 3000, data in .\data
#   .\deploy\run-here.ps1 -Port 8080
#   .\deploy\run-here.ps1 -LocalOnly            only this machine can open it
#   .\deploy\run-here.ps1 -NodePath C:\node22\node.exe -DataDir D:\timelogger-data
# If damavandscm uses a company CA certificate, save it (PEM) as company-ca.pem in the app folder.
param(
  [int]$Port = 3000,
  [switch]$LocalOnly,
  [string]$NodePath,
  [string]$DataDir
)
$ErrorActionPreference = "Stop"
$app = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot "node-check.ps1")

try { $node = Resolve-Node $app $NodePath } catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
if (-not $DataDir) { $DataDir = Join-Path $app "data" }
New-Item -ItemType Directory -Force $DataDir | Out-Null

$env:PORT = "$Port"
$env:HOSTNAME = if ($LocalOnly) { "127.0.0.1" } else { "0.0.0.0" }
$env:DB_PATH = Join-Path $DataDir "timelogger.db"
$env:NODE_USE_SYSTEM_CA = "1"
$ca = Join-Path $app "company-ca.pem"
if (Test-Path $ca) { $env:NODE_EXTRA_CA_CERTS = $ca }
# A proxy in the environment would not reach internal servers; the app does not use one.
foreach ($name in "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy") { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }

Write-Host "Node $(& $node -p 'process.versions.node')  |  data: $($env:DB_PATH)"
Write-Host "Open http://localhost:$Port  (Ctrl+C to stop)"
if (-not $LocalOnly) { Write-Host "Other machines: http://<this machine's address>:$Port  (allow the port in Windows Firewall)" }
Set-Location $app
& $node server.js
