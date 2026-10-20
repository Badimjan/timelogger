"use client";

import { useState } from "react";
import { DEFAULT_LOG_TYPE, selectableLogTypes } from "@/lib/allowed";
import { api } from "@/lib/client";
import { formatMinutes, secondsToMinutes } from "@/lib/minutes";
import type { LogType, Mapping, PendingTask } from "@/lib/types";
import { DurationInput } from "./DurationInput";
import { LogTypeOptions } from "./LogTypeOptions";
import { Title } from "./Title";

interface Props {
  day: string;
  tasks: PendingTask[];
  logTypes: LogType[];
  mapping: Mapping;
  onClose: () => void;
  onPushed: () => void;
}

interface Row {
  key: number;
  task: PendingTask;
  minutes: number;
  logType: string;
  comment: string;
  skip: boolean;
  primary: boolean; // false for rows added with "Split"; those have no tracked time of their own
  error?: string;
}

const field = "rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent";

export function PushDialog({ day, tasks, logTypes, mapping, onClose, onPushed }: Props) {
  // One row per task and log type, already summed across every timer run of the day.
  const [rows, setRows] = useState<Row[]>(() =>
    tasks.map((task, i) => {
      const selectable = selectableLogTypes(logTypes);
      return {
        key: i,
        task,
        minutes: secondsToMinutes(task.seconds),
        logType: task.logType && selectable.includes(task.logType) ? task.logType : DEFAULT_LOG_TYPE,
        comment: "",
        skip: false,
        primary: true,
      };
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  // A split lets the same tracked time be logged under one more log type.
  const split = (row: Row) =>
    setRows((rs) => {
      const at = rs.findIndex((r) => r.key === row.key);
      const copy = { ...row, key: Math.max(...rs.map((r) => r.key)) + 1, minutes: 1, comment: "", primary: false, error: undefined };
      return [...rs.slice(0, at + 1), copy, ...rs.slice(at + 1)];
    });
  const removeSplit = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  const active = rows.filter((r) => !r.skip);
  const total = active.reduce((s, r) => s + r.minutes, 0);
  const tracked = tasks.reduce((s, t) => s + t.seconds, 0);
  const invalid = active.some((r) => !Number.isInteger(r.minutes) || r.minutes < 1 || !r.logType);

  async function push() {
    setBusy(true);
    setError("");
    try {
      const { results } = await api<{ results: { ok: boolean; error?: string }[] }>("/api/entries/push", {
        method: "POST",
        body: {
          day,
          rows: active.map((r) => ({
            workItemId: r.task.workItemId,
            minutes: r.minutes,
            logType: r.logType,
            comment: r.comment,
            from: r.primary ? { workItemId: r.task.workItemId, logType: r.task.logType } : undefined,
          })),
          discard: rows.filter((r) => r.skip && r.primary).map((r) => ({ workItemId: r.task.workItemId, logType: r.task.logType })),
        },
      });
      const failed = new Map<number, string>();
      active.forEach((r, i) => !results[i].ok && failed.set(r.key, results[i].error ?? "Failed"));
      if (failed.size === 0) return onPushed();
      // Keep only the rows that failed so they can be fixed and pushed again.
      setRows(active.filter((r) => failed.has(r.key)).map((r) => ({ ...r, error: failed.get(r.key) })));
      setError(`${failed.size} of ${active.length} failed. The rest were pushed.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-xl border border-border bg-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Push {day} to the log server</h2>
          <p className="text-xs text-muted">
            Time on the same task and log type is already added up. Edit minutes, log type or comment before sending. Tracked: {formatMinutes(secondsToMinutes(tracked))}
          </p>
        </div>

        <div className="space-y-3 overflow-auto p-5">
          {rows.map((r) => {
            return (
              <div key={r.key} className={`rounded-lg border border-border p-3 ${r.skip ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Title>{r.task.title}</Title>
                    <div className="text-xs text-muted">#{r.task.workItemId} · {r.task.taskType ?? "no task type"}</div>
                  </div>
                  {r.primary && (
                    <label className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      <input type="checkbox" checked={r.skip} onChange={(e) => patch(r.key, { skip: e.target.checked })} />
                      Don&apos;t log
                    </label>
                  )}
                </div>
                {!r.skip && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DurationInput minutes={r.minutes} onChange={(minutes) => patch(r.key, { minutes })} />
                    <select value={r.logType} onChange={(e) => patch(r.key, { logType: e.target.value })} className={field} aria-label="Log type">
                      <LogTypeOptions logTypes={logTypes} taskType={r.task.taskType} mapping={mapping} />
                    </select>
                    <input value={r.comment} onChange={(e) => patch(r.key, { comment: e.target.value })} dir="auto" placeholder="Comment (optional)" className={`${field} min-w-40 flex-1`} />
                    {r.primary ? (
                      <button onClick={() => split(r)} className="text-xs text-accent">Split</button>
                    ) : (
                      <button onClick={() => removeSplit(r.key)} className="text-xs text-muted hover:text-danger">Remove split</button>
                    )}
                  </div>
                )}
                {r.error && <p className="mt-2 text-xs text-danger">{r.error}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <div className="flex-1">
            <div className="text-sm">Will log <span className="font-semibold">{formatMinutes(total)}</span></div>
            {error && <div className="text-xs text-danger">{error}</div>}
          </div>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Close</button>
          <button onClick={push} disabled={busy || invalid || rows.length === 0} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "Pushing…" : "Push all"}
          </button>
        </div>
      </div>
    </div>
  );
}
