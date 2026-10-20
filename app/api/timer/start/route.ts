import { DEFAULT_LOG_TYPE } from "@/lib/allowed";
import { authed, fail, json } from "@/lib/http";
import { getTimer, saveTimer } from "@/lib/timer";

export const POST = authed(async (req, { user, ado }) => {
  const { workItemId } = (await req.json().catch(() => ({}))) as { workItemId?: number };
  if (!Number.isInteger(workItemId)) return fail("workItemId is required");
  if (getTimer(user.id)) return fail("A timer is already running. Stop it first.", 409);

  // Read the item from Azure DevOps so the title and type come from the source, not the browser.
  const item = await ado.workItem(workItemId!);
  if (!item) return fail("Work item not found or not accessible", 404);
  const parent = item.parentId ? await ado.workItem(item.parentId) : undefined;

  const timer = {
    workItemId: item.id,
    title: item.title,
    project: item.project,
    taskType: item.taskType ?? null,
    parentTitle: parent?.title ?? null,
    logType: DEFAULT_LOG_TYPE,
    startedAt: new Date().toISOString(),
  };
  saveTimer(user.id, timer);
  return json({ timer });
});
