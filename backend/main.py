from dotenv import load_dotenv
load_dotenv()

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import tasks, objectives, trash, rollover, export, account, settings
from mcp_server.server import mcp, PROTECTED_RESOURCE_METADATA

mcp_app = mcp.streamable_http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Streamable HTTP needs its session manager running for the app's lifetime.
    async with mcp.session_manager.run():
        yield


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
