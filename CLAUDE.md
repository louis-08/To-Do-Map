# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

To-Do Map is a calendar-based personal task manager PWA with a Next.js 16 frontend and a FastAPI backend. Tasks have a `scope` (`day`, `month`, `quarter`, `year`) and an `is_weekly_objective` flag. All data is stored in Supabase; auth is handled by Clerk.

## Repository Structure

```
/
├── frontend/   Next.js 16 app (React 19, Tailwind v4, TypeScript)
└── backend/    FastAPI app (Python, Supabase, Clerk JWT auth)
```

## Commands

### Frontend (`cd frontend`)

```bash
npm run dev     # Start dev server on http://localhost:3000
npm run build   # Production build
npm run start   # Serve production build
```

No lint or test commands are configured.

### Backend (`cd backend`)

```bash
# Activate venv first (Windows)
.venv\Scripts\Activate.ps1

uvicorn main:app --reload          # Start dev server (default port 8000)
python test_date.py                # Ad-hoc field test
python -m pytest                   # Run tests (if pytest installed)
```

Backend is deployed to Railway via `railway.json` with `uvicorn main:app --host 0.0.0.0 --port $PORT`.

## Required Environment Variables

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` — backend base URL (empty string = same origin in prod)

**Backend** (`.env`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_JWKS_URL` — e.g. `https://<clerk-domain>/.well-known/jwks.json`
- `ALLOWED_ORIGINS` — comma-separated list (default: `http://localhost:3000`)

## Architecture

### Frontend

- **`app/calendar/[month]/page.tsx`** — sole data-fetching layer. Fetches all tasks from 2026-01-01 to 2031-12-31 in one query. Every mutation (add, toggle, delete, edit, color, reorder) uses TanStack Query with optimistic updates + rollback on error.
- **`components/MonthView.tsx`** — top-level view container. Manages the virtual week list (`ALL_WEEKS`, built once at module load for 2026–2031), virtual scrolling (load-earlier/load-later bands), DnD context (`@dnd-kit`), and view switching (`board` | `year` | `settings`).
- **`components/WeekRow.tsx`** — renders one ISO week (Mon–Sun + weekly-objective column).
- **`components/YearView.tsx`** — year/quarter/month scoped task view, separate from the board.
- **`lib/api.ts`** — typed API client factory `api(getToken)`. All endpoints live here. `TaskScope = "day" | "month" | "quarter" | "year"` — note: weekly-level is stored via `is_weekly_objective: boolean`, not a scope value.
- **`lib/dates.ts`** — date utilities; locale is `de-DE` for display formatting.
- **`lib/i18n.tsx`** — i18n context. Locale strings live here.
- **`proxy.ts`** — Clerk middleware (named `proxy`, not `middleware`, to work with Next.js 16).

### Backend

- **`main.py`** — FastAPI app. Mounts all routers and an MCP server at `/mcp`. Runs a background reminder polling loop every 60 s.
- **`auth.py`** — Clerk JWT verification via JWKS. `get_current_user` dependency returns the Clerk user ID (`sub` claim).
- **`database.py`** — singleton Supabase client; uses service role key (bypasses RLS).
- **`routers/tasks.py`** — CRUD + reorder + reminder endpoints. Delete soft-deletes to `deleted_tasks` (capped at 30 per user).
- **`routers/rollover.py`** — moves incomplete tasks from past days to today.
- **`models.py`** — Pydantic v2 request models.

### Key Data Model Notes

- `Task.scope` distinguishes `day | month | quarter | year`. The `week` level predates this field and is stored via `is_weekly_objective = true` instead.
- Tasks are fetched once per session (large date range) and mutated optimistically client-side. `queryKey: ["tasks", start, end]` is the single cache key.
- Deleted tasks go to `deleted_tasks` table and appear in `/trash`. Restore moves them back; hard-delete purges permanently.

## Next.js Version Warning

This project uses **Next.js 16** which has breaking changes from earlier versions. Before editing any Next.js-specific code (routing, middleware, server components, config), read `frontend/node_modules/next/dist/docs/` for the correct API. The middleware file is named `proxy.ts` (not `middleware.ts`) — do not rename it.
