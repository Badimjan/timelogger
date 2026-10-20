import { selectableLogTypes } from "@/lib/allowed";
import { authed, fail, json } from "@/lib/http";
import { logTypes } from "@/lib/logapi";
import { getTimer, setTimerLogType } from "@/lib/timer";

// Changes the log type of the running timer. A run is not split when you switch: the whole run is
// saved under whichever type is selected when you press Stop.
export const POST = authed(async (req, { user }) => {
  const { logType } = (await req.json().catch(() => ({}))) as { logType?: string };
  const timer = getTimer(user.id);
  if (!timer) return fail("No running timer", 404);
  const allowed = selectableLogTypes(await logTypes());
  if (!logType || !allowed.includes(logType)) return fail(`Log type must be one of: ${allowed.join(", ")}`);
  setTimerLogType(user.id, logType);
  return json({ timer: getTimer(user.id) });
});
