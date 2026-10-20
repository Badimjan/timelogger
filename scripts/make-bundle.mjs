// Builds the app and packs a self-contained bundle for copying to another machine (e.g. a Linux VPS).
//   node scripts/make-bundle.mjs
// Output: dist/timelogger-bundle.zip (unzips to a "timelogger" folder; run with `node server.js`). See deploy/README.md.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dist = join(root, "dist");
const out = join(dist, "timelogger");
const archive = join(dist, "timelogger-bundle.zip");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

run("npm", ["run", "build"]);

const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) throw new Error("Standalone output missing; is output: 'standalone' set?");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(standalone, out, { recursive: true });
// Turbopack loads external packages (axios-ntlm) through hashed aliases in .next/node_modules, which are symlinks.
// A copied or zipped symlink points back at this machine's folders, so replace each with a real copy of the package.
const aliases = join(out, ".next", "node_modules");
if (existsSync(aliases)) {
  for (const alias of readdirSync(aliases)) {
    const pkg = alias.replace(/-[0-9a-f]{16}$/, "");
    const source = join(out, "node_modules", pkg);
    if (!existsSync(source)) throw new Error(`Alias ${alias} points at ${pkg}, which is not in the bundle's node_modules`);
    rmSync(join(aliases, alias), { recursive: true, force: true });
    cpSync(source, join(aliases, alias), { recursive: true, dereference: true });
  }
}
// The standalone folder does not include the static assets or public files; they must be added next to server.js.
cpSync(join(root, ".next", "static"), join(out, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), join(out, "public"), { recursive: true });
cpSync(join(root, "deploy"), join(out, "deploy"), { recursive: true });

// Next traces the image library's binary for the OS it was built on (Windows here). Images are not optimised
// in this app, so it is never loaded; drop it so no foreign binary ends up on the server.
const img = join(out, "node_modules", "@img");
if (existsSync(img)) for (const d of readdirSync(img)) if (d.startsWith("sharp-")) rmSync(join(img, d), { recursive: true, force: true });

// Never ship local data, logs or secrets.
for (const name of ["data", "logs", ".env", ".env.local"]) rmSync(join(out, name), { recursive: true, force: true });

writeFileSync(join(out, "BUILD_INFO.txt"), `Built ${new Date().toISOString()} on ${process.platform}\nRun with: node server.js (Node 22.13+). Windows install steps: deploy/README.md\n`);

// The bundle is for a Windows machine, so a zip made by PowerShell is the most convenient format.
run("powershell", ["-NoProfile", "-Command", "Compress-Archive -Path timelogger -DestinationPath timelogger-bundle.zip -Force"], { cwd: dist, shell: false });

