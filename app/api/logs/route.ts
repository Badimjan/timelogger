import { daysBetween } from "@/lib/day";
import { authed, fail, json } from "@/lib/http";
import { deleteTimeLog, listLogs, logsForWorkItem } from "@/lib/logapi";

// from/to are YYYY-MM-DD; both days are included.
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const GET = authed(async (req, { user, ado }) => {
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get("from") ?? today;
  const to = url.searchParams.get("to") ?? from;
  if (!DAY.test(from) || !DAY.test(to)) return fail("from/to must be YYYY-MM-DD");
  if (to < from) return fail("to must not be before from");
  if (daysBetween(from, to) > 93) return fail("Pick a range of at most 93 days");

  const projects = await ado.projects();
  const logs = await listLogs(user.id, ado, projects, `${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`);
  return json({ logs });
});

export const DELETE = authed(async (req, { user, ado }) => {
  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const workItemId = params.get("workItemId");
  if (!id || !workItemId) return fail("id and workItemId are required");

  // The log API doesn't check ownership itself, so confirm the log is the caller's before deleting.
  const mine = (await logsForWorkItem(workItemId)).some((l) => l.id === id && l.userId === user.id);
  if (!mine) return fail("Log not found", 404);
  await deleteTimeLog(user.id, ado, id);
  return json({ ok: true });
});
