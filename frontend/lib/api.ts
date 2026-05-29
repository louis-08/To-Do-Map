const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

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

export type Task = {
  id: string;
  user_id: string;
  date: string;
  text: string;
  done: boolean;
  color: string | null;
  position: number;
  is_weekly_objective: boolean;
  created_at: string;
};

export type WeeklyObjective = {
  id: string;
  user_id: string;
  week_start: string;
  text: string;
};

export type DeletedTask = {
  id: string;
  user_id: string;
  date: string;
  text: string;
  color: string | null;
  deleted_at: string;
};

export function api(getToken: () => Promise<string | null>) {
  return {
    tasks: {
      list: (start: string, end: string) =>
        req<{ data: Task[] }>(`/tasks?start=${start}&end=${end}`, { method: "GET" }, getToken),

      create: (body: { date: string; text: string; color: string | null; position: number; is_weekly_objective: boolean }) =>
        req<{ data: Task }>("/tasks", { method: "POST", body: JSON.stringify(body) }, getToken),

      update: (id: string, body: Partial<Pick<Task, "text" | "done" | "color" | "position" | "date">>) =>
        req<{ data: Task }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }, getToken),

      delete: (id: string) =>
        req<{ data: string }>(`/tasks/${id}`, { method: "DELETE" }, getToken),

      reorder: (updates: { id: string; date: string; position: number; is_weekly_objective?: boolean }[]) =>
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
