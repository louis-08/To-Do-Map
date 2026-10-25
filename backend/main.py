from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tasks, objectives, trash, rollover, export, account, settings, projects

app = FastAPI(
    title="TodoMap API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

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

app.include_router(tasks.router, prefix="/api")
app.include_router(objectives.router, prefix="/api")
app.include_router(trash.router, prefix="/api")
app.include_router(rollover.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(projects.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
