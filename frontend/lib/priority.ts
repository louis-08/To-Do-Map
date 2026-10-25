// Task priority. "none" is the default and looks like a plain task.
export type Priority = "none" | "medium" | "high";

export const PRIORITIES: readonly Priority[] = ["none", "medium", "high"];

type PriorityStyle = { bg: string; dot: string } | null;

/** Card colours per priority: medium = yellow, high = red, none = default card. */
export const PRIORITY_STYLE: Record<Priority, PriorityStyle> = {
  none: null,
  medium: { bg: "#fdefce", dot: "#e0a008" },
  high: { bg: "#fde7e4", dot: "#e5604d" },
};

/** Unknown/missing values (e.g. rows from before the migration) count as "none". */
export function normalizePriority(value: unknown): Priority {
  return value === "medium" || value === "high" ? value : "none";
}

/**
 * Inline style for a task card, or undefined for "none".
 * The solid left stripe keeps the priority visible on yellow "today"/
 * current-week backgrounds, where a yellow card alone would blend in.
 */
export function priorityCardStyle(
  value: unknown,
): { background: string; borderColor: string; boxShadow: string } | undefined {
  const s = PRIORITY_STYLE[normalizePriority(value)];
  return s
    ? { background: s.bg, borderColor: s.dot + "70", boxShadow: `inset 3px 0 0 ${s.dot}` }
    : undefined;
}
