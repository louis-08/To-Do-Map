from fastapi import APIRouter, Depends
from auth import get_current_user
from database import get_db
from models import PushSubscriptionCreate

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/subscribe")
async def subscribe(
    body: PushSubscriptionCreate, user_id: str = Depends(get_current_user)
):
    db = get_db()
    # endpoint is unique; upsert so re-subscribing the same device is idempotent
    # and a device that switches accounts gets reassigned to the new user.
    db.table("push_subscriptions").upsert(
        {
            "user_id": user_id,
            "endpoint": body.endpoint,
            "p256dh": body.p256dh,
            "auth": body.auth,
        },
        on_conflict="endpoint",
    ).execute()
    return {"data": "ok"}
