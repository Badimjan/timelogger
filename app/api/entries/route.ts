import { authed, fail, json } from "@/lib/http";
import { markGroup, pendingDays, setGroupMinutes } from "@/lib/entries";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Every day that still has tracked time waiting to be pushed, newest first.
export const GET = authed(async (_req, { user }) => json({ days: pendingDays(user.id) }));

// Change the tracked total for a task + log type on a day.
export const PATCH = authed(async (req, { user }) => {
  const { day, workItemId, logType, minutes } = (await req.json().catch(() => ({}))) as {
    day?: string;
    workItemId?: number;
    logType?: string | null;
    minutes?: number;
  };
  if (!day || !DAY.test(day) || !Number.isInteger(workItemId)) return fail("day and workItemId are required");
  if (!Number.isInteger(minutes) || minutes! < 1 || minutes! > 24 * 60) return fail("Minutes must be between 1 and 1440");
  if (!setGroupMinutes(user.id, day, workItemId!, logType ?? null, minutes!)) return fail("No tracked time for that task and day", 404);
  return json({ ok: true });
});

// Throw away the tracked time of a task + log type on a day (it is never sent to the log server).
// logType is empty for time that was tracked without one.
export const DELETE = authed(async (req, { user }) => {
  const params = new URL(req.url).searchParams;
  const day = params.get("day") ?? "";
  const workItemId = Number(params.get("workItemId"));
  if (!DAY.test(day) || !Number.isInteger(workItemId)) return fail("day and workItemId are required");
  markGroup(user.id, day, workItemId, params.get("logType") || null, "discarded");
  return json({ ok: true });
});
