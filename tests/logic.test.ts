import assert from "node:assert/strict";
import { test } from "node:test";
import { selectableLogTypes, suggestedLogTypes } from "../lib/allowed.ts";
import { formatMinutes, secondsToMinutes } from "../lib/minutes.ts";
import { buildTree } from "../lib/tree.ts";
import type { LogType, WorkItem } from "../lib/types.ts";

const types = ["Code", "Code Review", "Meeting", "Environment", "Study", "Test", "Design", "Analysis", "build", "Other"].map(
  (type, i): LogType => ({ id: String(i), type, sortOrder: i }),
);

const item = (over: Partial<WorkItem>): WorkItem => ({
  id: 1,
  title: "t",
  type: "Task",
  state: "Proposed",
  project: "P",
  iteration: "P\\Q\\SP1",
  ...over,
});

test("secondsToMinutes rounds to the nearest minute with a floor of 1", () => {
  assert.equal(secondsToMinutes(10), 1);
  assert.equal(secondsToMinutes(22 * 60 + 29), 22);
  assert.equal(secondsToMinutes(22 * 60 + 31), 23);
  assert.equal(secondsToMinutes(2 * 3600), 120);
});

test("formatMinutes", () => {
  assert.equal(formatMinutes(5), "5m");
  assert.equal(formatMinutes(65), "1h 05m");
});

test("every usable log type is selectable, Code first then Meeting, hiding unused server types", () => {
  assert.deepEqual(selectableLogTypes(types), ["Code", "Meeting", "Test", "Code Review", "Analysis", "Design", "Environment", "Study"]);
});

test("suggestedLogTypes comes from the mapping and ignores unused types", () => {
  const mapping = { Development: ["Code", "Code Review", "build"], "Scrum Event": ["Meeting"] };
  assert.deepEqual(suggestedLogTypes("Development", mapping), ["Code", "Code Review"]);
  assert.deepEqual(suggestedLogTypes("Scrum Event", mapping), ["Meeting"]);
  assert.deepEqual(suggestedLogTypes("Unmapped", mapping), []);
  assert.deepEqual(suggestedLogTypes(null, mapping), []);
});

test("buildTree groups tasks under their parent and sprint, newest sprint first", () => {
  const cr = item({ id: 10, type: "Change Request", iteration: "P\\Q\\SP1" });
  const assigned = [
    item({ id: 1, parentId: 10 }),
    item({ id: 2, parentId: 10 }),
    item({ id: 3, parentId: 99, iteration: "P\\Q\\SP2" }),
  ];
  const tree = buildTree(assigned, [cr, item({ id: 99, type: "Change Request", title: "other parent" })]);

  assert.deepEqual(tree.map((s) => s.sprint), ["SP2", "SP1"]);
  const sp1 = tree[1];
  assert.equal(sp1.parents.length, 1);
  assert.equal(sp1.parents[0].parent?.id, 10);
  assert.deepEqual(sp1.parents[0].tasks.map((t) => t.id), [1, 2]);
  assert.equal(tree[0].parents[0].parent?.title, "other parent");
});

test("buildTree keeps a directly assigned parent that has no assigned tasks", () => {
  const tree = buildTree([item({ id: 5, type: "Change Request" })], []);
  assert.equal(tree[0].parents[0].parent?.id, 5);
  assert.equal(tree[0].parents[0].tasks.length, 0);
});
