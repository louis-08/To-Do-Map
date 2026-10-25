# Maintenance Notes

This project is To-Do Map, a calendar-based personal task manager PWA.

## Providers

- App hosting: Vercel Services, with the frontend and FastAPI backend in one project.
- Database: Supabase.
- Authentication: Clerk.
- Notifications, reminders, and MCP are not part of the deployed app.

## Project Structure

```text
/
+-- frontend/   Next.js app
+-- backend/    FastAPI API service
+-- db/         Supabase schema and historical migrations
`-- vercel.json Vercel Services routing
```

## Frontend

The frontend is a Next.js app using React, TypeScript, Tailwind, Clerk, TanStack Query, and dnd-kit.

Important files:

- `frontend/app/` contains the Next.js routes and app layout.
- `frontend/app/calendar/[month]/page.tsx` is the main calendar page and data-fetching layer.
- `frontend/components/` contains reusable UI pieces for the calendar, tasks, settings, and navigation.
- `frontend/lib/api.ts` is the typed API client. It defaults to the same-origin `/api` path.
- `frontend/lib/dates.ts` contains date utilities.
- `frontend/lib/i18n.tsx` contains app text and locale strings.
- `frontend/lib/board.ts` is the pure week-board logic: project lanes, droppable ids, drag-and-drop reordering. Unit tested in `frontend/lib/board.test.ts`.
- `frontend/lib/projects.tsx` provides projects and project actions to all components via React context.
- `frontend/proxy.ts` protects routes with Clerk. This is named `proxy.ts` for Next.js 16; do not rename it to `middleware.ts`.

Common commands:

```bash
cd frontend
npm run dev
npm run build
npm run start
npm test      # board logic, node --test (Node >= 22.18)
```

Frontend environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` only when overriding `/api` for local development, for example `http://localhost:8000/api`.

## Backend

The backend is a FastAPI service routed through Vercel at `/api`.

Important files:

- `backend/main.py` creates the FastAPI app, configures CORS, and registers all routers below `/api`.
- `backend/auth.py` verifies Clerk JWTs using Clerk JWKS.
- `backend/database.py` creates the Supabase client using the service role key.
- `backend/models.py` contains Pydantic request models.
- `backend/routers/tasks.py` handles task CRUD, reorder, and soft delete.
- `backend/routers/rollover.py` moves unfinished day tasks from past dates to today.
- `backend/routers/trash.py` handles restore and permanent delete for deleted tasks.
- `backend/routers/export.py` exports a Markdown backup.
- `backend/routers/settings.py` stores per-user settings.
- `backend/routers/projects.py` handles project CRUD, ordering and soft delete.

Common commands:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Tests (in-memory fake of the Supabase client, no database needed):

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

Backend environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_JWKS_URL`
- `ALLOWED_ORIGINS` for local cross-origin development, normally `http://localhost:3000`.

## Database

Supabase stores the app data.

Important files:

- `db/schema.sql` contains the base schema.
- `db/migration_projects.sql` adds projects. Run it before deploying the projects feature.
- `db/migration_reminders.sql` is historical and may remain applied. The reminder columns and `push_subscriptions` table are unused by the application and can be cleaned up later with a separate migration.

Main tables:

- `tasks`: user tasks, dates, ordering, completion, colors, and scopes.
- `weekly_objectives`: one weekly objective per user and week.
- `deleted_tasks`: soft-deleted tasks shown in trash. The backend keeps only the latest 30 per user.
- `rollover_log`: tracks whether rollover already ran for a user on a given day.
- `settings`: per-user settings such as auto rollover.
- `projects`: per-user projects (name, color, order). Deleting a project is a soft delete (`deleted_at`): it leaves pickers and settings, but tasks keep their `project_id`, label and lane.

## Projects

- Every task has an optional `project_id` (`NULL` = "Kein Projekt").
- Week view, normal mode: each task shows a project label.
- Week view, project mode (lanes button in the top bar, stored in `localStorage`): every week is split into horizontal lanes, one per active project, plus deleted projects that still have tasks that week, plus "Kein Projekt". Dragging a task into another lane re-assigns its project; `+` in a lane creates the task in that project.
- Task order (`position`) is kept per day column across all projects, so both modes show the same relative order.
- API semantics: in `PATCH /api/tasks/{id}` and `PATCH /api/tasks/reorder`, an omitted `project_id` means unchanged and an explicit `null` clears it. All other task fields keep the legacy rule "null = unchanged".

## Deployment Checklist

1. In Vercel project settings, select the Services framework.
2. Build the frontend with `npm.cmd run build` from `frontend`.
3. Set Clerk variables for the frontend and Supabase, Clerk JWKS, and CORS variables for the backend service.
4. Do not set `NEXT_PUBLIC_API_URL` in Vercel unless a non-default API path is intentionally required.
5. Deploy without a `crons` configuration.
6. Verify `/api/health`, sign-in, task CRUD, trash restore/delete, rollover, export, settings, and account deletion.
