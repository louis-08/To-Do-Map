from datetime import date
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/rollover", tags=["rollover"])


@router.post("")
async def rollover(user_id: str = Depends(get_current_user)):
    db = get_db()
    today = date.today().isoformat()

    log = (
        db.table("rollover_log")
        .select("last_run")
        .eq("user_id", user_id)
        .execute()
    )
    if log.data and log.data[0]["last_run"] >= today:
        return {"data": "already_done"}

    undone = (
        db.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .eq("done", False)
        .eq("is_weekly_objective", False)
        .lt("date", today)
        .order("date")
        .order("position")
        .execute()
    )

    if undone.data:
        # Find current min position for today to insert above
        existing = (
            db.table("tasks")
            .select("id, position")
            .eq("user_id", user_id)
            .eq("date", today)
            .order("position")
            .execute()
        )
        # Shift existing tasks down
        shift_count = len(undone.data)
        for t in existing.data:
            db.table("tasks").update(
                {"position": t["position"] + shift_count}
            ).eq("id", t["id"]).execute()

        # Move undone tasks to today
        for i, task in enumerate(undone.data):
            db.table("tasks").update(
                {"date": today, "position": i}
            ).eq("id", task["id"]).execute()

    db.table("rollover_log").upsert(
        {"user_id": user_id, "last_run": today}
    ).execute()

    return {"data": "done", "moved": len(undone.data) if undone.data else 0}
