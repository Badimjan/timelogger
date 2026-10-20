import type { LogType, Mapping } from "./types";

// Values of Microsoft.VSTS.CMMI.TaskType on the Task work item.
export const TASK_TYPES = [
  "Analysis",
  "Code Review",
  "Development",
  "Human Resources",
  "Interview",
  "Mentoring",
  "Performance Management",
  "Project Management",
  "Requirement Management",
  "Scrum Event",
  "Test",
  "Training",
];

// The only log types this team uses (the log server has more, which are hidden), in the order they are offered.
export const LOG_TYPES_IN_USE = ["Code", "Meeting", "Test", "Code Review", "Analysis", "Design", "Environment", "Study"];
export const DEFAULT_LOG_TYPE = "Code";

// Pure (no database access) so both the server and the browser can use it.
export function usableLogTypes(all: LogType[]): LogType[] {
  return LOG_TYPES_IN_USE.flatMap((name) => all.filter((t) => t.type === name));
}

// Every usable log type is always selectable, whatever the task type is.
export const selectableLogTypes = (all: LogType[]): string[] => usableLogTypes(all).map((t) => t.type);

// The task type only hints: these are the log types the mapping suggests for it (shown with a star).
export function suggestedLogTypes(taskType: string | null | undefined, mapping: Mapping): string[] {
  return taskType ? (mapping[taskType] ?? []).filter((n) => LOG_TYPES_IN_USE.includes(n)) : [];
}
