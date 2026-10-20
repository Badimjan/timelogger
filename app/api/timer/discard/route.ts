import { authed, json } from "@/lib/http";
import { clearTimer } from "@/lib/timer";

export const POST = authed(async (_req, { user }) => {
  clearTimer(user.id);
  return json({ ok: true });
});
