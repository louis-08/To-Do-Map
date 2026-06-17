from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/account", tags=["account"])


@router.delete("")
async def delete_account(user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("tasks").delete().eq("user_id", user_id).execute()
    db.table("deleted_tasks").delete().eq("user_id", user_id).execute()
    db.table("weekly_objectives").delete().eq("user_id", user_id).execute()
    db.table("rollover_log").delete().eq("user_id", user_id).execute()
    db.table("settings").delete().eq("user_id", user_id).execute()
    return {"data": "ok"}
