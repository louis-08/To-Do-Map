"""Recurrence rules for tasks, modelled on calendar events.

A rule is (freq, interval, anchor): the task occurs on `anchor` and then every
`interval` days / weeks / months / years. Occurrences are always computed from
the fixed anchor, never from the previous occurrence, so a monthly rule
anchored on the 31st gives Jan 31, Feb 28, Mar 31 (month ends are clamped but
do not drift) and a task that was rolled over or dragged to another day does
not shift the schedule.
"""
import calendar
from datetime import date, timedelta
from typing import Optional

FREQS = ("day", "week", "month", "year")
INTERVAL_MAX = 999


def _add_months(d: date, months: int) -> date:
    total = d.year * 12 + (d.month - 1) + months
    year, month = divmod(total, 12)
    month += 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def occurrence(anchor: date, freq: str, interval: int, k: int) -> date:
    """The k-th occurrence (k = 0 is the anchor). Raises OverflowError/ValueError past year 9999."""
    if freq == "day":
        return anchor + timedelta(days=interval * k)
    if freq == "week":
        return anchor + timedelta(weeks=interval * k)
    if freq == "month":
        return _add_months(anchor, interval * k)
    if freq == "year":
        return _add_months(anchor, 12 * interval * k)
    raise ValueError(f"unknown frequency: {freq!r}")


def next_occurrence(anchor: date, freq: str, interval: int, after: date) -> Optional[date]:
    """First occurrence strictly after `after`, or None when the date range is exhausted."""
    step_days = {"day": interval, "week": 7 * interval}.get(freq)
    # Start a little below the answer and walk up; month lengths vary, so the
    # estimate is conservative (365/12 days per month, 366 per year).
    if step_days:
        k = max(0, (after - anchor).days // step_days - 1)
    else:
        months = interval * (12 if freq == "year" else 1)
        k = max(0, ((after - anchor).days // 31) // months - 1)
    try:
        while True:
            d = occurrence(anchor, freq, interval, k)
            if d > after:
                return d
            k += 1
    except (OverflowError, ValueError):
        return None
