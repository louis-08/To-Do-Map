from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from models import ProjectCreate, ProjectUpdate, ProjectOrder
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])


def assert_projects_owned(db, user_id: str, project_ids) -> None:
    """Raise 400 unless every non-null id is a project of this user.

    Soft-deleted projects count as owned: tasks keep their deleted project and
    may still be moved inside its lane.
    """
    ids = {pid for pid in project_ids if pid is not None}
    if not ids:
        return
    found = (
        db.table("projects")
        .select("id")
        .eq("user_id", user_id)
        .in_("id", list(ids))
        .execute()
    ).data
    if len({r["id"] for r in found}) != len(ids):
        raise HTTPException(status_code=400, detail="Unknown project")


def _clean_name(name: str) -> str:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name must not be empty")
    return name


@router.get("")
async def list_projects(user_id: str = Depends(get_current_user)):
    """All projects incl. soft-deleted ones (needed to label old tasks).
    The client filters `deleted_at` for pickers and settings."""
    db = get_db()
    result = (
        db.table("projects")
        .select("*")
        .eq("user_id", user_id)
        .order("position")
        .order("created_at")
        .execute()
    )
    return {"data": result.data}


@router.post("")
async def create_project(body: ProjectCreate, user_id: str = Depends(get_current_user)):
    db = get_db()
    last = (
        db.table("projects")
        .select("position")
        .eq("user_id", user_id)
        .order("position", desc=True)
        .limit(1)
        .execute()
    ).data
    position = (last[0]["position"] + 1) if last else 0
    result = (
        db.table("projects")
        .insert({
            "user_id": user_id,
            "name": _clean_name(body.name),
            "color": body.color,
            "position": position,
        })
        .execute()
    )
    return {"data": result.data[0]}


@router.put("/order")
async def order_projects(body: ProjectOrder, user_id: str = Depends(get_current_user)):
    db = get_db()
    assert_projects_owned(db, user_id, body.ids)
    for i, pid in enumerate(body.ids):
        db.table("projects").update({"position": i}).eq("id", pid).eq("user_id", user_id).execute()
    return {"data": "ok"}


@router.patch("/{project_id}")
async def update_project(
    project_id: str, body: ProjectUpdate, user_id: str = Depends(get_current_user)
):
    db = get_db()
    patch: dict = {}
    if body.name is not None:
        patch["name"] = _clean_name(body.name)
    if "color" in body.model_fields_set:
        patch["color"] = body.color
    if not patch:
        raise HTTPException(status_code=422, detail="Nothing to update")
    result = (
        db.table("projects")
        .update(patch)
        .eq("id", project_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")
    return {"data": result.data[0]}


@router.delete("/{project_id}")
async def delete_project(project_id: str, user_id: str = Depends(get_current_user)):
    """Soft delete. Tasks are NOT touched: they keep project_id, so their label
    and lane survive. The project only leaves the picker and settings list."""
    db = get_db()
    result = (
        db.table("projects")
        .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", project_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")
    return {"data": result.data[0]}
