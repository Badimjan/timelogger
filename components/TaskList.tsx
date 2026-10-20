"use client";

import { useMemo, useState } from "react";
import type { SprintGroup, WorkItem } from "@/lib/types";
import { Title } from "./Title";

interface Props {
  sprints: SprintGroup[] | null;
  runningId?: number;
  onStart: (task: WorkItem) => void;
  onRefresh: () => void;
}

export function TaskList({ sprints, runningId, onStart, onRefresh }: Props) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("");

  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const projects = useMemo(() => [...new Set((sprints ?? []).map((s) => s.project))], [sprints]);

  // Only the current sprint starts open; if no sprint has dates, the newest one does.
  const defaultOpen = useMemo(() => {
    const all = sprints ?? [];
    const current = all.filter((s) => s.current);
    return new Set((current.length ? current : all.slice(0, 1)).map(sprintKey));
  }, [sprints]);
  const searching = query.trim() !== "";
  const isOpen = (key: string) => searching || (toggled[key] ?? defaultOpen.has(key));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sprints ?? [])
      .filter((s) => !project || s.project === project)
      .map((s) => ({
        ...s,
        parents: s.parents
          .map((g) => ({
            ...g,
            tasks: g.tasks.filter((t) => !q || `${t.id} ${t.title} ${g.parent?.title ?? ""}`.toLowerCase().includes(q)),
          }))
          .filter((g) => (q ? g.tasks.length > 0 : true)),
      }))
      .filter((s) => s.parents.length > 0);
  }, [sprints, query, project]);

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          dir="auto"
          className="min-w-0 flex-1 rounded-md border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select value={project} onChange={(e) => setProject(e.target.value)} className="rounded-md border border-border bg-panel px-2 text-sm">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button onClick={onRefresh} className="rounded-md border border-border px-3 text-sm hover:bg-panel">Refresh</button>
      </div>

      {sprints === null && <p className="text-sm text-muted">Loading your tasks…</p>}
      {sprints && visible.length === 0 && <p className="text-sm text-muted">No open tasks assigned to you.</p>}

      {visible.map((s) => {
        const key = sprintKey(s);
        const open = isOpen(key);
        const taskCount = s.parents.reduce((n, g) => n + g.tasks.length, 0);
        return (
        <div key={key} className="space-y-2">
          <button
            onClick={() => setToggled((t) => ({ ...t, [key]: !open }))}
            aria-expanded={open}
            className="flex w-full items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
          >
            <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
            <span>{s.project} · {s.sprint}</span>
            {s.current && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">CURRENT</span>}
            {s.startDate && s.finishDate && (
              <span className="font-normal normal-case">{s.startDate.slice(0, 10)} → {s.finishDate.slice(0, 10)}</span>
            )}
            <span className="ml-auto font-normal normal-case">{taskCount} task{taskCount === 1 ? "" : "s"}</span>
          </button>
          {open && s.parents.map((g) => (
            <div key={g.parent?.id ?? "none"} className="rounded-lg border border-border bg-panel">
              <div className="border-b border-border px-4 py-2 text-sm">
                {g.parent ? (
                  <Title>
                    <span className="text-muted">{g.parent.type} #{g.parent.id}</span> {g.parent.title}
                  </Title>
                ) : (
                  <span className="text-muted">No parent item</span>
                )}
              </div>
              {g.tasks.length === 0 && <p className="px-4 py-2 text-xs text-muted">No tasks assigned to you under this item.</p>}
              {g.tasks.map((t) => (
                <TaskRow key={t.id} task={t} running={runningId === t.id} blocked={runningId !== undefined && runningId !== t.id} onStart={onStart} />
              ))}
            </div>
          ))}
        </div>
        );
      })}
    </section>
  );
}

const sprintKey = (s: SprintGroup) => `${s.project}|${s.iteration}`;

function TaskRow({ task, running, blocked, onStart }: { task: WorkItem; running: boolean; blocked: boolean; onStart: (t: WorkItem) => void }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${running ? "bg-accent/10" : ""}`}>
      <button
        onClick={() => onStart(task)}
        disabled={running || blocked}
        title={blocked ? "Stop the running timer first" : running ? "Running" : "Start timer"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:bg-border disabled:text-muted"
      >
        {running ? "●" : "▶"}
      </button>
      <div className="min-w-0 flex-1">
        <Title>{task.title}</Title>
        <div className="text-xs text-muted">
          #{task.id} · {task.taskType ?? "no task type"} · {task.state}
        </div>
      </div>
      <div className="text-right text-xs text-muted">
        <div>done {task.completed ?? 0}h</div>
        <div>left {task.remaining ?? 0}h</div>
      </div>
    </div>
  );
}
