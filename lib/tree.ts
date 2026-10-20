import type { ParentGroup, SprintGroup, WorkItem } from "./types";

const lastSegment = (path: string) => path.split("\\").pop() ?? path;

// Groups the user's items as sprint > parent (Change Request / PBI) > tasks.
// `assigned` is everything assigned to the user; `parents` holds the parent items fetched
// separately so a task can show its parent even when the parent isn't assigned to the user.
export function buildTree(assigned: WorkItem[], parents: WorkItem[]): SprintGroup[] {
  const parentById = new Map<number, WorkItem>();
  for (const p of [...assigned, ...parents]) parentById.set(p.id, p);

  const sprints = new Map<string, SprintGroup>();
  const parentGroups = new Map<string, ParentGroup>();

  const group = (item: WorkItem): SprintGroup => {
    const key = `${item.project}|${item.iteration}`;
    let s = sprints.get(key);
    if (!s) {
      s = { project: item.project, sprint: lastSegment(item.iteration), iteration: item.iteration, parents: [] };
      sprints.set(key, s);
    }
    return s;
  };

  const parentGroup = (sprint: SprintGroup, parent: WorkItem | null): ParentGroup => {
    const key = `${sprint.project}|${sprint.iteration}|${parent?.id ?? "none"}`;
    let g = parentGroups.get(key);
    if (!g) {
      g = { parent, tasks: [] };
      parentGroups.set(key, g);
      sprint.parents.push(g);
    }
    return g;
  };

  for (const item of assigned) {
    const isTask = item.type === "Task";
    const sprint = group(item);
    if (isTask) {
      const parent = item.parentId ? (parentById.get(item.parentId) ?? null) : null;
      parentGroup(sprint, parent).tasks.push(item);
    } else {
      // A parent-level item assigned directly to the user still appears, even with no tasks.
      parentGroup(sprint, item);
    }
  }

  // Newest sprint first; within a sprint, groups with tasks come before empty ones.
  const result = [...sprints.values()].sort((a, b) => b.iteration.localeCompare(a.iteration));
  for (const s of result) s.parents.sort((a, b) => b.tasks.length - a.tasks.length);
  return result;
}
