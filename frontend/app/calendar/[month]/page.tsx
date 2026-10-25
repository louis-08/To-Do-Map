"use client";

import { use, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Project, type ReorderUpdate, type Task, type TaskScope } from "@/lib/api";
import MonthView from "@/components/MonthView";
import { useI18n } from "@/lib/i18n";
import { ProjectsProvider } from "@/lib/projects";

const FETCH_START = "2026-01-01";
const FETCH_END   = "2031-12-31";
const TASKS_KEY   = ["tasks", FETCH_START, FETCH_END];
const PROJECTS_KEY = ["projects"];

type TaskCache = { data: Task[] } | undefined;
type ProjectCache = { data: Project[] } | undefined;
const EMPTY_PROJECTS: Project[] = [];

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

  const projectsQuery = useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => a.projects.list(),
    staleTime: 60_000,
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
  function patchProjects(updater: (prev: Project[]) => Project[]) {
    qc.setQueryData<ProjectCache>(PROJECTS_KEY, (old) => ({ data: updater(old?.data ?? []) }));
  }

  const addTask = useMutation({
    mutationFn: ({ date, text, isWeekly, scope, projectId }: { date: string; text: string; isWeekly: boolean; scope: TaskScope; projectId: string | null }) => {
      const pos = (tasksQuery.data?.data ?? [])
        .filter((t) => t.date === date && t.scope === scope && t.is_weekly_objective === isWeekly).length;
      return a.tasks.create({ date, text, color: null, position: pos, is_weekly_objective: isWeekly, scope, project_id: projectId });
    },
    onMutate: async ({ date, text, isWeekly, scope, projectId }) => {
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
        project_id: projectId,
        deadline: null,
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

  const assignTaskProject = useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string | null }) => a.tasks.update(id, { project_id: projectId }),
    onMutate: async ({ id, projectId }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      patchTasks((prev) => prev.map((t) => t.id === id ? { ...t, project_id: projectId } : t));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deadlineTask = useMutation({
    mutationFn: ({ id, deadline }: { id: string; deadline: string | null }) => a.tasks.update(id, { deadline }),
    onMutate: async ({ id, deadline }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const previous = snapshotTasks();
      patchTasks((prev) => prev.map((t) => t.id === id ? { ...t, deadline } : t));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(TASKS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  // ---- projects ----------------------------------------------------------
  const createProjectM = useMutation({
    mutationFn: (body: { name: string; color: string | null }) => a.projects.create(body),
    onSuccess: (res) => patchProjects((prev) => [...prev, res.data]),
    onSettled: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });

  const updateProjectM = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; color?: string | null } }) => a.projects.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: PROJECTS_KEY });
      const previous = qc.getQueryData<ProjectCache>(PROJECTS_KEY);
      patchProjects((prev) => prev.map((p) => p.id === id ? { ...p, ...body } : p));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(PROJECTS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });

  const deleteProjectM = useMutation({
    mutationFn: (id: string) => a.projects.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: PROJECTS_KEY });
      const previous = qc.getQueryData<ProjectCache>(PROJECTS_KEY);
      // Soft delete: keep the row so existing tasks keep their label.
      patchProjects((prev) => prev.map((p) => p.id === id ? { ...p, deleted_at: new Date().toISOString() } : p));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(PROJECTS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });

  const orderProjectsM = useMutation({
    mutationFn: (ids: string[]) => a.projects.order(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: PROJECTS_KEY });
      const previous = qc.getQueryData<ProjectCache>(PROJECTS_KEY);
      const pos = new Map(ids.map((id, i) => [id, i]));
      patchProjects((prev) => prev.map((p) => pos.has(p.id) ? { ...p, position: pos.get(p.id)! } : p));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(PROJECTS_KEY, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });

  const reorderTasks = useMutation({
    mutationFn: (updates: ReorderUpdate[]) =>
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
              project_id: u.project_id !== undefined ? u.project_id : t.project_id,
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
  const { mutate: deadlineMutate } = deadlineTask;
  const { mutate: reorderMutate } = reorderTasks;
  const { mutate: assignMutate } = assignTaskProject;
  const { mutateAsync: createProjectAsync } = createProjectM;
  const { mutate: updateProjectMutate } = updateProjectM;
  const { mutate: deleteProjectMutate } = deleteProjectM;
  const { mutate: orderProjectsMutate } = orderProjectsM;

  const handleAddTask = useCallback((date: string, text: string, projectId: string | null = null) => {
    addMutate({ date, text, isWeekly: false, scope: "day", projectId });
  }, [addMutate]);

  const handleAddWeeklyTask = useCallback((mondayISO: string, text: string, projectId: string | null = null) => {
    addMutate({ date: mondayISO, text, isWeekly: true, scope: "day", projectId });
  }, [addMutate]);

  const handleAddMonthTask = useCallback((monthISO: string, text: string) => {
    addMutate({ date: monthISO, text, isWeekly: false, scope: "month", projectId: null });
  }, [addMutate]);

  const handleAddQuarterTask = useCallback((quarterISO: string, text: string) => {
    addMutate({ date: quarterISO, text, isWeekly: false, scope: "quarter", projectId: null });
  }, [addMutate]);

  const handleAddYearTask = useCallback((yearISO: string, text: string) => {
    addMutate({ date: yearISO, text, isWeekly: false, scope: "year", projectId: null });
  }, [addMutate]);

  const assignProject = useCallback((id: string, projectId: string | null) => {
    assignMutate({ id, projectId });
  }, [assignMutate]);

  const createProject = useCallback(async (name: string, color: string | null) => {
    const res = await createProjectAsync({ name, color });
    return res.data;
  }, [createProjectAsync]);

  const updateProject = useCallback((id: string, body: { name?: string; color?: string | null }) => {
    updateProjectMutate({ id, body });
  }, [updateProjectMutate]);

  const deleteProject = useCallback((id: string) => {
    deleteProjectMutate(id);
  }, [deleteProjectMutate]);

  const orderProjects = useCallback((ids: string[]) => {
    orderProjectsMutate(ids);
  }, [orderProjectsMutate]);

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

  const handleDeadlineChange = useCallback((id: string, deadline: string | null) => {
    deadlineMutate({ id, deadline });
  }, [deadlineMutate]);

  const handleReorder = useCallback((updates: ReorderUpdate[]) => {
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

  const projects = projectsQuery.data?.data ?? EMPTY_PROJECTS;

  return (
    <ProjectsProvider
      projects={projects}
      assignProject={assignProject}
      createProject={createProject}
      updateProject={updateProject}
      deleteProject={deleteProject}
      orderProjects={orderProjects}
    >
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
        onDeadlineChange={handleDeadlineChange}
        onReorder={handleReorder}
        onExport={handleExport}
      />
    </ProjectsProvider>
  );
}
