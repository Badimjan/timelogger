import { db } from "./db";
import type { Mapping } from "./types";

// Task Type (Microsoft.VSTS.CMMI.TaskType) -> log types it may be logged as.
// Suggestions only: these log types are starred for the task type, but every log type stays selectable.
export const DEFAULT_MAPPING: Mapping = {
  Development: ["Code", "Code Review", "Design", "Environment"],
  "Code Review": ["Code Review"],
  Test: ["Test", "Environment"],
  Analysis: ["Analysis", "Design", "Study"],
  "Requirement Management": ["Analysis", "Design"],
  "Scrum Event": ["Meeting"],
  "Project Management": ["Meeting"],
  Interview: ["Meeting"],
  Training: ["Study"],
  Mentoring: ["Study"],
};

export function getMapping(): Mapping {
  const row = db().prepare("SELECT value FROM settings WHERE key = 'mapping'").get() as
    | { value: string }
    | undefined;
  return row ? (JSON.parse(row.value) as Mapping) : DEFAULT_MAPPING;
}

export function setMapping(mapping: Mapping): void {
  db()
    .prepare("INSERT INTO settings (key, value) VALUES ('mapping', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(JSON.stringify(mapping));
}
