"use client";

import { useState } from "react";
import { formatMinutes, secondsToMinutes } from "@/lib/minutes";
import type { PendingDay, PendingTask } from "@/lib/types";
import { DurationInput } from "./DurationInput";
import { Title } from "./Title";

interface Props {
  days: PendingDay[];
  day: string;
  today: string;
  onDay: (day: string) => void;
  onPush: () => void;
  onEdit: (task: PendingTask, minutes: number) => void;
  onDelete: (task: PendingTask) => void;
}

// Time tracked by the timer that hasn't been sent to the log server yet.
export function EntriesPanel({ days, day, today, onDay, onPush, onEdit, onDelete }: Props) {
  const current = days.find((d) => d.day === day);
  const total = (current?.tasks ?? []).reduce((s, t) => s + t.seconds, 0);
  const others = days.filter((d) => d.day !== day);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input type="date" value={day} max={today} onChange={(e) => e.target.value && onDay(e.target.value)} className="rounded-md border border-border bg-panel px-2 py-1 text-sm" />
        {day !== today && <button onClick={() => onDay(today)} className="text-xs text-accent">Today</button>}
      </div>

      {others.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div className="font-medium text-amber-300">Not pushed yet</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {others.map((d) => (
              <button key={d.day} onClick={() => onDay(d.day)} className="rounded-md border border-border bg-panel px-2 py-0.5 text-xs hover:border-accent">
                {d.day} · {formatMinutes(secondsToMinutes(d.tasks.reduce((s, t) => s + t.seconds, 0)))}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-medium">Tracked, not pushed</span>
          <span className="text-sm text-muted">{formatMinutes(current ? secondsToMinutes(total) : 0)}</span>
        </div>
        {!current && <p className="px-4 py-3 text-sm text-muted">Nothing waiting for this day.</p>}
        <ul className="divide-y divide-border">
          {current?.tasks.map((t) => (
            <TrackedRow key={`${day}|${t.workItemId}|${t.logType ?? ""}|${t.seconds}`} task={t} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
        {current && (
          <div className="border-t border-border p-3">
            <button onClick={onPush} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">Review &amp; push day</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackedRow({ task, onEdit, onDelete }: { task: PendingTask; onEdit: Props["onEdit"]; onDelete: Props["onDelete"] }) {
  const saved = secondsToMinutes(task.seconds);
  const [value, setValue] = useState(saved);

  // Saved when focus leaves the boxes or Enter is pressed; an invalid total snaps back to the saved value.
  function commit(minutes: number) {
    if (minutes < 1 || minutes > 1440) return setValue(saved);
    if (minutes !== saved) onEdit(task, minutes);
  }

  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <Title>{task.title}</Title>
        <div className="text-xs text-muted">#{task.workItemId} · {task.logType ?? "no log type"}{task.parentTitle && ` · ${task.parentTitle}`}</div>
      </div>
      <DurationInput minutes={value} onChange={setValue} onCommit={commit} />
      <button onClick={() => onDelete(task)} title="Delete tracked time" className="text-muted hover:text-danger">✕</button>
    </li>
  );
}
