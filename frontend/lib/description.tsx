"use client";

import { createContext, useContext, useMemo } from "react";

/** Mirrors the backend limit (models.DESCRIPTION_MAX). */
export const DESCRIPTION_MAX = 10000;

/** A description counts only if it contains more than whitespace. */
export function hasDescription(task: { description?: string | null }): boolean {
  return !!task.description && task.description.trim().length > 0;
}

/** Text for the icon tooltip: trimmed, capped, with an ellipsis when cut. */
export function descriptionPreview(text: string, max = 280): string {
  const t = text.trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

type DescriptionActions = {
  setDescription: (taskId: string, description: string) => void;
};

const DescriptionContext = createContext<DescriptionActions | null>(null);

export function DescriptionProvider({
  setDescription,
  children,
}: DescriptionActions & { children: React.ReactNode }) {
  const value = useMemo(() => ({ setDescription }), [setDescription]);
  return <DescriptionContext.Provider value={value}>{children}</DescriptionContext.Provider>;
}

/** Outside a provider (e.g. a standalone page) saving is a no-op. */
export function useDescriptionActions(): DescriptionActions {
  return useContext(DescriptionContext) ?? { setDescription: () => {} };
}
