from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("")
async def list_trash(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("deleted_tasks")
        .select("*")
        .eq("user_id", user_id)
        .order("deleted_at", desc=True)
        .limit(30)
        .execute()
    )
    return {"data": result.data}


@router.post("/{task_id}/restore")
async def restore_task(task_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    deleted = (
        db.table("deleted_tasks")
        .select("*")
        .eq("id", task_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not deleted.data:
        return {"error": "Not found"}
    task = deleted.data
    # Get max position for that date
    existing = (
        db.table("tasks")
        .select("position")
        .eq("user_id", user_id)
        .eq("date", task["date"])
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    next_pos = (existing.data[0]["position"] + 1) if existing.data else 0
    db.table("tasks").insert({
        "id": task["id"],
        "user_id": user_id,
        "date": task["date"],
        "text": task["text"],
        "color": task["color"],
        "deadline": task.get("deadline"),
        "priority": task.get("priority") or "none",
        "description": task.get("description") or "",
        "repeat_freq": task.get("repeat_freq"),
        "repeat_interval": task.get("repeat_interval") or 1,
        "repeat_anchor": task.get("repeat_anchor"),
        "repeat_until": task.get("repeat_until"),
        "repeat_from_id": task.get("repeat_from_id"),
        "done": False,
        "position": next_pos,
        "scope": task.get("scope") or "day",
        "is_weekly_objective": bool(task.get("is_weekly_objective")),
        "project_id": task.get("project_id"),
    }).execute()
    db.table("deleted_tasks").delete().eq("id", task_id).execute()
    return {"data": "ok"}


@router.delete("/{task_id}")
async def permanently_delete(task_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("deleted_tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
    return {"data": "ok"}
