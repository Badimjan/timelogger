# Installing Timelogger on a Windows VPS from this bundle

This folder is a finished build: no `npm install`, no build, no GitHub.

## Node.js 22.13 or newer is required

The app uses Node's built-in SQLite, which **does not exist in Node 20** (the app crashes as soon as a page loads).
You do not need to replace the Node 20 you already have:

1. Download the Windows 64-bit **.zip** from https://nodejs.org/dist/latest-v22.x/ (`node-v22.x.x-win-x64.zip`).
2. Unzip it, rename the folder to `node`, and put it inside this app folder, so `node\node.exe` sits next to `server.js`.

The scripts below use that `node` folder automatically, and say clearly if no suitable Node is found.

The VPS must also reach `https://damavandscm` and `https://damavandscm:8081` (VPN or a site-to-site link) and resolve
that name (hosts file or VPN DNS). Without that the app starts but cannot load tasks or push logs.

## Quickest: run it yourself in a window (no service, no admin)

Double-click `deploy\run-here.cmd`, or from PowerShell in the app folder:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\run-here.ps1
```

Open http://localhost:3000. Ctrl+C (or closing the window) stops it. Options: `-Port 8080`, `-LocalOnly` (only this
machine can open it), `-NodePath C:\node22\node.exe`, `-DataDir D:\timelogger-data`. The database is kept in `data\`
next to the app by default. If damavandscm uses a company CA certificate, save it (PEM) as `company-ca.pem` in the app folder.

**To open it from another computer:** it listens on every address by default, but Windows Firewall (and your VPS
provider's firewall) must allow the port:

```powershell
New-NetFirewallRule -DisplayName "Timelogger" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

Plain `http://` sends passwords unencrypted. Over the internet use HTTPS (below) or connect through your VPN, and
restrict the firewall rule to your own addresses.

## Install as a startup service (optional)

Use this when it should survive reboots and sign-outs.

1. Copy `timelogger-bundle.zip` to the VPS and unzip it somewhere permanent, e.g. `C:\Apps\`
   (you get `C:\Apps\timelogger\server.js`, ...). Put the portable `node` folder inside it, as above.
2. Create the settings file: copy `deploy\timelogger.env.example` to `C:\ProgramData\Timelogger\timelogger.env`
   (create the folder) and edit it. If damavandscm's certificate comes from your company CA, copy that CA certificate
   (PEM) to the VPS and set `NODE_EXTRA_CA_CERTS` to its path.
3. In an **elevated** PowerShell:
   ```powershell
   cd C:\Apps\timelogger
   powershell -ExecutionPolicy Bypass -File deploy\install-service.ps1
   ```
   This registers a task that starts at every boot as SYSTEM, with no window and no login needed, restarts on crash,
   and starts it now. Check `C:\ProgramData\Timelogger\logs\server.log` if it does not come up.
4. By default the service listens on `127.0.0.1` only (meant for a reverse proxy). To reach it directly set
   `HOSTNAME=0.0.0.0` in the settings file and restart it.
5. **HTTPS** (users type AD passwords into this site, so do not skip it): install [Caddy](https://caddyserver.com),
   put your domain in `deploy\Caddyfile`, and run `caddy run --config deploy\Caddyfile` (or register that as a second
   startup task). Allow inbound 80/443 in Windows Firewall, ideally only from your office/VPN addresses. IIS with
   URL Rewrite + ARR works as the proxy too. Keep `HOSTNAME=127.0.0.1` so only the proxy can reach the app.

## Moving your existing data from your PC

On your PC, stop the app (`scripts\stop-server.ps1`), then copy the **three** files in the project's `data` folder
(`timelogger.db`, `timelogger.db-wal`, `timelogger.db-shm`) into the VPS data folder **before** the first start:
`data\` next to the app for `run-here`, or `C:\ProgramData\Timelogger\data\` for the service. Your tracked time and
timers move with them. Everyone signs in again, because the address changes.

## Updating

Stop the app (Ctrl+C, or `deploy\stop.ps1` for the service), unzip the new bundle over the old folder (keep your `node`
folder and `data` folder), and start it again. Service settings, data and logs are in `C:\ProgramData\Timelogger`,
outside the bundle, so they are untouched. Back up by stopping the app and copying the data folder.

## Service commands

| | |
|---|---|
| Status | `schtasks /query /tn Timelogger /fo list` |
| Start / stop | `schtasks /run /tn Timelogger` / `powershell -File deploy\stop.ps1` |
| Log | `Get-Content C:\ProgramData\Timelogger\logs\server.log -Tail 50 -Wait` |
| Uninstall | `powershell -ExecutionPolicy Bypass -File deploy\install-service.ps1 -Remove` |

The log file grows without limit; delete or archive it now and then.
