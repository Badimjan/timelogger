"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOG_TYPE } from "@/lib/allowed";
import { api } from "@/lib/client";
import { clockTime, startFromClock } from "@/lib/day";
import type { LogType, Mapping, RunningTimer } from "@/lib/types";
import { LogTypeOptions } from "./LogTypeOptions";
import { Title } from "./Title";

interface Props {
  timer: RunningTimer;
  logTypes: LogType[];
  mapping: Mapping;
  onStopped: () => void;
  onDiscard: () => void;
  onChanged: (timer: RunningTimer) => void;
  onError: (message: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function clock(startedAt: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function TimerBar({ timer, logTypes, mapping, onStopped, onDiscard, onChanged, onError }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function post(path: "stop" | "discard", done: () => void) {
    setBusy(true);
    try {
      await api(`/api/timer/${path}`, { method: "POST" });
      done();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changeType(logType: string) {
    try {
      onChanged((await api<{ timer: RunningTimer }>("/api/timer/log-type", { method: "POST", body: { logType } })).timer);
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function changeStart(hhmm: string) {
    const start = startFromClock(hhmm);
    if (!start) return onError("Enter the start time as HH:MM");
    try {
      onChanged((await api<{ timer: RunningTimer }>("/api/timer/start-time", { method: "POST", body: { startedAt: start.toISOString() } })).timer);
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-panel px-6 py-3">
      <span className="font-mono text-2xl tabular-nums text-success">{clock(timer.startedAt, now)}</span>
      <div className="min-w-0 flex-1">
        <Title>{timer.title}</Title>
        <div className="text-xs text-muted">#{timer.workItemId} · {timer.taskType ?? "no task type"} · {timer.project}</div>
      </div>
      {/* key remounts the field whenever the saved start changes, so it always shows the real value */}
      <StartTime key={timer.startedAt} startedAt={timer.startedAt} onCommit={changeStart} />
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Log type</span>
        <select
          value={timer.logType ?? DEFAULT_LOG_TYPE}
          onChange={(e) => changeType(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-accent"
        >
          <LogTypeOptions logTypes={logTypes} taskType={timer.taskType} mapping={mapping} />
        </select>
      </label>
      <button disabled={busy} onClick={() => post("discard", onDiscard)} className="text-sm text-muted hover:text-danger">Discard</button>
      <button disabled={busy} onClick={() => post("stop", onStopped)} className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50">■ Stop</button>
    </div>
  );
}

// Editable start time (HH:MM). Saved when the field loses focus or Enter is pressed.
function StartTime({ startedAt, onCommit }: { startedAt: string; onCommit: (hhmm: string) => void }) {
  const saved = clockTime(new Date(startedAt));
  const [value, setValue] = useState(saved);

  const commit = () => {
    if (value && value !== saved) onCommit(value);
    else setValue(saved);
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Started</span>
      <input
        type="time"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="rounded-md border border-border bg-background px-2 py-1.5 font-mono outline-none focus:border-accent"
      />
    </label>
  );
}
