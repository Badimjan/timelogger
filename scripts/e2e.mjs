// End-to-end check against a running app (default http://localhost:3000).
//   ADO_USER=omidne ADO_PW=... node scripts/e2e.mjs                 read-only: login, tasks, log types
//   ADO_USER=omidne ADO_PW=... E2E_WRITE=1 TASK_ID=55325 node scripts/e2e.mjs
//        also runs the local-tracking flow: start, stop (saved locally), push as one 1-minute log, delete it.
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const { ADO_USER, ADO_PW, TASK_ID } = process.env;
if (!ADO_USER || !ADO_PW) throw new Error("Set ADO_USER and ADO_PW");

let cookie = "";
async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.()[0];
  if (set) cookie = set.split(";")[0];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.error ?? ""}`);
  return data;
}
const ok = (msg) => console.log("  ok  ", msg);

const login = await call("/api/auth/login", { method: "POST", body: { method: "password", username: ADO_USER, password: ADO_PW } });
ok(`login as ${login.user.displayName}`);

const { sprints } = await call("/api/tasks");
const tasks = sprints.flatMap((s) => s.parents.flatMap((g) => g.tasks));
ok(`${sprints.length} sprint group(s), ${tasks.length} task(s); current sprint(s): ${sprints.filter((s) => s.current).map((s) => s.sprint).join(", ") || "none detected"}`);

const { logTypes, mapping } = await call("/api/log-types");
ok(`${logTypes.length} log types, mapping for ${Object.keys(mapping).length} task types`);

const today = new Date().toLocaleDateString("sv-SE"); // local YYYY-MM-DD
const before = await call(`/api/logs?from=${today}&to=${today}`);
ok(`${before.logs.length} log(s) today before test`);

if (process.env.E2E_WRITE === "1") {
  if (!TASK_ID) throw new Error("Set TASK_ID for the write test");
  if ((await call("/api/timer")).timer) throw new Error("A timer is already running; stop it first");

  await call("/api/timer/start", { method: "POST", body: { workItemId: Number(TASK_ID) } });
  ok("timer started");
  const t = await call("/api/timer");
  if (t.timer?.workItemId !== Number(TASK_ID)) throw new Error("timer not persisted");
  ok("timer persisted in SQLite");

  const stopped = await call("/api/timer/stop", { method: "POST" });
  ok(`timer stopped, saved locally for ${stopped.entry.day} (${stopped.entry.seconds}s), nothing sent yet`);
  const noneYet = (await call(`/api/logs?from=${today}&to=${today}`)).logs.length;
  if (noneYet !== before.logs.length) throw new Error("stop must not send anything to the log server");
  ok("log server unchanged after stop");

  const { days } = await call("/api/entries");
  const pending = days.find((d) => d.day === stopped.entry.day)?.tasks.find((t) => t.workItemId === Number(TASK_ID));
  if (!pending) throw new Error("tracked time missing from /api/entries");
  ok(`pending: ${pending.seconds}s on task ${TASK_ID}`);

  const logType = Object.values(mapping)[0]?.[0] ?? "Code";
  const push = await call("/api/entries/push", { method: "POST", body: { day: stopped.entry.day, rows: [{ workItemId: Number(TASK_ID), minutes: 1, logType, comment: "e2e test - deleted right after", from: { workItemId: Number(TASK_ID), logType: pending.logType } }] } });
  if (!push.results[0].ok) throw new Error("push failed: " + push.results[0].error);
  ok("pushed as a 1-minute log");

  const mid = await call(`/api/logs?from=${today}&to=${today}`);
  const log = mid.logs.find((l) => l.comment === "e2e test - deleted right after");
  if (!log) throw new Error("new log missing from day list");
  ok("log appears in today's list");

  const again = (await call("/api/entries")).days.find((d) => d.day === stopped.entry.day)?.tasks.some((t) => t.workItemId === Number(TASK_ID));
  if (again) throw new Error("entries still pending after push");
  ok("entries no longer pending");

  await call(`/api/logs?id=${encodeURIComponent(log.id)}&workItemId=${TASK_ID}`, { method: "DELETE" });
  const after = await call(`/api/logs?from=${today}&to=${today}`);
  if (after.logs.some((l) => l.id === log.id)) throw new Error("log still present after delete");
  ok("log deleted");
}

await call("/api/auth/logout", { method: "POST" });
ok("logout");
console.log("E2E PASSED");
