from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tasks, objectives, trash, rollover, export, account

app = FastAPI(title="TodoMap API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/health")
def health():
    return {"status": "ok"}
