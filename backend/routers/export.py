import os
import io
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from auth import get_current_user
from database import get_db

router = APIRouter(tags=["export"])


def _build_markdown(user_id: str) -> str:
    db = get_db()
    today = date.today()
    tasks = (
        db.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .order("date")
        .order("position")
        .execute()
    ).data
    objectives = (
        db.table("weekly_objectives")
        .select("*")
        .eq("user_id", user_id)
        .order("week_start")
        .execute()
    ).data

    obj_map = {o["week_start"]: o["text"] for o in objectives}

    lines = [f"# TodoMap Backup — {today.isoformat()}\n"]
    current_year = current_month = current_week = None

    for task in tasks:
        d = date.fromisoformat(task["date"])
        week_start = d - timedelta(days=d.weekday())
        week_end = week_start + timedelta(days=6)
        iso_week = d.isocalendar()[1]

        if d.year != current_year:
            current_year = d.year
            lines.append(f"\n## {current_year}")

        month_name = d.strftime("%B")
        if (d.year, d.month) != current_month:
            current_month = (d.year, d.month)
            lines.append(f"\n### {month_name}")

        week_key = week_start.isoformat()
        if week_key != current_week:
            current_week = week_key
            ws = week_start.strftime("%-d. %b").lstrip("0") if os.name != "nt" else week_start.strftime("%d. %b").lstrip("0")
            we = week_end.strftime("%-d. %b").lstrip("0") if os.name != "nt" else week_end.strftime("%d. %b").lstrip("0")
            lines.append(f"\n#### KW {iso_week} ({ws} – {we})")
            obj_text = obj_map.get(week_key, "")
            if obj_text:
                lines.append(f"**Weekly Objective:** {obj_text}")

        day_label = d.strftime("%A %d.%m")
        lines.append(f"\n**{day_label}**")
        check = "x" if task["done"] else " "
        lines.append(f"- [{check}] {task['text']}")

    return "\n".join(lines)


@router.get("/export/markdown")
async def export_markdown(user_id: str = Depends(get_current_user)):
    content = _build_markdown(user_id)
    filename = f"todomap-backup-{date.today().isoformat()}.md"
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
