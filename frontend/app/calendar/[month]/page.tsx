"use client";

import { use, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Task, type WeeklyObjective } from "@/lib/api";
import MonthView from "@/components/MonthView";

const FETCH_START = "2026-01-01";
const FETCH_END   = "2031-12-31";
const TASKS_KEY   = ["tasks", FETCH_START, FETCH_END];
const OBJ_KEY     = ["objectives", FETCH_START, FETCH_END];

type TaskCache = { data: Task[] } | undefined;
type ObjCache  = { data: WeeklyObjective[] } | undefined;

export default function CalendarPage({ params }: { params: Promise<{ month: string }> }) {
  use(params);
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const a = api(getToken as () => Promise<string | null>);

  const tasksQuery = useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => a.tasks.list(FETCH_START, FETCH_END),
    staleTime: 30_000,
  });

  const objectivesQuery = useQuery({
    queryKey: OBJ_KEY,
    queryFn: () => a.objectives.list(FETCH_START, FETCH_END),
    staleTime: 30_000,
  });

  useEffect(() => {
    a.rollover.run().then(() => qc.invalidateQueries({ queryKey: ["tasks"] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ──────────────────────────────────────────────────────────────
  function snapshotTasks() {
    return qc.getQueryData<TaskCache>(TASKS_KEY);
  }
  function snapshotObjs() {
    return qc.getQueryData<ObjCache>(OBJ_KEY);
  }
  function patchTasks(updater: (prev: Task[]) => Task[]) {
    qc.setQueryData<TaskCache>(TASKS_KEY, (old) => ({ data: updater(old?.data ?? []) }));
  }
  function patchObjs(updater: (prev: WeeklyObjective[]) => WeeklyObjective[]) {
    qc.setQueryData<ObjCache>(OBJ_KEY, (old) => ({ data: updater(old?.data ?? []) }));
  }

  // ── mutations ─────────────────────────────────────────────────────────────
  const addTask = useMutation({
    mutationFn: ({ date, text }: { date: string; text: string }) => {
      const pos = (tasksQuery.data?.data ?? []).filter((t) => t.date === date).length;
      return a.tasks.create({ date, text, color: null, position: pos });
    },
    onMutate: async ({ date, text }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      const optimistic: Task = {
        id: `optimistic-${Date.now()}`,
        user_id: "",
        date,
        text,
        done: false,
        color: null,
        position: (tasksQuery.data?.data ?? []).filter((t) => t.date === date).length,
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
    mutationFn: (updates: { id: string; date: string; position: number }[]) => a.tasks.reorder(updates),
  });

  const saveObjective = useMutation({
    mutationFn: ({ weekStart, text }: { weekStart: string; text: string }) =>
      a.objectives.upsert(weekStart, text),
    onMutate: async ({ weekStart, text }) => {
      await qc.cancelQueries({ queryKey: ["objectives"] });
      const previous = snapshotObjs();
      patchObjs((prev) => {
        const exists = prev.find((o) => o.week_start === weekStart);
        if (exists) return prev.map((o) => o.week_start === weekStart ? { ...o, text } : o);
        return [...prev, { id: `optimistic-${Date.now()}`, user_id: "", week_start: weekStart, text }];
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(OBJ_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["objectives"] }),
  });

  const tasks = tasksQuery.data?.data ?? [];
  const objectives = objectivesQuery.data?.data ?? [];

  // Stable ref so callbacks below don't need tasks as a dependency
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const { mutate: addMutate } = addTask;
  const { mutate: toggleMutate } = toggleTask;
  const { mutate: deleteMutate } = deleteTask;
  const { mutate: colorMutate } = colorTask;
  const { mutate: reorderMutate } = reorderTasks;
  const { mutate: objectiveMutate } = saveObjective;

  const handleAddTask = useCallback((date: string, text: string) => {
    addMutate({ date, text });
  }, [addMutate]);

  const handleToggle = useCallback((id: string) => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (task) toggleMutate({ id, done: !task.done });
  }, [toggleMutate]);

  const handleDelete = useCallback((id: string) => {
    deleteMutate(id);
  }, [deleteMutate]);

  const handleColorChange = useCallback((id: string, color: string | null) => {
    colorMutate({ id, color });
  }, [colorMutate]);

  const handleReorder = useCallback((updates: { id: string; date: string; position: number }[]) => {
    reorderMutate(updates);
  }, [reorderMutate]);

  const handleObjectiveSave = useCallback((weekStart: string, text: string) => {
    objectiveMutate({ weekStart, text });
  }, [objectiveMutate]);

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
        Loading…
      </div>
    );
  }

  return (
    <MonthView
      tasks={tasks}
      objectives={objectives}
      onAddTask={handleAddTask}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onColorChange={handleColorChange}
      onReorder={handleReorder}
      onObjectiveSave={handleObjectiveSave}
      onExport={handleExport}
    />
  );
}
