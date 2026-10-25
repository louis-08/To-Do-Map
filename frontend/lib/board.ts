// Pure board logic for the week view: project lanes, droppable ids and
// drag-and-drop reordering. No React, no imports at runtime, so it is unit
// tested directly with `node --test` (see lib/board.test.ts).
import type { Project, ReorderUpdate, Task } from "./api";

/** Lane key of tasks without a project. */
export const NO_PROJECT = "none";

export function laneKeyOf(projectId: string | null): string {
  return projectId ?? NO_PROJECT;
}

export function projectIdOfLane(laneKey: string): string | null {
  return laneKey === NO_PROJECT ? null : laneKey;
}

// ---------------------------------------------------------------- droppables

/**
 * Where a task lands. `projectId === undefined` means "keep the task's
 * project" (normal view); `null` or an id assigns it (project view).
 */
export type DropTarget = { date: string; weekly: boolean; projectId?: string | null };

/** Droppable id of a cell. Format: `d|<date>[|<lane>]` or `w|<monday>[|<lane>]`. */
export function cellId(kind: "day" | "week", date: string, laneKey?: string): string {
  return (kind === "week" ? "w|" : "d|") + date + (laneKey === undefined ? "" : "|" + laneKey);
}

export function parseCellId(id: string): DropTarget | null {
  const parts = id.split("|");
  if ((parts[0] !== "d" && parts[0] !== "w") || parts.length < 2 || parts.length > 3) return null;
  const target: DropTarget = { date: parts[1], weekly: parts[0] === "w" };
  if (parts.length === 3) target.projectId = projectIdOfLane(parts[2]);
  return target;
}

/** Target of a drag, from either the task hovered or the cell hovered. */
export function dropTargetOf(
  overId: string,
  overTask: Task | undefined,
  lanes: boolean,
): DropTarget | null {
  if (overTask) {
    return {
      date: overTask.date,
      weekly: overTask.is_weekly_objective,
      ...(lanes ? { projectId: overTask.project_id } : {}),
    };
  }
  return parseCellId(overId);
}

function isDayScope(t: Task): boolean {
  return (t.scope ?? "day") === "day";
}

/** Move the active task into the target cell (used while dragging). */
export function moveTo(tasks: Task[], activeId: string, target: DropTarget): Task[] {
  const active = tasks.find((t) => t.id === activeId);
  if (!active) return tasks;
  const projectChanges = target.projectId !== undefined && active.project_id !== target.projectId;
  if (active.date === target.date && active.is_weekly_objective === target.weekly && !projectChanges) {
    return tasks;
  }
  return tasks.map((t) =>
    t.id === activeId
      ? {
          ...t,
          date: target.date,
          is_weekly_objective: target.weekly,
          ...(target.projectId !== undefined ? { project_id: target.projectId } : {}),
        }
      : t,
  );
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Finish a drop. Positions are kept per (date, weekly) column across all
 * projects, so the order is consistent in both views: inside a lane the
 * tasks appear in the same relative order as in the normal view.
 */
export function finishDrop(
  tasks: Task[],
  activeId: string,
  overTaskId: string | null,
  target: DropTarget,
): { tasks: Task[]; updates: ReorderUpdate[] } {
  const moved = moveTo(tasks, activeId, target);
  const inColumn = (t: Task) =>
    isDayScope(t) && t.date === target.date && t.is_weekly_objective === target.weekly;
  const col = moved.filter(inColumn).sort((a, b) => a.position - b.position);
  const from = col.findIndex((t) => t.id === activeId);
  if (from === -1) return { tasks, updates: [] };
  const overIdx = overTaskId ? col.findIndex((t) => t.id === overTaskId) : -1;
  const to = overIdx === -1 ? col.length - 1 : overIdx;

  const reordered = arrayMove(col, from, Math.max(0, to)).map((t, i) => ({ ...t, position: i }));
  const updates: ReorderUpdate[] = reordered.map((t) => ({
    id: t.id,
    date: t.date,
    position: t.position,
    is_weekly_objective: t.is_weekly_objective,
    ...(t.id === activeId && target.projectId !== undefined ? { project_id: target.projectId } : {}),
  }));
  return { tasks: moved.filter((t) => !inColumn(t)).concat(reordered), updates };
}

// ---------------------------------------------------------------- lanes

export type Lane = {
  key: string;
  projectId: string | null;
  /** null for the "(kein Projekt)" lane and for ids not (yet) loaded. */
  project: Project | null;
  deleted: boolean;
};

/**
 * Lanes of one week, top to bottom:
 * 1. active projects (always, so every week offers them as drop targets),
 * 2. soft-deleted projects that still have tasks in this week,
 * 3. ids not in the project list (e.g. list still loading) that have tasks,
 * 4. "(kein Projekt)".
 */
export function buildLanes(projects: Project[], weekTasks: Task[]): Lane[] {
  const used = new Set<string>();
  for (const t of weekTasks) if (t.project_id) used.add(t.project_id);

  const byPos = (a: Project, b: Project) =>
    a.position - b.position || a.created_at.localeCompare(b.created_at);
  const known = new Set(projects.map((p) => p.id));

  const active = projects.filter((p) => !p.deleted_at).sort(byPos);
  const deleted = projects.filter((p) => p.deleted_at && used.has(p.id)).sort(byPos);
  const unknown = [...used].filter((id) => !known.has(id)).sort();

  return [
    ...active.map((p) => ({ key: p.id, projectId: p.id, project: p, deleted: false })),
    ...deleted.map((p) => ({ key: p.id, projectId: p.id, project: p, deleted: true })),
    ...unknown.map((id) => ({ key: id, projectId: id, project: null, deleted: false })),
    { key: NO_PROJECT, projectId: null, project: null, deleted: false },
  ];
}

export function inLane(tasks: Task[], laneKey: string): Task[] {
  return tasks.filter((t) => laneKeyOf(t.project_id) === laneKey);
}

/** Projects offered for assignment: active ones, plus the task's current one if deleted. */
export function assignableProjects(projects: Project[], currentId: string | null): Project[] {
  return projects
    .filter((p) => !p.deleted_at || p.id === currentId)
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}
