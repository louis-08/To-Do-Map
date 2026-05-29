from fastapi import APIRouter, Depends
from models import ObjectiveUpsert
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/objectives", tags=["objectives"])


@router.get("")
async def list_objectives(start: str, end: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("weekly_objectives")
        .select("*")
        .eq("user_id", user_id)
        .gte("week_start", start)
        .lte("week_start", end)
        .execute()
    )
    return {"data": result.data}


@router.put("/{week_start}")
async def upsert_objective(
    week_start: str, body: ObjectiveUpsert, user_id: str = Depends(get_current_user)
):
    db = get_db()
    result = (
        db.table("weekly_objectives")
        .upsert({"user_id": user_id, "week_start": week_start, "text": body.text})
        .execute()
    )
    return {"data": result.data[0]}
