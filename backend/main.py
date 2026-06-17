from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import tasks, objectives, trash, rollover, export, account, settings, push
from mcp_server.server import mcp, PROTECTED_RESOURCE_METADATA
from notifications import dispatch_due_reminders

mcp_app = mcp.streamable_http_app()

log = logging.getLogger("scheduler")
REMINDER_POLL_SECONDS = 60


async def _reminder_loop():
    """Poll for due reminders forever. Runs blocking DB/push work off the event
    loop so it never stalls request handling."""
    while True:
        try:
            sent = await asyncio.to_thread(dispatch_due_reminders)
            if sent:
                log.info("Dispatched %d reminder(s)", sent)
        except Exception as e:  # noqa: BLE001 — keep the loop alive on any error
            log.warning("Reminder loop error: %s", e)
        await asyncio.sleep(REMINDER_POLL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Streamable HTTP needs its session manager running for the app's lifetime.
    async with mcp.session_manager.run():
        reminder_task = asyncio.create_task(_reminder_loop())
        try:
            yield
        finally:
            reminder_task.cancel()


app = FastAPI(title="TodoMap API", lifespan=lifespan)

_allowed_origins = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(objectives.router)
app.include_router(trash.router)
app.include_router(rollover.router)
app.include_router(export.router)
app.include_router(account.router)
app.include_router(settings.router)
app.include_router(push.router)

# MCP server (OAuth-protected) mounted at /mcp
app.mount("/mcp", mcp_app)


# OAuth Protected Resource Metadata (RFC 9728) served at the origin root, where
# the MCP 401 advertises it. Both the bare and resource-suffixed paths are
# served because clients differ in which they request.
@app.get("/.well-known/oauth-protected-resource")
@app.get("/.well-known/oauth-protected-resource/mcp")
async def oauth_protected_resource():
    return JSONResponse(PROTECTED_RESOURCE_METADATA)


@app.get("/health")
def health():
    return {"status": "ok"}
