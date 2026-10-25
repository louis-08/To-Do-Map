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
- `frontend/proxy.ts` protects routes with Clerk. This is named `proxy.ts` for Next.js 16; do not rename it to `middleware.ts`.

Common commands:

```bash
cd frontend
npm run dev
npm run build
npm run start
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

Common commands:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
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
- `db/migration_deadline.sql` adds `tasks.deadline` and `deleted_tasks.deadline` (both nullable `DATE`). It is idempotent. Run it in the Supabase SQL editor **before** deploying the backend that uses it; the API inserts a `deadline` key on every task create and delete, so those calls fail while the column is missing.
- `db/migration_reminders.sql` is historical and may remain applied. The reminder columns and `push_subscriptions` table are unused by the application and can be cleaned up later with a separate migration.

Main tables:

- `tasks`: user tasks, dates, ordering, completion, colors, scopes, and an optional `deadline` date.
- `weekly_objectives`: one weekly objective per user and week.
- `deleted_tasks`: soft-deleted tasks shown in trash. The backend keeps only the latest 30 per user.
- `rollover_log`: tracks whether rollover already ran for a user on a given day.
- `settings`: per-user settings such as auto rollover.

## Tests

Backend (pytest, in-memory fake of the Supabase client, no credentials needed):

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

Frontend (vitest):

```bash
cd frontend
npm test
```

## Deployment Checklist

0. Apply any new file in `db/` (currently `migration_deadline.sql`) to Supabase first.
1. In Vercel project settings, select the Services framework.
2. Build the frontend with `npm.cmd run build` from `frontend`.
3. Set Clerk variables for the frontend and Supabase, Clerk JWKS, and CORS variables for the backend service.
4. Do not set `NEXT_PUBLIC_API_URL` in Vercel unless a non-default API path is intentionally required.
5. Deploy without a `crons` configuration.
6. Verify `/api/health`, sign-in, task CRUD, trash restore/delete, rollover, export, settings, and account deletion.
