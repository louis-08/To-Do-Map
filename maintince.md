# Maintenance Notes

This project is To-Do Map, a calendar-based personal task manager PWA.

## Providers

- Frontend hosting: Vercel.
- Backend hosting: Railway. The backend deploy config is in `backend/railway.json`.
- Database: Supabase.
- Authentication: Clerk.
- Push notifications: Web Push with VAPID keys.

## Project Structure

```text
/
+-- frontend/   Next.js app
+-- backend/    FastAPI API server
`-- db/         Supabase schema and migrations
```

## Frontend

The frontend is a Next.js app using React, TypeScript, Tailwind, Clerk, TanStack Query, and dnd-kit.

Important files:

- `frontend/app/` contains the Next.js routes and app layout.
- `frontend/app/calendar/[month]/page.tsx` is the main calendar page and data-fetching layer.
- `frontend/components/` contains the reusable UI pieces for the calendar, tasks, settings, navigation, and MCP info.
- `frontend/lib/api.ts` is the typed API client used by the UI.
- `frontend/lib/dates.ts` contains date utilities.
- `frontend/lib/i18n.tsx` contains app text and locale strings.
- `frontend/proxy.ts` protects routes with Clerk. This is named `proxy.ts` for Next.js 16; do not rename it to `middleware.ts`.
- `frontend/public/sw.js` is the service worker used for push notifications.

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
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

## Backend

The backend is a FastAPI app deployed to Railway.

Important files:

- `backend/main.py` creates the FastAPI app, mounts routers, configures CORS, mounts the MCP server at `/mcp`, and starts the reminder polling loop.
- `backend/auth.py` verifies Clerk JWTs using Clerk JWKS.
- `backend/database.py` creates the Supabase client using the service role key.
- `backend/models.py` contains Pydantic request models.
- `backend/routers/tasks.py` handles task CRUD, reorder, reminders, and soft delete.
- `backend/routers/rollover.py` moves unfinished day tasks from past dates to today.
- `backend/routers/trash.py` handles restore and permanent delete for deleted tasks.
- `backend/routers/export.py` exports a Markdown backup.
- `backend/routers/settings.py` stores per-user settings.
- `backend/routers/push.py` stores browser push subscriptions.
- `backend/notifications.py` sends due reminders through Web Push.
- `backend/mcp_server/` exposes TodoMap tools over MCP.
- `backend/railway.json` configures the Railway deployment.

Common commands:

```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
python -m pytest
```

Backend environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_JWKS_URL`
- `ALLOWED_ORIGINS`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `MCP_RESOURCE_SERVER_URL`
- `MCP_ALLOWED_HOSTS`

## Database

Supabase stores the app data.

Important files:

- `db/schema.sql` contains the base schema.
- `db/migration_reminders.sql` adds reminder and push subscription support.

Main tables:

- `tasks`: user tasks, dates, ordering, completion, colors, scopes, and reminders.
- `weekly_objectives`: one weekly objective per user and week.
- `deleted_tasks`: soft-deleted tasks shown in trash. The backend keeps only the latest 30 per user.
- `rollover_log`: tracks whether rollover already ran for a user on a given day.
- `settings`: per-user settings such as auto rollover.
- `push_subscriptions`: browser/device subscriptions for Web Push reminders.

## Data Model Notes

- Task planning levels use `scope`.
- Valid scopes are `day`, `month`, `quarter`, and `year`.
- Weekly objectives are stored differently: `scope = "day"` plus `is_weekly_objective = true`.
- Month tasks should use the first day of the month as their date.
- Quarter tasks should use the first day of the quarter as their date.
- Year tasks should use January 1 as their date.
- Normal task deletes are soft deletes. Permanent deletion happens through trash.

## Important Maintenance Notes

- Keep frontend and backend environment variables in sync after changing domains.
- Update `ALLOWED_ORIGINS` on Railway when the Vercel URL changes.
- Update `NEXT_PUBLIC_API_URL` on Vercel when the Railway backend URL changes.
- The backend uses the Supabase service role key, so backend API authorization must stay correct.
- Clerk auth is enforced in both the frontend route protection and backend JWT validation.
- The reminder loop runs inside the FastAPI process and checks for due reminders every 60 seconds.
- If push reminders stop working, check VAPID keys first, then `push_subscriptions`, then Railway logs.
- The MCP server depends on correct Clerk and public backend URL settings.
- The frontend currently has no configured lint script.
- Backend tests are lightweight/ad-hoc; run `python -m pytest` if pytest is installed.
- Before changing Next.js routing, middleware/proxy, server components, or config, check the local Next.js 16 docs because this project uses Next.js 16.

## Deployment Checklist

1. Build the frontend with `npm run build`.
2. Check backend health at `/health`.
3. Confirm Vercel has the correct Clerk, API URL, and VAPID public key env vars.
4. Confirm Railway has the correct Supabase, Clerk, CORS, VAPID, and MCP env vars.
5. Confirm Supabase migrations have been applied before deploying code that depends on new columns or tables.
6. Test sign-in, creating a task, editing a task, deleting/restoring a task, and reminders if affected.
