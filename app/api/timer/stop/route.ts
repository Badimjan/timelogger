import { DEFAULT_LOG_TYPE } from "@/lib/allowed";
import { addEntry } from "@/lib/entries";
import { authed, fail, json } from "@/lib/http";
import { clearTimer, getTimer } from "@/lib/timer";

// Stopping only saves the run locally. Nothing is sent to the log server until the day is pushed.
export const POST = authed(async (_req, { user }) => {
  const timer = getTimer(user.id);
  if (!timer) return fail("No running timer", 404);
  const entry = addEntry(user.id, { ...timer, logType: timer.logType ?? DEFAULT_LOG_TYPE }, new Date());
  clearTimer(user.id);
  return json({ entry });
});
