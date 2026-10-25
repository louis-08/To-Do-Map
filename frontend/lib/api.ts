const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function req<T>(
  path: string,
  options: RequestInit,
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// A task's planning level. NOTE: "week" is intentionally not here — the week
// level is stored on the `is_weekly_objective` flag (the Weekly Objective
// column in the weekly view), which predates this field. `scope` only
// distinguishes the remaining buckets.
export type TaskScope = "day" | "month" | "quarter" | "year";

export type Task = {
  id: string;
  user_id: string;
  date: string;
  text: string;
  done: boolean;
  color: string | null;
  position: number;
  is_weekly_objective: boolean;
  scope: TaskScope;
  // `YYYY-MM-DD`, or null when the task has no deadline.
  deadline: string | null;
  created_at: string;
};

export type WeeklyObjective = {
  id: string;
  user_id: string;
  week_start: string;
  text: string;
};

export type Settings = {
  auto_rollover: boolean;
};

export type DeletedTask = {
  id: string;
  user_id: string;
  date: string;
  text: string;
  color: string | null;
  deadline?: string | null;
  deleted_at: string;
};

export function api(getToken: () => Promise<string | null>) {
  return {
    tasks: {
      list: (start: string, end: string) =>
        req<{ data: Task[] }>(`/tasks?start=${start}&end=${end}`, { method: "GET" }, getToken),

      create: (body: { date: string; text: string; color: string | null; position: number; is_weekly_objective: boolean; scope?: TaskScope; deadline?: string | null }) =>
        req<{ data: Task }>("/tasks", { method: "POST", body: JSON.stringify(body) }, getToken),

      update: (id: string, body: Partial<Pick<Task, "text" | "done" | "color" | "position" | "date" | "deadline">>) =>
        req<{ data: Task }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }, getToken),

      delete: (id: string) =>
        req<{ data: string }>(`/tasks/${id}`, { method: "DELETE" }, getToken),

      reorder: (updates: { id: string; date: string; position: number; is_weekly_objective?: boolean; scope?: TaskScope }[]) =>
        req<{ data: string }>("/tasks/reorder", { method: "PATCH", body: JSON.stringify({ updates }) }, getToken),

    },

    objectives: {
      list: (start: string, end: string) =>
        req<{ data: WeeklyObjective[] }>(`/objectives?start=${start}&end=${end}`, { method: "GET" }, getToken),

      upsert: (weekStart: string, text: string) =>
        req<{ data: WeeklyObjective }>(`/objectives/${weekStart}`, { method: "PUT", body: JSON.stringify({ text }) }, getToken),
    },

    trash: {
      list: () =>
        req<{ data: DeletedTask[] }>("/trash", { method: "GET" }, getToken),

      restore: (id: string) =>
        req<{ data: string }>(`/trash/${id}/restore`, { method: "POST" }, getToken),

      delete: (id: string) =>
        req<{ data: string }>(`/trash/${id}`, { method: "DELETE" }, getToken),
    },

    rollover: {
      run: () =>
        req<{ data: string; moved?: number }>("/rollover", { method: "POST" }, getToken),
    },

    settings: {
      get: () =>
        req<{ data: Settings }>("/settings", { method: "GET" }, getToken),

      update: (body: Settings) =>
        req<{ data: Settings }>("/settings", { method: "PUT", body: JSON.stringify(body) }, getToken),
    },

    account: {
      delete: () =>
        req<{ data: string }>("/account", { method: "DELETE" }, getToken),
    },

    export: {
      markdown: async () => {
        const token = await getToken();
        const res = await fetch(`${BASE}/export/markdown`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      },
    },
  };
}
