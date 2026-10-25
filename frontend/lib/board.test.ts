// Run: npm test   (vitest)
import { test } from "vitest";
import assert from "node:assert/strict";
import type { Project, Task } from "./api";
import {
  NO_PROJECT,
  assignableProjects,
  buildLanes,
  cellId,
  dropTargetOf,
  finishDrop,
  inLane,
  moveTo,
  parseCellId,
} from "./board";

let seq = 0;
function task(p: Partial<Task>): Task {
  return {
    id: p.id ?? `t${++seq}`,
    user_id: "u",
    date: "2026-10-26",
    text: p.id ?? "t",
    done: false,
    color: null,
    position: 0,
    is_weekly_objective: false,
    scope: "day",
    priority: "none",
    description: "",
    project_id: null,
    deadline: null,
    created_at: "2026-10-01T00:00:00Z",
    ...p,
  };
}
function project(p: Partial<Project>): Project {
  return {
    id: p.id ?? `p${++seq}`,
    user_id: "u",
    name: p.id ?? "P",
    color: null,
    position: 0,
    deleted_at: null,
    created_at: "2026-10-01T00:00:00Z",
    ...p,
  };
}
const order = (tasks: Task[], date: string, weekly = false) =>
  tasks
    .filter((t) => t.date === date && t.is_weekly_objective === weekly && t.scope === "day")
    .sort((a, b) => a.position - b.position)
    .map((t) => t.id);

// ---------------------------------------------------------------- cell ids

test("cell ids round-trip in both views", () => {
  assert.deepEqual(parseCellId(cellId("day", "2026-10-26")), { date: "2026-10-26", weekly: false });
  assert.deepEqual(parseCellId(cellId("week", "2026-10-26")), { date: "2026-10-26", weekly: true });
  assert.deepEqual(parseCellId(cellId("day", "2026-10-26", "abc")), { date: "2026-10-26", weekly: false, projectId: "abc" });
  assert.deepEqual(parseCellId(cellId("week", "2026-10-26", NO_PROJECT)), { date: "2026-10-26", weekly: true, projectId: null });
  assert.equal(parseCellId("some-task-uuid"), null);
  assert.equal(parseCellId("x|2026-10-26"), null);
});

test("dropTargetOf: hovering a task only assigns its project in lane view", () => {
  const over = task({ id: "o", date: "2026-10-27", project_id: "p1" });
  assert.deepEqual(dropTargetOf("o", over, false), { date: "2026-10-27", weekly: false });
  assert.deepEqual(dropTargetOf("o", over, true), { date: "2026-10-27", weekly: false, projectId: "p1" });
  assert.deepEqual(dropTargetOf("d|2026-10-28|none", undefined, true), { date: "2026-10-28", weekly: false, projectId: null });
});

// ---------------------------------------------------------------- moving

test("moveTo keeps the project in normal view and sets it in lane view", () => {
  const tasks = [task({ id: "a", project_id: "p1" })];
  assert.equal(moveTo(tasks, "a", { date: "2026-10-27", weekly: false })[0].project_id, "p1");
  assert.equal(moveTo(tasks, "a", { date: "2026-10-27", weekly: false, projectId: null })[0].project_id, null);
  assert.equal(moveTo(tasks, "a", { date: "2026-10-26", weekly: false, projectId: "p1" }), tasks, "no-op returns same array");
});

test("finishDrop reorders inside a day (move down / move up)", () => {
  const tasks = ["a", "b", "c"].map((id, i) => task({ id, position: i }));
  let r = finishDrop(tasks, "a", "c", { date: "2026-10-26", weekly: false });
  assert.deepEqual(order(r.tasks, "2026-10-26"), ["b", "c", "a"]);
  r = finishDrop(tasks, "c", "a", { date: "2026-10-26", weekly: false });
  assert.deepEqual(order(r.tasks, "2026-10-26"), ["c", "a", "b"]);
  assert.deepEqual(r.updates.map((u) => [u.id, u.position]), [["c", 0], ["a", 1], ["b", 2]]);
  assert.ok(r.updates.every((u) => !("project_id" in u)), "normal view never sends project_id");
});

test("finishDrop across days appends when dropped on an empty cell", () => {
  const tasks = [task({ id: "a" }), task({ id: "x", date: "2026-10-27" })];
  const r = finishDrop(moveTo(tasks, "a", { date: "2026-10-27", weekly: false }), "a", null, { date: "2026-10-27", weekly: false });
  assert.deepEqual(order(r.tasks, "2026-10-27"), ["x", "a"]);
  assert.deepEqual(order(r.tasks, "2026-10-26"), []);
});

