"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { localDay } from "@/lib/day";
import type { LogType, Mapping, PendingDay, PendingTask, RunningTimer, SprintGroup, TimeLog, WorkItem } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { EntriesPanel } from "./EntriesPanel";
import { LogList } from "./LogList";
import { MappingDialog } from "./MappingDialog";
import { PushDialog } from "./PushDialog";
import { TaskList } from "./TaskList";
import { TimerBar } from "./TimerBar";

export function Dashboard({ userName }: { userName: string }) {
  const today = localDay();
  const [sprints, setSprints] = useState<SprintGroup[] | null>(null);
  const [timer, setTimer] = useState<RunningTimer | null>(null);
  const [days, setDays] = useState<PendingDay[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [logTypes, setLogTypes] = useState<LogType[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [day, setDay] = useState(today);
  const [error, setError] = useState("");
  const [showMapping, setShowMapping] = useState(false);
  const [showPush, setShowPush] = useState(false);

  // Failures show in the banner; it is cleared by the next user action or the dismiss button.
  const run = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadTasks = useCallback(
    () => run(async () => setSprints((await api<{ sprints: SprintGroup[] }>("/api/tasks")).sprints)),
    [run],
  );
  const loadEntries = useCallback(
    () => run(async () => setDays((await api<{ days: PendingDay[] }>("/api/entries")).days)),
    [run],
  );
  const loadLogs = useCallback(
    (d: string) => run(async () => setLogs((await api<{ logs: TimeLog[] }>(`/api/logs?from=${d}&to=${d}`)).logs)),
    [run],
  );

  // Initial load. Each request is independent so one failure doesn't block the others.
  useEffect(() => {
    let live = true;
    const load = <T,>(request: Promise<T>, apply: (value: T) => void) =>
      request
        .then((value) => {
          if (live) apply(value);
        })
        .catch((e: Error) => {
          if (live) setError(e.message);
        });
    load(api<{ timer: RunningTimer | null }>("/api/timer"), (r) => setTimer(r.timer));
    load(api<{ logTypes: LogType[]; mapping: Mapping }>("/api/log-types"), (r) => {
      setLogTypes(r.logTypes);
      setMapping(r.mapping);
    });
    load(api<{ sprints: SprintGroup[] }>("/api/tasks"), (r) => setSprints(r.sprints));
    load(api<{ days: PendingDay[] }>("/api/entries"), (r) => setDays(r.days));
    return () => {
      live = false;
    };
  }, []);

  // Ignores a slow answer for a day that is no longer selected.
  useEffect(() => {
    let live = true;
    api<{ logs: TimeLog[] }>(`/api/logs?from=${day}&to=${day}`)
      .then((r) => {
        if (live) setLogs(r.logs);
      })
      .catch((e: Error) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [day]);

  const start = (task: WorkItem) => {
    setError("");
    return run(async () => {
      const r = await api<{ timer: RunningTimer }>("/api/timer/start", { method: "POST", body: { workItemId: task.id } });
      setTimer(r.timer);
    });
  };

  const afterStop = () => {
    setTimer(null);
    loadEntries();
  };

  const editTracked = (task: PendingTask, minutes: number) => {
    setError("");
    return run(async () => {
      await api("/api/entries", { method: "PATCH", body: { day, workItemId: task.workItemId, logType: task.logType, minutes } });
      await loadEntries();
    });
  };

  const deleteTracked = (task: PendingTask) => {
    if (!window.confirm(`Delete the ${task.logType ?? "untyped"} time tracked on "${task.title}" for ${day}? It will not be sent to the server.`)) return;
    setError("");
    return run(async () => {
      await api(`/api/entries?day=${day}&workItemId=${task.workItemId}&logType=${encodeURIComponent(task.logType ?? "")}`, { method: "DELETE" });
      await loadEntries();
    });
  };

  const afterPush = () => {
    setError("");
    setShowPush(false);
    // The log server updates Completed Work on each task, so refresh all three views.
    loadEntries();
    loadLogs(day);
    loadTasks();
  };

  const pushTasks = days.find((d) => d.day === day)?.tasks ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader userName={userName}>
        <button onClick={() => setShowMapping(true)} className="text-muted hover:text-foreground">Log type mapping</button>
      </AppHeader>

      {timer && <TimerBar timer={timer} logTypes={logTypes} mapping={mapping} onStopped={afterStop} onDiscard={() => setTimer(null)} onChanged={setTimer} onError={setError} />}
      {error && (
        <div className="flex items-center justify-between border-b border-border bg-panel px-6 py-2 text-sm text-danger">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss" className="text-muted hover:text-foreground">✕</button>
        </div>
      )}

      <main className="grid flex-1 gap-6 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TaskList sprints={sprints} runningId={timer?.workItemId} onStart={start} onRefresh={loadTasks} />
        <aside className="space-y-4">
          <EntriesPanel days={days} day={day} today={today} onDay={setDay} onPush={() => setShowPush(true)} onEdit={editTracked} onDelete={deleteTracked} />
          <LogList logs={logs} onDeleted={() => { loadLogs(day); loadTasks(); }} onError={setError} />
        </aside>
      </main>

      {showPush && pushTasks.length > 0 && (
        <PushDialog day={day} tasks={pushTasks} logTypes={logTypes} mapping={mapping} onClose={() => setShowPush(false)} onPushed={afterPush} />
      )}
      {showMapping && (
        <MappingDialog mapping={mapping} logTypes={logTypes} onClose={() => setShowMapping(false)} onSaved={setMapping} />
      )}
    </div>
  );
}
