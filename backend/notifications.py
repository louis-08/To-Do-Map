"""Web Push delivery + the reminder dispatch routine.

`dispatch_due_reminders()` is the single source of truth for "find due reminders
and send them". It is called by the in-process scheduler (see main.py) and is
safe to call repeatedly — each reminder is marked sent so it never fires twice.
"""

import base64
import json
import logging
import os
from datetime import datetime, timezone

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import webpush, WebPushException

from database import get_db

log = logging.getLogger("notifications")

_private_pem: str | None = None
_warned_unconfigured = False


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _get_private_pem() -> str | None:
    """Reconstruct the VAPID private key PEM from the raw base64url value once."""
    global _private_pem
    if _private_pem is not None:
        return _private_pem
    raw = os.environ.get("VAPID_PRIVATE_KEY")
    if not raw:
        return None
    private_value = int.from_bytes(_b64url_decode(raw), "big")
    key = ec.derive_private_key(private_value, ec.SECP256R1())
    _private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return _private_pem


def send_push(sub: dict, payload: dict) -> bool:
    """Send one push. Returns False only when the subscription is gone (so the
    caller prunes it); other errors are logged and treated as non-fatal."""
    pem = _get_private_pem()
    if pem is None:
        return True  # not configured; nothing to prune
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            },
            data=json.dumps(payload),
            vapid_private_key=pem,
            vapid_claims={"sub": os.environ.get("VAPID_SUBJECT", "mailto:admin@example.com")},
        )
        return True
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        if status in (404, 410):
            return False  # subscription expired/unsubscribed → prune
        log.warning("Web push failed (status=%s): %s", status, e)
        return True
    except Exception as e:  # noqa: BLE001 — never let one bad push kill the loop
        log.warning("Web push error: %s", e)
        return True


def dispatch_due_reminders() -> int:
    """Send every reminder whose time has passed and that hasn't fired yet.
    Returns the number of reminders dispatched."""
    global _warned_unconfigured
    if _get_private_pem() is None:
        if not _warned_unconfigured:
            log.warning("VAPID keys not configured; reminder dispatch is a no-op.")
            _warned_unconfigured = True
        return 0

    db = get_db()
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    due = (
        db.table("tasks")
        .select("id, user_id, text, date")
        .lte("remind_at", now_iso)
        .is_("reminder_sent_at", "null")
        .execute()
    )

    for task in due.data:
        subs = (
            db.table("push_subscriptions")
            .select("*")
            .eq("user_id", task["user_id"])
            .execute()
        )
        payload = {
            "title": task["text"] or "Reminder",
            "body": "To Do Map reminder",
            "url": "/",
            "tag": task["id"],
        }
        for sub in subs.data:
            if not send_push(sub, payload):
                db.table("push_subscriptions").delete().eq("id", sub["id"]).execute()

        # Mark sent regardless of whether subscriptions existed, so a reminder
        # is never re-evaluated on the next tick.
        db.table("tasks").update({"reminder_sent_at": now_iso}).eq("id", task["id"]).execute()

    return len(due.data)
