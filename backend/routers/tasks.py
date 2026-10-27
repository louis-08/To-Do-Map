import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from models import TaskCreate, TaskUpdate, ReorderRequest
from auth import get_current_user
from database import get_db
from recurrence import next_occurrence
from routers.projects import assert_projects_owned

router = APIRouter(prefix="/tasks", tags=["tasks"])

REPEAT_COLUMNS = ("repeat_freq", "repeat_interval", "repeat_anchor", "repeat_until")


def _can_repeat(scope: Optional[str], is_weekly_objective: bool) -> bool:
    """Only plain day tasks repeat; month/quarter/year plans and weekly objectives do not."""
    return (scope or "day") == "day" and not is_weekly_objective


def _normalize_repeat(patch: dict, current: dict) -> None:
    """Validate the recurrence part of a PATCH and fill in the derived columns (in place).

    Switching the rule off resets interval/anchor/until. Setting or changing
    freq/interval re-anchors the schedule on the task's (new) date; changing
    only the end date keeps the anchor.
    """
    if not any(k in patch for k in ("repeat_freq", "repeat_interval", "repeat_until")):
        return
    if "repeat_freq" in patch and patch["repeat_freq"] is None:
        patch.update(repeat_interval=1, repeat_anchor=None, repeat_until=None)
        return
    freq = patch.get("repeat_freq", current.get("repeat_freq"))
    if freq is None:
        raise HTTPException(422, "repeat_interval/repeat_until need a repeat_freq")
    scope = patch.get("scope", current.get("scope"))
    weekly = patch.get("is_weekly_objective", current.get("is_weekly_objective", False))
    if not _can_repeat(scope, weekly):
        raise HTTPException(422, "Only day tasks can repeat")
    date = patch.get("date", current["date"])
    if "repeat_freq" in patch or "repeat_interval" in patch or not current.get("repeat_anchor"):
        patch["repeat_anchor"] = date
    until = patch.get("repeat_until", current.get("repeat_until"))
    if until is not None and until < date:
        raise HTTPException(422, "repeat_until must not be before the task date")


def _spawn_next(db, user_id: str, task: dict) -> Optional[dict]:
    """Create the next occurrence of a just-completed repeating task.

    Idempotent: toggling done on/off/on never creates a second successor.
    Returns the new row, or None when the series ends here (past repeat_until)
    or the task cannot repeat.
    """
    if not task.get("repeat_freq") or not _can_repeat(task.get("scope"), task.get("is_weekly_objective", False)):
        return None
    existing = (
        db.table("tasks").select("id").eq("user_id", user_id).eq("repeat_from_id", task["id"]).execute()
    )
    if existing.data:
        return None
    done_date = datetime.date.fromisoformat(task["date"])
    anchor = datetime.date.fromisoformat(task.get("repeat_anchor") or task["date"])
    # Late completion (rolled over or finished after the day) skips occurrences
    # that already passed instead of piling up overdue copies.
    after = max(done_date, datetime.date.today())
    nxt = next_occurrence(anchor, task["repeat_freq"], task.get("repeat_interval") or 1, after)
    if nxt is None:
        return None
    if task.get("repeat_until") and nxt > datetime.date.fromisoformat(task["repeat_until"]):
        return None
    deadline = task.get("deadline")
    if deadline:  # keep the lead time between task date and deadline
        deadline = str(datetime.date.fromisoformat(deadline) + (nxt - done_date))
    last = (
        db.table("tasks")
        .select("position")
        .eq("user_id", user_id)
        .eq("date", str(nxt))
        .order("position", desc=True)
        .limit(1)
        .execute()
    )
    row = {
        "user_id": user_id,
        "date": str(nxt),
        "text": task["text"],
        "color": task.get("color"),
        "position": (last.data[0]["position"] + 1) if last.data else 0,
        "is_weekly_objective": False,
        "scope": "day",
        "project_id": task.get("project_id"),
        "deadline": deadline,
        "priority": task.get("priority") or "none",
        "description": task.get("description") or "",
        "repeat_freq": task["repeat_freq"],
        "repeat_interval": task.get("repeat_interval") or 1,
        "repeat_anchor": str(anchor),
        "repeat_until": task.get("repeat_until"),
        "repeat_from_id": task["id"],
    }
    return db.table("tasks").insert(row).execute().data[0]


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
    repeating = body.repeat_freq is not None
    if repeating and not _can_repeat(body.scope, body.is_weekly_objective):
        raise HTTPException(422, "Only day tasks can repeat")
    if repeating and body.repeat_until is not None and body.repeat_until < body.date:
        raise HTTPException(422, "repeat_until must not be before the task date")
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
            "repeat_freq": body.repeat_freq,
            "repeat_interval": body.repeat_interval if repeating else 1,
            "repeat_anchor": str(body.date) if repeating else None,
            "repeat_until": str(body.repeat_until) if repeating and body.repeat_until else None,
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
    current = (
        db.table("tasks").select("*").eq("id", task_id).eq("user_id", user_id).execute()
    ).data
    if not current:
        return {"data": None}
    current = current[0]
    _normalize_repeat(patch, current)
    if not patch:
        # Nothing to change: answer with the current row instead of sending an
        # empty UPDATE (which PostgREST rejects).
        return {"data": current}
    result = (
        db.table("tasks")
        .update(patch)
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    updated = result.data[0] if result.data else None
    spawned = None
    if updated and "done" in patch and patch["done"] != bool(current.get("done")):
        if patch["done"]:
            spawned = _spawn_next(db, user_id, updated)
        else:
            # Undo: the successor created by the completion goes away again,
            # unless it was already worked on.
            db.table("tasks").delete().eq("user_id", user_id).eq(
                "repeat_from_id", task_id
            ).eq("done", False).execute()
    return {"data": updated, "spawned": spawned}


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
        "repeat_freq": task.data.get("repeat_freq"),
        "repeat_interval": task.data.get("repeat_interval") or 1,
        "repeat_anchor": task.data.get("repeat_anchor"),
        "repeat_until": task.data.get("repeat_until"),
        "repeat_from_id": task.data.get("repeat_from_id"),
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
