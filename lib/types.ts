export interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  project: string;
  iteration: string;
  parentId?: number;
  taskType?: string;
  remaining?: number;
  completed?: number;
}

export interface ParentGroup {
  parent: WorkItem | null;
  tasks: WorkItem[];
}

export interface SprintGroup {
  project: string;
  sprint: string;
  iteration: string;
  parents: ParentGroup[];
  startDate?: string;
  finishDate?: string;
  current?: boolean;
}

// Tracked time for one task on one day that has not been pushed to the log server yet.
export interface PendingTask {
  workItemId: number;
  title: string;
  project: string;
  taskType: string | null;
  parentTitle: string | null;
  logType: string | null;
  seconds: number;
}

export interface PendingDay {
  day: string;
  tasks: PendingTask[];
}

export interface LogType {
  id: string;
  type: string;
  sortOrder: number;
}

export interface TimeLog {
  id: string;
  minutes: number;
  type: string;
  comment: string;
  date: string;
  workItemId: string;
  workItem: string;
  teamProject?: string;
}

export interface RunningTimer {
  workItemId: number;
  title: string;
  project: string;
  taskType: string | null;
  parentTitle: string | null;
  logType: string | null;
  startedAt: string;
}

export type Mapping = Record<string, string[]>;
