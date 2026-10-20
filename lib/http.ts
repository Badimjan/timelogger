import axios from "axios";
import { endSession, getSession, type Session } from "./session";

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400) => json({ error: message }, status);

// Cookies are SameSite=Lax; this extra Origin check also blocks cross-site form posts.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  // Behind a proxy or bound to 0.0.0.0, req.url has the bind address, so compare with the Host the browser used.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === (host ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

type Handler = (req: Request, session: Session) => Promise<Response>;

// Wraps a route: requires a session, checks origin on writes, and maps upstream errors to JSON.
export function authed(handler: Handler) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "GET" && !sameOrigin(req)) return fail("Bad origin", 403);
    const session = await getSession();
    if (!session) return fail("Not signed in", 401);
    try {
      return await handler(req, session);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 401) {
          await endSession();
          return fail("Azure DevOps rejected the credentials. Sign in again.", 401);
        }
        const detail = (e.response?.data as { error?: string; message?: string } | undefined);
        return fail(detail?.error ?? detail?.message ?? e.message, status && status < 500 ? status : 502);
      }
      console.error(e);
      return fail("Unexpected server error", 500);
    }
  };
}
