import axios from "axios";
import { AdoClient, parseUsername, type Credentials } from "@/lib/ado";
import { fail, json, sameOrigin } from "@/lib/http";
import { clearLoginFailures, createSession, loginBlocked, recordLoginFailure } from "@/lib/session";

interface Body {
  method?: "password" | "pat";
  username?: string;
  password?: string;
  pat?: string;
  remember?: boolean;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Bad origin", 403);
  const body = (await req.json().catch(() => ({}))) as Body;

  let creds: Credentials;
  let userName: string;
  if (body.method === "pat" && body.pat) {
    creds = { kind: "pat", pat: body.pat.trim() };
    userName = "pat";
  } else if (body.method === "password" && body.username && body.password) {
    creds = { kind: "password", username: body.username, password: body.password };
    userName = parseUsername(body.username).username.toLowerCase();
  } else {
    return fail("Missing credentials");
  }

  // PAT attempts are throttled together; password attempts per username.
  const throttleKey = creds.kind === "pat" ? "pat" : userName;
  if (loginBlocked(throttleKey)) return fail("Too many failed attempts. Try again in a few minutes.", 429);

  const ado = new AdoClient(creds);
  try {
    const user = await ado.connectionData();
    await ado.mintExtensionToken(); // proves the credentials can also write time logs
    clearLoginFailures(throttleKey);
    if (creds.kind === "pat") userName = user.displayName;
    await createSession(user, userName, creds, Boolean(body.remember));
    return json({ user });
  } catch (e) {
    if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 203)) {
      recordLoginFailure(throttleKey);
      return fail("Wrong username or password.", 401);
    }
    if (axios.isAxiosError(e) && e.response?.status === 500 && creds.kind === "pat") {
      return fail("This PAT cannot request the time-log token. Use password login.", 400);
    }
    console.error(e);
    return fail("Could not reach Azure DevOps.", 502);
  }
}
