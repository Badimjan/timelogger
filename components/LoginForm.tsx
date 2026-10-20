"use client";

import { useState } from "react";
import { api } from "@/lib/client";

const input = "w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent";

export function LoginForm() {
  const [method, setMethod] = useState<"password" | "pat">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pat, setPat] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: { method, username, password, pat, remember } });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-panel p-6">
      <div>
        <h1 className="text-xl font-semibold">Timelogger</h1>
        <p className="text-sm text-muted">Sign in with your Azure DevOps account</p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-md bg-background p-1 text-sm">
        {(["password", "pat"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded px-3 py-1.5 ${method === m ? "bg-accent text-white" : "text-muted"}`}
          >
            {m === "password" ? "Password" : "Access token (PAT)"}
          </button>
        ))}
      </div>

      {method === "password" ? (
        <>
          <input className={input} placeholder="Username (e.g. omidne)" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className={input} type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      ) : (
        <input className={input} type="password" placeholder="Personal access token" autoComplete="off" value={pat} onChange={(e) => setPat(e.target.value)} />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Stay signed in for 30 days (otherwise 12 hours)
      </label>
      <p className="text-xs text-muted">
        You stay signed in when the server restarts. Your credentials are stored encrypted, and the key lives only in your browser.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button disabled={busy} className="w-full rounded-md bg-accent px-3 py-2 font-medium text-white disabled:opacity-50">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
