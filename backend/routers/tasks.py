from fastapi import APIRouter, Depends
from models import TaskCreate, TaskUpdate, ReorderRequest
from auth import get_current_user
from database import get_db
from routers.projects import assert_projects_owned

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
    assert_projects_owned(db, user_id, [body.project_id])
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
            "project_id": body.project_id,
            "deadline": str(body.deadline) if body.deadline else None,
            "priority": body.priority,
            "description": body.description,
        })
        .execute()
    )
    return {"data": result.data[0]}


@router.patch("/reorder")
async def reorder_tasks(body: ReorderRequest, user_id: str = Depends(get_current_user)):
    db = get_db()
    assert_projects_owned(
        db, user_id,
        [i.project_id for i in body.updates if "project_id" in i.model_fields_set],
    )
    for item in body.updates:
        update: dict = {"date": str(item.date), "position": item.position}
        if item.is_weekly_objective is not None:
            update["is_weekly_objective"] = item.is_weekly_objective
        if item.scope is not None:
            update["scope"] = item.scope
        if "project_id" in item.model_fields_set:
            update["project_id"] = item.project_id
        db.table("tasks").update(update).eq("id", item.id).eq("user_id", user_id).execute()
    return {"data": "ok"}


@router.patch("/{task_id}")
async def update_task(
    task_id: str, body: TaskUpdate, user_id: str = Depends(get_current_user)
):
    db = get_db()
    patch = body.to_patch()
    if "project_id" in patch:
        assert_projects_owned(db, user_id, [patch["project_id"]])
    if not patch:
        # Nothing to change: answer with the current row instead of sending an
        # empty UPDATE (which PostgREST rejects).
        current = (
            db.table("tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
        )
        return {"data": current.data[0] if current.data else None}
    result = (
        db.table("tasks")
        .update(patch)
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
        "scope": task.data.get("scope") or "day",
        "is_weekly_objective": bool(task.data.get("is_weekly_objective")),
        "project_id": task.data.get("project_id"),
        "deadline": task.data.get("deadline"),
        "priority": task.data.get("priority") or "none",
        "description": task.data.get("description") or "",
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
