import { db } from "./db";
import { localDay } from "./day";
import type { PendingDay, PendingTask, RunningTimer } from "./types";

type Status = "pending" | "pushed" | "discarded";

// Saves a finished timer run. It belongs to the day it started on, and is merged into any pending
// run of the same task + log type on that day (the earliest keeps its start time and takes the sum).
export function addEntry(userId: string, t: RunningTimer, endedAt: Date): { day: string; seconds: number } {
  const started = new Date(t.startedAt);
  const seconds = Math.max(1, Math.round((endedAt.getTime() - started.getTime()) / 1000));
  const day = localDay(started);
  const d = db();
  d.exec("BEGIN");
  d.prepare(
    `INSERT INTO entries (user_id, work_item_id, title, project, task_type, parent_title, log_type, day, started_at, seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(userId, t.workItemId, t.title, t.project, t.taskType, t.parentTitle, t.logType, day, t.startedAt, seconds, new Date().toISOString());
  const rows = d
    .prepare(
      "SELECT id, seconds FROM entries WHERE user_id = ? AND day = ? AND work_item_id = ? AND COALESCE(log_type, '') = ? AND status = 'pending' ORDER BY started_at, id",
    )
    .all(userId, day, t.workItemId, t.logType ?? "") as { id: number; seconds: number }[];
  if (rows.length > 1) {
    const total = rows.reduce((sum, r) => sum + r.seconds, 0);
    d.prepare("UPDATE entries SET seconds = ?, title = ?, project = ?, task_type = ?, parent_title = ? WHERE id = ?").run(
      total, t.title, t.project, t.taskType, t.parentTitle, rows[0].id,
    );
    for (const { id } of rows.slice(1)) d.prepare("DELETE FROM entries WHERE id = ?").run(id);
  }
  d.exec("COMMIT");
  return { day, seconds };
}

interface Row {
  day: string;
  work_item_id: number;
  title: string;
  project: string;
  task_type: string | null;
  parent_title: string | null;
  log_type: string | null;
  seconds: number;
}

// Unpushed time grouped by day, then summed per task and log type:
// A(Code) 1h + B 2h + A(Code) 1h becomes A(Code) 2h, B 2h.
export function pendingDays(userId: string): PendingDay[] {
  const rows = db()
    .prepare(
      `SELECT day, work_item_id, MAX(title) AS title, MAX(project) AS project, MAX(task_type) AS task_type,
              MAX(parent_title) AS parent_title, log_type, SUM(seconds) AS seconds
       FROM entries WHERE user_id = ? AND status = 'pending'
       GROUP BY day, work_item_id, COALESCE(log_type, '') ORDER BY day DESC, MIN(started_at)`,
    )
    .all(userId) as unknown as Row[];

  const days = new Map<string, PendingTask[]>();
  for (const r of rows) {
    const task: PendingTask = {
      workItemId: r.work_item_id,
      title: r.title,
      project: r.project,
      taskType: r.task_type,
      parentTitle: r.parent_title,
      logType: r.log_type,
      seconds: r.seconds,
    };
    days.set(r.day, [...(days.get(r.day) ?? []), task]);
  }
  return [...days].map(([day, tasks]) => ({ day, tasks }));
}

// Sets the total for one task + log type on one day: the first run keeps its start time and takes the new total, the rest go.
export function setGroupMinutes(userId: string, day: string, workItemId: number, logType: string | null, minutes: number): boolean {
  const d = db();
  const ids = d
    .prepare(
      "SELECT id FROM entries WHERE user_id = ? AND day = ? AND work_item_id = ? AND COALESCE(log_type, '') = ? AND status = 'pending' ORDER BY started_at",
    )
    .all(userId, day, workItemId, logType ?? "") as { id: number }[];
  if (ids.length === 0) return false;
  d.exec("BEGIN");
  d.prepare("UPDATE entries SET seconds = ? WHERE id = ?").run(minutes * 60, ids[0].id);
  for (const { id } of ids.slice(1)) d.prepare("DELETE FROM entries WHERE id = ?").run(id);
  d.exec("COMMIT");
  return true;
}

export function markGroup(userId: string, day: string, workItemId: number, logType: string | null, status: Status): void {
  db()
    .prepare(
      "UPDATE entries SET status = ? WHERE user_id = ? AND day = ? AND work_item_id = ? AND COALESCE(log_type, '') = ? AND status = 'pending'",
    )
    .run(status, userId, day, workItemId, logType ?? "");
}
