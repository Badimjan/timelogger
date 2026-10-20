import { authed, fail, json } from "@/lib/http";
import { getTimer, setTimerStart } from "@/lib/timer";

const DAY_MS = 24 * 3600_000;

// Lets the user correct when the running timer really started (e.g. the meeting began at 09:00, not 09:10).
export const POST = authed(async (req, { user }) => {
  const { startedAt } = (await req.json().catch(() => ({}))) as { startedAt?: string };
  const at = Date.parse(startedAt ?? "");
  if (Number.isNaN(at)) return fail("startedAt must be a date-time");

  const now = Date.now();
  if (at > now + 60_000) return fail("The start time can't be in the future");
  if (at < now - DAY_MS) return fail("The start time can't be more than 24 hours ago");
  if (!getTimer(user.id)) return fail("No running timer", 404);

  setTimerStart(user.id, new Date(Math.min(at, now)).toISOString());
  return json({ timer: getTimer(user.id) });
});
