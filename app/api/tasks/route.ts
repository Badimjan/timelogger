import { localDay } from "@/lib/day";
import { authed, json } from "@/lib/http";
import { buildTree } from "@/lib/tree";

export const GET = authed(async (_req, { ado }) => {
  const { assigned, parents } = await ado.myWork();
  const sprints = buildTree(assigned, parents);

  // Sprint dates mark the current sprint; if they can't be read the UI falls back to the newest one.
  const today = localDay();
  const dates = new Map<string, { start: string; finish: string }>();
  for (const project of new Set(sprints.map((s) => s.project))) {
    try {
      for (const [path, d] of await ado.iterations(project)) dates.set(path, d);
    } catch (e) {
      console.warn(`Could not read sprint dates for ${project}`, e);
    }
  }
  for (const s of sprints) {
    const d = dates.get(s.iteration);
    if (!d) continue;
    s.startDate = d.start;
    s.finishDate = d.finish;
    s.current = d.start.slice(0, 10) <= today && today <= d.finish.slice(0, 10);
  }
  return json({ sprints });
});
