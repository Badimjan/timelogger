import { db } from "./db";
import type { RunningTimer } from "./types";

interface Row {
  work_item_id: number;
  title: string;
  project: string;
  task_type: string | null;
  parent_title: string | null;
  log_type: string | null;
  started_at: string;
}

// user_id is the primary key, so each user can only ever have one running timer.
export function getTimer(userId: string): RunningTimer | null {
  const r = db().prepare("SELECT * FROM timers WHERE user_id = ?").get(userId) as Row | undefined;
  return r
    ? {
        workItemId: r.work_item_id,
        title: r.title,
        project: r.project,
        taskType: r.task_type,
        parentTitle: r.parent_title,
        logType: r.log_type,
        startedAt: r.started_at,
      }
    : null;
}

export function saveTimer(userId: string, t: RunningTimer): void {
  db()
    .prepare(
      "INSERT INTO timers (user_id, work_item_id, title, project, task_type, parent_title, log_type, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(userId, t.workItemId, t.title, t.project, t.taskType, t.parentTitle, t.logType, t.startedAt);
}

export function setTimerLogType(userId: string, logType: string): void {
  db().prepare("UPDATE timers SET log_type = ? WHERE user_id = ?").run(logType, userId);
}

export function setTimerStart(userId: string, startedAt: string): void {
  db().prepare("UPDATE timers SET started_at = ? WHERE user_id = ?").run(startedAt, userId);
}

export function clearTimer(userId: string): void {
  db().prepare("DELETE FROM timers WHERE user_id = ?").run(userId);
}
