"""TodoMap MCP server.

Exposes TodoMap tools to AI clients (Claude, etc.) over Streamable HTTP.
Mounted into the main FastAPI app at /mcp (see backend/main.py).

Auth: OAuth 2.1 Resource Server. Clerk is the Authorization Server. Tokens are
validated by ClerkTokenVerifier; the SDK serves the RFC 9728 metadata and
returns 401 to unauthenticated requests automatically.

Each tool is a thin adapter: it resolves the authenticated user from the MCP
request context and delegates to the existing REST router functions, so there
is a single source of truth for the actual data logic.
"""

import os

from pydantic import AnyHttpUrl

from mcp.server.fastmcp import FastMCP
from mcp.server.auth.settings import AuthSettings
from mcp.server.auth.middleware.auth_context import get_access_token

from database import get_db
from models import TaskCreate, TaskUpdate, ObjectiveUpsert
from routers import tasks as tasks_router
from routers import objectives as objectives_router
from routers import trash as trash_router
from routers import rollover as rollover_router
from routers.export import _build_markdown
from mcp_server.auth import ClerkTokenVerifier

# Clerk issuer is the JWKS URL without the well-known suffix.
_ISSUER = os.environ["CLERK_JWKS_URL"].replace("/.well-known/jwks.json", "")
# This server's own public base URL (no trailing /mcp). Override in prod.
_RESOURCE_SERVER_URL = os.environ.get(
    "MCP_RESOURCE_SERVER_URL", "http://localhost:8000"
)

mcp = FastMCP(
    "TodoMap",
    json_response=True,
    stateless_http=True,
    token_verifier=ClerkTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(_ISSUER),
        resource_server_url=AnyHttpUrl(_RESOURCE_SERVER_URL),
        required_scopes=[],
    ),
)
# Serve the endpoint at the mount root (/mcp) instead of /mcp/mcp.
mcp.settings.streamable_http_path = "/"

# RFC 9728 Protected Resource Metadata. The SDK advertises this at the origin
# root in the 401's WWW-Authenticate header, but only serves it under /mcp
# (because it's mounted there), so main.py also serves this dict at the root.
PROTECTED_RESOURCE_METADATA = {
    "resource": _RESOURCE_SERVER_URL.rstrip("/") + "/mcp",
    "authorization_servers": [_ISSUER + "/"],
    "scopes_supported": [],
    "bearer_methods_supported": ["header"],
}


def _current_user_id() -> str:
    token = get_access_token()
    if token is None or not token.subject:
        raise ValueError("No authenticated user in request context")
    return token.subject


# --- Tasks ---------------------------------------------------------------

@mcp.tool()
async def list_tasks(start: str, end: str) -> dict:
    """List the signed-in user's tasks between two dates (inclusive).

    Args:
        start: Start date in ISO format, e.g. "2026-06-01".
        end: End date in ISO format, e.g. "2026-06-30".
    """
    return await tasks_router.list_tasks(start, end, user_id=_current_user_id())


@mcp.tool()
async def create_task(
    date: str,
    text: str,
    color: str | None = None,
    is_weekly_objective: bool = False,
    position: int | None = None,
) -> dict:
    """Create a new task on a given date.

    Args:
        date: Date in ISO format, e.g. "2026-06-15".
        text: The task text.
        color: Optional color label.
        is_weekly_objective: Whether this row is a weekly objective.
        position: Order within the day; appended to the end if omitted.
    """
    user_id = _current_user_id()
    if position is None:
        existing = (
            get_db()
            .table("tasks")
            .select("position")
            .eq("user_id", user_id)
            .eq("date", date)
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
        position = (existing.data[0]["position"] + 1) if existing.data else 0
    body = TaskCreate(
        date=date,
        text=text,
        color=color,
        position=position,
        is_weekly_objective=is_weekly_objective,
    )
    return await tasks_router.create_task(body, user_id=user_id)


@mcp.tool()
async def update_task(
    task_id: str,
    text: str | None = None,
    done: bool | None = None,
    color: str | None = None,
    position: int | None = None,
    date: str | None = None,
    is_weekly_objective: bool | None = None,
) -> dict:
    """Update fields on an existing task. Only the fields you pass are changed.

    Args:
        task_id: ID of the task to update.
        text: New task text.
        done: Mark complete (True) or incomplete (False).
        color: New color label.
        position: New order within its day.
        date: Move the task to this ISO date.
        is_weekly_objective: Toggle weekly-objective flag.
    """
    body = TaskUpdate(
        text=text,
        done=done,
        color=color,
        position=position,
        date=date,
        is_weekly_objective=is_weekly_objective,
    )
    return await tasks_router.update_task(
        task_id, body, user_id=_current_user_id()
    )


@mcp.tool()
async def delete_task(task_id: str) -> dict:
    """Soft-delete a task. It moves to trash and can be restored.

    Args:
        task_id: ID of the task to delete.
    """
    return await tasks_router.delete_task(task_id, user_id=_current_user_id())


# --- Objectives ----------------------------------------------------------

@mcp.tool()
async def list_objectives(start: str, end: str) -> dict:
    """List weekly objectives whose week_start falls between two dates.

    Args:
        start: Start date in ISO format, e.g. "2026-06-01".
        end: End date in ISO format, e.g. "2026-06-30".
    """
    return await objectives_router.list_objectives(
        start, end, user_id=_current_user_id()
    )


@mcp.tool()
async def set_objective(week_start: str, text: str) -> dict:
    """Set (create or replace) the weekly objective for a given week.

    Args:
        week_start: The Monday of the week, ISO format e.g. "2026-06-08".
        text: The objective text.
    """
    return await objectives_router.upsert_objective(
        week_start, ObjectiveUpsert(text=text), user_id=_current_user_id()
    )


# --- Trash ---------------------------------------------------------------

@mcp.tool()
async def list_trash() -> dict:
    """List the user's recently deleted tasks (up to 30, newest first)."""
    return await trash_router.list_trash(user_id=_current_user_id())


@mcp.tool()
async def restore_task(task_id: str) -> dict:
    """Restore a soft-deleted task from trash back to its original date.

    Args:
        task_id: ID of the deleted task to restore.
    """
    return await trash_router.restore_task(task_id, user_id=_current_user_id())


# --- Bulk / export -------------------------------------------------------

@mcp.tool()
async def run_rollover() -> dict:
    """Move all undone tasks from past dates onto today. Idempotent per day."""
    return await rollover_router.rollover(user_id=_current_user_id())


@mcp.tool()
async def export_markdown() -> str:
    """Export the user's full TodoMap as a Markdown backup string."""
    return _build_markdown(_current_user_id())
