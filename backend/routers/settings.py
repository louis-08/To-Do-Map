from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_db
from models import SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings(user_id: str = Depends(get_current_user)):
    db = get_db()
    res = (
        db.table("settings")
        .select("auto_rollover")
        .eq("user_id", user_id)
        .execute()
    )
    auto_rollover = res.data[0]["auto_rollover"] if res.data else False
    return {"data": {"auto_rollover": auto_rollover}}


@router.put("")
async def update_settings(
    body: SettingsUpdate, user_id: str = Depends(get_current_user)
):
    db = get_db()
    db.table("settings").upsert(
        {"user_id": user_id, "auto_rollover": body.auto_rollover}
    ).execute()
    return {"data": {"auto_rollover": body.auto_rollover}}
