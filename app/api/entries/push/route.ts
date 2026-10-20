import axios from "axios";
import { selectableLogTypes } from "@/lib/allowed";
import { markGroup, pendingDays } from "@/lib/entries";
import { authed, fail, json } from "@/lib/http";
import { addTimeLog, logTypes } from "@/lib/logapi";

// A tracked group is identified by task + the log type it was tracked under (null = none).
interface Group {
  workItemId: number;
  logType: string | null;
}

interface Row {
  workItemId: number;
  minutes: number;
  logType: string; // the type to log it as; may differ from the one it was tracked under
  comment?: string;
  // The tracked group this row sends. Absent on extra rows created with "Split".
  from?: Group;
}

interface Body {
  day?: string;
  rows?: Row[];
  discard?: Group[]; // tracked groups to drop instead of logging
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const key = (g: Group) => `${g.workItemId}|${g.logType ?? ""}`;

export interface RowResult {
  ok: boolean;
  error?: string;
}

export const POST = authed(async (req, { user, ado }) => {
  const body = (await req.json().catch(() => ({}))) as Body;
  const { day, rows = [], discard = [] } = body;
  if (!day || !DAY.test(day)) return fail("day must be YYYY-MM-DD");

  const tracked = pendingDays(user.id).find((d) => d.day === day)?.tasks ?? [];
  const groups = new Map(tracked.map((t) => [key(t), t]));
  const taskInfo = new Map(tracked.map((t) => [t.workItemId, t]));
  const types = await logTypes();

  for (const g of discard) if (groups.has(key(g))) markGroup(user.id, day, g.workItemId, g.logType, "discarded");

  const results: RowResult[] = [];
  for (const row of rows) {
    const task = taskInfo.get(row.workItemId);
    if (!task || (row.from && !groups.has(key(row.from)))) {
      results.push({ ok: false, error: "No tracked time for this task on that day" });
      continue;
    }
    if (!selectableLogTypes(types).includes(row.logType)) {
      results.push({ ok: false, error: `Unknown log type "${row.logType}"` });
      continue;
    }
    if (!Number.isInteger(row.minutes) || row.minutes < 1 || row.minutes > 24 * 60) {
      results.push({ ok: false, error: "Minutes must be between 1 and 1440" });
      continue;
    }
    try {
      await addTimeLog(user.id, ado, {
        minutes: row.minutes,
        userFullName: user.displayName,
        userId: user.id,
        // Noon UTC keeps the log on the intended calendar day in any timezone.
        date: `${day}T12:00:00.000Z`,
        type: row.logType,
        comment: row.comment ?? "",
        workItemId: task.workItemId,
        workItem: task.title,
      });
      // Only the group this row stands for is marked, so a failed sibling row can still be retried.
      if (row.from) markGroup(user.id, day, row.from.workItemId, row.from.logType, "pushed");
      results.push({ ok: true });
    } catch (e) {
      const detail = axios.isAxiosError(e) ? ((e.response?.data as { error?: string })?.error ?? e.message) : "Unexpected error";
      results.push({ ok: false, error: detail });
    }
  }
  return json({ results });
});
