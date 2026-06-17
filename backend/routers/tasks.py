from fastapi import APIRouter, Depends
from models import TaskCreate, TaskUpdate, ReorderRequest, ReminderUpdate
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
async def list_tasks(start: str, end: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .gte("date", start)
        .lte("date", end)
        .order("position")
        .execute()
    )
    return {"data": result.data}


@router.post("")
async def create_task(body: TaskCreate, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("tasks")
        .insert({
            "user_id": user_id,
            "date": str(body.date),
            "text": body.text,
            "color": body.color,
            "position": body.position,
            "is_weekly_objective": body.is_weekly_objective,
            "scope": body.scope,
        })
        .execute()
    )
    return {"data": result.data[0]}


@router.patch("/reorder")
async def reorder_tasks(body: ReorderRequest, user_id: str = Depends(get_current_user)):
    db = get_db()
    for item in body.updates:
        update: dict = {"date": str(item.date), "position": item.position}
        if item.is_weekly_objective is not None:
            update["is_weekly_objective"] = item.is_weekly_objective
        if item.scope is not None:
            update["scope"] = item.scope
        db.table("tasks").update(update).eq("id", item.id).eq("user_id", user_id).execute()
    return {"data": "ok"}


@router.patch("/{task_id}")
async def update_task(
    task_id: str, body: TaskUpdate, user_id: str = Depends(get_current_user)
):
    db = get_db()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if "date" in patch:
        patch["date"] = str(patch["date"])
    result = (
        db.table("tasks")
        .update(patch)
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"data": result.data[0] if result.data else None}


@router.put("/{task_id}/reminder")
async def set_reminder(
    task_id: str, body: ReminderUpdate, user_id: str = Depends(get_current_user)
):
    db = get_db()
    # Setting (or clearing) a reminder always resets reminder_sent_at so a fresh
    # reminder fires, even if this task had already fired a previous one.
    remind_at = body.remind_at.isoformat() if body.remind_at else None
    result = (
        db.table("tasks")
        .update({"remind_at": remind_at, "reminder_sent_at": None})
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"data": result.data[0] if result.data else None}


@router.delete("/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    task = (
        db.table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not task.data:
        return {"error": "Not found"}
    db.table("deleted_tasks").insert({
        "id": task.data["id"],
        "user_id": user_id,
        "date": task.data["date"],
        "text": task.data["text"],
        "color": task.data["color"],
    }).execute()
    db.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
    # Keep only latest 30 deleted tasks per user
    all_deleted = (
        db.table("deleted_tasks")
        .select("id")
        .eq("user_id", user_id)
        .order("deleted_at", desc=True)
        .execute()
    )
    if len(all_deleted.data) > 30:
        old_ids = [r["id"] for r in all_deleted.data[30:]]
        db.table("deleted_tasks").delete().in_("id", old_ids).execute()
    return {"data": "ok"}
