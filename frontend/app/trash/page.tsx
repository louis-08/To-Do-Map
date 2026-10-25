"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { currentYearMonth } from "@/lib/dates";
import { PRIORITY_STYLE, normalizePriority } from "@/lib/priority";

export default function TrashPage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const a = api(getToken as () => Promise<string | null>);

  const { data, isLoading } = useQuery({
    queryKey: ["trash"],
    queryFn: () => a.trash.list(),
  });

  const restore = useMutation({
    mutationFn: (id: string) => a.trash.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => a.trash.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trash"] }),
  });

  const deleted = data?.data ?? [];

  return (
    <>
      <NavBar current={currentYearMonth()} />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-4">Trash</h1>
        {isLoading && <p className="text-[var(--text-muted)]">Loading...</p>}
        {!isLoading && deleted.length === 0 && (
          <p className="text-[var(--text-muted)]">No deleted tasks.</p>
        )}
        <ul className="flex flex-col gap-2">
          {deleted.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 p-3 rounded border border-[var(--border)] bg-[var(--bg-subtle)]"
            >
              {PRIORITY_STYLE[normalizePriority(task.priority)] && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_STYLE[normalizePriority(task.priority)]!.dot }}
                />
              )}
              <span className="flex-1 text-sm">{task.text}</span>
              <span className="text-xs text-[var(--text-muted)]">{task.date}</span>
              <button
                onClick={() => restore.mutate(task.id)}
                className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg)] transition-colors"
              >
                Restore
              </button>
              <button
                onClick={() => remove.mutate(task.id)}
                className="text-xs px-2 py-1 rounded border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
