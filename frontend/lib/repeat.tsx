"use client";

import { createContext, useContext, useMemo } from "react";
import type { Task } from "./api";
import { formatDeadline } from "./deadline";
import type { Translations } from "./i18n";

export type RepeatFreq = "day" | "week" | "month" | "year";

export const REPEAT_FREQS: readonly RepeatFreq[] = ["day", "week", "month", "year"];

/** Mirrors the backend limit (recurrence.INTERVAL_MAX). */
export const REPEAT_INTERVAL_MAX = 999;

export type RepeatRule = {
  freq: RepeatFreq;
  /** Repeat every N units, 1..REPEAT_INTERVAL_MAX. */
  interval: number;
  /** `YYYY-MM-DD` of the last allowed occurrence (inclusive), or null = never ends. */
  until: string | null;
};

type RepeatFields = Partial<Pick<Task, "repeat_freq" | "repeat_interval" | "repeat_until">>;

/** Only plain day tasks repeat, like the backend: not month/quarter/year plans or weekly objectives. */
export function canRepeat(task: Pick<Task, "scope" | "is_weekly_objective">): boolean {
  return task.scope === "day" && !task.is_weekly_objective;
}

/** The task's rule, or null when it does not repeat (also for rows from before the migration). */
export function taskRule(task: RepeatFields): RepeatRule | null {
  const freq = task.repeat_freq;
  if (!freq || !REPEAT_FREQS.includes(freq)) return null;
  return { freq, interval: normalizeInterval(task.repeat_interval), until: task.repeat_until ?? null };
}

export function isRepeating(task: RepeatFields & Pick<Task, "scope" | "is_weekly_objective">): boolean {
  return canRepeat(task) && taskRule(task) !== null;
}

export function sameRule(a: RepeatRule | null, b: RepeatRule | null): boolean {
  if (!a || !b) return a === b;
  return a.freq === b.freq && a.interval === b.interval && a.until === b.until;
}

/** Whole number in 1..REPEAT_INTERVAL_MAX; anything else (empty, NaN, 0, 2.7e3) falls back to the nearest valid value. */
export function normalizeInterval(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(REPEAT_INTERVAL_MAX, Math.max(1, Math.trunc(n)));
}

/** "Every week", "Every 2 weeks, until Dec 24" — localised via the dictionary. */
export function describeRepeat(rule: RepeatRule, t: Translations, locale: string, now: Date = new Date()): string {
  const base = rule.interval === 1
    ? t.repeatOne[rule.freq]
    : t.repeatMany[rule.freq].replace("{n}", String(rule.interval));
  return rule.until
    ? `${base}, ${t.repeatUntilShort.replace("{date}", formatDeadline(rule.until, locale, now))}`
    : base;
}

type RepeatActions = {
  /** null switches the repetition off. */
  setRepeat: (taskId: string, rule: RepeatRule | null) => void;
};

const RepeatContext = createContext<RepeatActions | null>(null);

export function RepeatProvider({ setRepeat, children }: RepeatActions & { children: React.ReactNode }) {
  const value = useMemo(() => ({ setRepeat }), [setRepeat]);
  return <RepeatContext.Provider value={value}>{children}</RepeatContext.Provider>;
}

/** Outside a provider (e.g. a standalone page) saving is a no-op. */
export function useRepeatActions(): RepeatActions {
  return useContext(RepeatContext) ?? { setRepeat: () => {} };
}