test("finishDrop into another lane assigns the project and keeps a global column order", () => {
  const tasks = [
    task({ id: "a", position: 0, project_id: "p1" }),
    task({ id: "b", position: 1, project_id: "p2" }),
    task({ id: "c", position: 2, project_id: "p1" }),
  ];
  // Drag c (lane p1) onto b (lane p2): c joins p2, placed before b.
  const target = { date: "2026-10-26", weekly: false, projectId: "p2" };
  const r = finishDrop(moveTo(tasks, "c", target), "c", "b", target);
  const byId = Object.fromEntries(r.tasks.map((t) => [t.id, t]));
  assert.equal(byId.c.project_id, "p2");
  assert.deepEqual(inLane(r.tasks, "p2").sort((x, y) => x.position - y.position).map((t) => t.id), ["c", "b"]);
  assert.deepEqual(inLane(r.tasks, "p1").map((t) => t.id), ["a"]);
  const cu = r.updates.find((u) => u.id === "c")!;
  assert.equal(cu.project_id, "p2");
  assert.ok(r.updates.filter((u) => u.id !== "c").every((u) => !("project_id" in u)));
});

test("finishDrop into the no-project lane sends project_id null", () => {
  const tasks = [task({ id: "a", project_id: "p1" })];
  const target = { date: "2026-10-28", weekly: false, projectId: null };
  const r = finishDrop(tasks, "a", null, target);
  assert.equal(r.tasks[0].project_id, null);
  assert.deepEqual(r.updates, [{ id: "a", date: "2026-10-28", position: 0, is_weekly_objective: false, project_id: null }]);
});

test("finishDrop to the weekly-objective column", () => {
  const tasks = [task({ id: "a", date: "2026-10-28" })];
  const r = finishDrop(tasks, "a", null, { date: "2026-10-26", weekly: true });
  assert.deepEqual(order(r.tasks, "2026-10-26", true), ["a"]);
});

test("finishDrop never touches month/quarter/year tasks sharing a date", () => {
  const month = task({ id: "m", date: "2026-11-01", scope: "month", position: 7 });
  const tasks = [month, task({ id: "a", date: "2026-11-01", position: 0 }), task({ id: "b", date: "2026-11-01", position: 1 })];
  const r = finishDrop(tasks, "b", "a", { date: "2026-11-01", weekly: false });
  assert.ok(!r.updates.some((u) => u.id === "m"));
  assert.equal(r.tasks.find((t) => t.id === "m")!.position, 7);
});

// ---------------------------------------------------------------- lanes

test("buildLanes: active by position, deleted only when used, then unknown, then none", () => {
  const projects = [
    project({ id: "B", position: 1 }),
    project({ id: "A", position: 0 }),
    project({ id: "D", position: 2, deleted_at: "2026-10-20T00:00:00Z" }),
    project({ id: "E", position: 3, deleted_at: "2026-10-20T00:00:00Z" }),
  ];
  const weekTasks = [task({ project_id: "D" }), task({ project_id: "ZZ" }), task({ project_id: null })];
  const lanes = buildLanes(projects, weekTasks);
  assert.deepEqual(lanes.map((l) => l.key), ["A", "B", "D", "ZZ", NO_PROJECT]);
  assert.deepEqual(lanes.map((l) => l.deleted), [false, false, true, false, false]);
  assert.equal(lanes.at(-1)!.projectId, null);
});

test("buildLanes with no projects is a single no-project lane", () => {
  assert.deepEqual(buildLanes([], [task({})]).map((l) => l.key), [NO_PROJECT]);
});

test("assignableProjects hides deleted projects except the task's own", () => {
  const projects = [project({ id: "A" }), project({ id: "D", deleted_at: "2026-10-20T00:00:00Z" })];
  assert.deepEqual(assignableProjects(projects, null).map((p) => p.id), ["A"]);
  assert.deepEqual(assignableProjects(projects, "D").map((p) => p.id), ["A", "D"]);
});

test("finishDrop onto itself keeps the order", () => {
  const tasks = ["a", "b", "c"].map((id, i) => task({ id, position: i }));
  const r = finishDrop(tasks, "a", "a", { date: "2026-10-26", weekly: false });
  assert.deepEqual(order(r.tasks, "2026-10-26"), ["a", "b", "c"]);
});
