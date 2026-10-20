import { authed, json } from "@/lib/http";
import { getTimer } from "@/lib/timer";

export const GET = authed(async (_req, { user }) => json({ timer: getTimer(user.id) }));
