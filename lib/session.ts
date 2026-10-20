import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { AdoClient, type AdoUser, type Credentials } from "./ado";
import { config } from "./config";
import { db } from "./db";
import { decrypt, encrypt, newKey } from "./crypto";

const COOKIE = "tl_session";

export interface Session {
  id: string;
  user: AdoUser & { userName: string };
  authKind: Credentials["kind"];
  ado: AdoClient;
}

interface SessionRow {
  id: string;
  user_id: string;
  user_name: string;
  display_name: string;
  auth_kind: Credentials["kind"];
  secret_enc: string | null;
  expires_at: string;
}

// Live NTLM clients are cached per session; after a restart they are rebuilt from the stored credentials.
const g = globalThis as unknown as { __clients?: Map<string, AdoClient> };
const clients = (g.__clients ??= new Map());

// The cookie is "<session id>.<key>". The database holds the credentials encrypted with <key>, which only the
// browser has, so a restart keeps users signed in but a copy of the database alone reveals no password or PAT.
export async function createSession(
  user: AdoUser,
  userName: string,
  creds: Credentials,
  remember: boolean,
): Promise<void> {
  db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());

  const id = randomBytes(16).toString("base64url");
  const key = newKey();
  const hours = remember ? config.rememberDays * 24 : config.sessionHours;
  const expires = new Date(Date.now() + hours * 3600_000);

  db()
    .prepare(
      "INSERT INTO sessions (id, user_id, user_name, display_name, auth_kind, secret_enc, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, user.id, userName, user.displayName, creds.kind, encrypt(JSON.stringify(creds), key), new Date().toISOString(), expires.toISOString());

  (await cookies()).set(COOKIE, `${id}.${key.toString("base64url")}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    expires,
  });
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const [id, keyPart] = raw?.split(".") ?? [];
  if (!id || !keyPart) return null;

  const row = db().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
  if (!row?.secret_enc) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroy(id);
    return null;
  }

  let creds: Credentials;
  try {
    creds = JSON.parse(decrypt(row.secret_enc, Buffer.from(keyPart, "base64url")));
  } catch {
    return null; // wrong key or a session from an older version
  }

  let ado = clients.get(id);
  if (!ado) {
    ado = new AdoClient(creds);
    clients.set(id, ado);
  }
  return {
    id,
    user: { id: row.user_id, displayName: row.display_name, userName: row.user_name },
    authKind: row.auth_kind,
    ado,
  };
}

function destroy(id: string): void {
  db().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  clients.delete(id);
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value?.split(".")[0];
  if (id) destroy(id);
  store.delete(COOKIE);
}

// Stops brute-forcing through the app, which could lock the AD account.
const attempts: Map<string, number[]> = ((globalThis as unknown as { __attempts?: Map<string, number[]> }).__attempts ??= new Map());
const MAX_FAILURES = 3;
const WINDOW_MS = 10 * 60_000;

export function loginBlocked(key: string): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => Date.now() - t < WINDOW_MS);
  attempts.set(key, recent);
  return recent.length >= MAX_FAILURES;
}

export function recordLoginFailure(key: string): void {
  attempts.set(key, [...(attempts.get(key) ?? []), Date.now()]);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
