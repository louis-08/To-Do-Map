"use client";

import { use, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Task, type TaskScope } from "@/lib/api";
import MonthView from "@/components/MonthView";
import { useI18n } from "@/lib/i18n";

const FETCH_START = "2026-01-01";
const FETCH_END   = "2031-12-31";
const TASKS_KEY   = ["tasks", FETCH_START, FETCH_END];

type TaskCache = { data: Task[] } | undefined;

export default function CalendarPage({ params }: { params: Promise<{ month: string }> }) {
  use(params);
  const { getToken } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const a = api(getToken as () => Promise<string | null>);

  const tasksQuery = useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => a.tasks.list(FETCH_START, FETCH_END),
    staleTime: 30_000,
  });

  useEffect(() => {
    a.settings.get().then((s) => {
      if (!s.data.auto_rollover) return;
      a.rollover.run().then(() => qc.invalidateQueries({ queryKey: ["tasks"] }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snapshotTasks() {
    return qc.getQueryData<TaskCache>(TASKS_KEY);
  }
  function patchTasks(updater: (prev: Task[]) => Task[]) {
    qc.setQueryData<TaskCache>(TASKS_KEY, (old) => ({ data: updater(old?.data ?? []) }));
  }

  const addTask = useMutation({
    mutationFn: ({ date, text, isWeekly, scope }: { date: string; text: string; isWeekly: boolean; scope: TaskScope }) => {
      const pos = (tasksQuery.data?.data ?? [])
        .filter((t) => t.date === date && t.scope === scope && t.is_weekly_objective === isWeekly).length;
      return a.tasks.create({ date, text, color: null, position: pos, is_weekly_objective: isWeekly, scope });
    },
    onMutate: async ({ date, text, isWeekly, scope }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      const optimistic: Task = {
        id: `optimistic-${Date.now()}`,
        user_id: "",
        date,
        text,
        done: false,
        color: null,
        position: (tasksQuery.data?.data ?? []).filter((t) => t.date === date && t.scope === scope && t.is_weekly_objective === isWeekly).length,
        is_weekly_objective: isWeekly,
        scope,
        created_at: new Date().toISOString(),
      };
      patchTasks((prev) => [...prev, optimistic]);
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => a.tasks.update(id, { done }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      patchTasks((prev) => prev.map((t) => t.id === id ? { ...t, done } : t));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => a.tasks.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      patchTasks((prev) => prev.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const editTask = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => a.tasks.update(id, { text }),
    onMutate: async ({ id, text }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      patchTasks((prev) => prev.map((t) => t.id === id ? { ...t, text } : t));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const colorTask = useMutation({
    mutationFn: ({ id, color }: { id: string; color: string | null }) => a.tasks.update(id, { color }),
    onMutate: async ({ id, color }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      patchTasks((prev) => prev.map((t) => t.id === id ? { ...t, color } : t));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const reorderTasks = useMutation({
    mutationFn: (updates: { id: string; date: string; position: number; is_weekly_objective?: boolean; scope?: TaskScope }[]) =>
      a.tasks.reorder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      const byId = new Map(updates.map((u) => [u.id, u]));
      patchTasks((prev) => prev.map((t) => {
        const u = byId.get(t.id);
        return u
          ? {
              ...t,
              date: u.date,
              position: u.position,
              is_weekly_objective: u.is_weekly_objective ?? t.is_weekly_objective,
              scope: u.scope ?? t.scope,
            }
          : t;
      }));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = tasksQuery.data?.data ?? [];

  const { mutate: addMutate } = addTask;
  const { mutate: toggleMutate } = toggleTask;
  const { mutate: deleteMutate } = deleteTask;
  const { mutate: editMutate } = editTask;
  const { mutate: colorMutate } = colorTask;
  const { mutate: reorderMutate } = reorderTasks;

  const handleAddTask = useCallback((date: string, text: string) => {
    addMutate({ date, text, isWeekly: false, scope: "day" });
  }, [addMutate]);

  const handleAddWeeklyTask = useCallback((mondayISO: string, text: string) => {
    addMutate({ date: mondayISO, text, isWeekly: true, scope: "day" });
  }, [addMutate]);

  const handleAddMonthTask = useCallback((monthISO: string, text: string) => {
    addMutate({ date: monthISO, text, isWeekly: false, scope: "month" });
  }, [addMutate]);

  const handleAddQuarterTask = useCallback((quarterISO: string, text: string) => {
    addMutate({ date: quarterISO, text, isWeekly: false, scope: "quarter" });
  }, [addMutate]);

  const handleAddYearTask = useCallback((yearISO: string, text: string) => {
    addMutate({ date: yearISO, text, isWeekly: false, scope: "year" });
  }, [addMutate]);

  const handleToggle = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) toggleMutate({ id, done: !task.done });
  }, [toggleMutate, tasks]);

  const handleDelete = useCallback((id: string) => {
    deleteMutate(id);
  }, [deleteMutate]);

  const handleEdit = useCallback((id: string, text: string) => {
    editMutate({ id, text });
  }, [editMutate]);

  const handleColorChange = useCallback((id: string, color: string | null) => {
    colorMutate({ id, color });
  }, [colorMutate]);

  const handleReorder = useCallback((updates: { id: string; date: string; position: number; is_weekly_objective?: boolean; scope?: TaskScope }[]) => {
    reorderMutate(updates);
  }, [reorderMutate]);

  const handleExport = useCallback(async () => {
    const blob = await a.export.markdown();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todomap-backup-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tasksQuery.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
        {t.loading}
      </div>
    );
  }

  return (
    <MonthView
      tasks={tasks}
      onAddTask={handleAddTask}
      onAddWeeklyTask={handleAddWeeklyTask}
      onAddMonthTask={handleAddMonthTask}
      onAddQuarterTask={handleAddQuarterTask}
      onAddYearTask={handleAddYearTask}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      onEdit={handleEdit}
      onReorder={handleReorder}
      onExport={handleExport}
    />
  );
}
