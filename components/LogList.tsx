"use client";

import { api } from "@/lib/client";
import { formatMinutes } from "@/lib/minutes";
import { Title } from "./Title";
import type { TimeLog } from "@/lib/types";

interface Props {
  logs: TimeLog[];
  onDeleted: () => void;
  onError: (message: string) => void;
  title?: string;
}

// Logs already on the log server for the selected day.
export function LogList({ logs, onDeleted, onError, title = "Logged on the server" }: Props) {
  const total = logs.reduce((sum, l) => sum + l.minutes, 0);

  async function remove(log: TimeLog) {
    if (!window.confirm(`Delete ${formatMinutes(log.minutes)} logged on "${log.workItem}"?`)) return;
    try {
      await api(`/api/logs?id=${encodeURIComponent(log.id)}&workItemId=${encodeURIComponent(log.workItemId)}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted">{formatMinutes(total)}</span>
      </div>
      {logs.length === 0 && <p className="px-4 py-3 text-sm text-muted">Nothing logged on this day.</p>}
      <ul className="divide-y divide-border">
        {logs.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <Title>{l.workItem}</Title>
              <div className="text-xs text-muted">#{l.workItemId} · {l.type}{l.comment ? ` · ${l.comment}` : ""}</div>
            </div>
            <span className="font-mono text-sm">{formatMinutes(l.minutes)}</span>
            <button onClick={() => remove(l)} title="Delete" className="text-muted hover:text-danger">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
