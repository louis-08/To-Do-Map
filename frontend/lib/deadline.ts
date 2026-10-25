import { toISO } from "./dates";

// "done" is its own state so a finished task never shows an alarming colour.
export type DeadlineStatus = "done" | "overdue" | "today" | "upcoming";

/** Parse a `YYYY-MM-DD` string as local midnight (not UTC, which would shift the day). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Classify a deadline relative to `today` (both `YYYY-MM-DD`).
 * ISO dates sort lexicographically, so plain string comparison is exact.
 */
export function deadlineStatus(deadline: string, done: boolean, today: string): DeadlineStatus {
  if (done) return "done";
  if (deadline < today) return "overdue";
  if (deadline === today) return "today";
  return "upcoming";
}

/** Short, locale-aware label. The year is only shown when it differs from `now`'s. */
export function formatDeadline(deadline: string, locale: string, now: Date = new Date()): string {
  const d = parseISODate(deadline);
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" as const }),
  });
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}
