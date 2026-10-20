import { fail, json, sameOrigin } from "@/lib/http";
import { endSession } from "@/lib/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Bad origin", 403);
  await endSession();
  return json({ ok: true });
}
