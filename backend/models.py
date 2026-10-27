from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
import datetime

from recurrence import INTERVAL_MAX

# Task priority. "none" is the default; "medium" is shown yellow, "high" red.
Priority = Literal["none", "medium", "high"]

# Recurrence unit: the task repeats every `repeat_interval` days / weeks / months / years.
RepeatFreq = Literal["day", "week", "month", "year"]

DESCRIPTION_MAX = 10000


def _clean_description(value: Optional[str]) -> Optional[str]:
    """Whitespace-only text counts as "no description" and is stored as ''."""
    if value is None:
        return None
    return value if value.strip() else ""


class TaskCreate(BaseModel):
    date: datetime.date
    text: str = Field(max_length=2000)
    color: Optional[str] = Field(default=None, max_length=50)
    position: int
    is_weekly_objective: bool = False
    scope: str = "day"
    project_id: Optional[str] = None  # None = "(kein Projekt)"
    deadline: Optional[datetime.date] = None
    priority: Priority = "none"
    description: str = Field(default="", max_length=DESCRIPTION_MAX)
    # Recurrence (day-scope tasks only). The anchor of the schedule is `date`.
    repeat_freq: Optional[RepeatFreq] = None
    repeat_interval: int = Field(default=1, ge=1, le=INTERVAL_MAX)
    repeat_until: Optional[datetime.date] = None

    _clean_description = field_validator("description")(_clean_description)


class TaskUpdate(BaseModel):
    text: Optional[str] = Field(default=None, max_length=2000)
    done: Optional[bool] = None
    color: Optional[str] = Field(default=None, max_length=50)
    position: Optional[int] = None
    date: Optional[datetime.date] = None
    is_weekly_objective: Optional[bool] = None
    scope: Optional[str] = None
    # Explicit null clears the project ("Kein Projekt"). Omitted = unchanged.
    project_id: Optional[str] = None
    # Explicit null clears the deadline. Omitted = unchanged.
    deadline: Optional[datetime.date] = None
    # "none" resets the priority; null/omitted = unchanged.
    priority: Optional[Priority] = None
    # "" removes the description; null/omitted = unchanged (legacy null rule).
    description: Optional[str] = Field(default=None, max_length=DESCRIPTION_MAX)
    # Recurrence. Explicit null on repeat_freq switches the repetition off (and
    # resets interval/until); explicit null on repeat_until removes the end date.
    # Omitted = unchanged. The router re-anchors the schedule on every rule change.
    repeat_freq: Optional[RepeatFreq] = None
    repeat_interval: Optional[int] = Field(default=None, ge=1, le=INTERVAL_MAX)
    repeat_until: Optional[datetime.date] = None

    _clean_description = field_validator("description")(_clean_description)

    def to_patch(self) -> dict:
        """Build the column patch for Supabase.

        Legacy fields keep their historical behaviour (null = untouched), so
        existing clients such as the MCP server that send nulls are unaffected.
        Only the fields in NULLABLE_TASK_FIELDS can be explicitly cleared; for
        them omitted and null are told apart via `model_fields_set`.
        """
        patch = {
            k: v for k, v in self.model_dump().items()
            if v is not None and k not in NULLABLE_TASK_FIELDS
        }
        if "date" in patch:
            patch["date"] = str(patch["date"])
        if "project_id" in self.model_fields_set:
            patch["project_id"] = self.project_id
        if "deadline" in self.model_fields_set:
            patch["deadline"] = str(self.deadline) if self.deadline is not None else None
        if "repeat_freq" in self.model_fields_set:
            patch["repeat_freq"] = self.repeat_freq
        if "repeat_until" in self.model_fields_set:
            patch["repeat_until"] = str(self.repeat_until) if self.repeat_until is not None else None
        return patch


# Fields where an explicitly sent null is meaningful (clear the value).
NULLABLE_TASK_FIELDS = {"project_id", "deadline", "repeat_freq", "repeat_until"}


class ReorderItem(BaseModel):
    id: str
    date: datetime.date
    position: int
    is_weekly_objective: Optional[bool] = None
    scope: Optional[str] = None
    # Explicit null moves the task to "(kein Projekt)". Omitted = unchanged.
    project_id: Optional[str] = None


class ReorderRequest(BaseModel):
    updates: list[ReorderItem]


class ObjectiveUpsert(BaseModel):
    text: str = Field(max_length=2000)


class SettingsUpdate(BaseModel):
    auto_rollover: bool


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: Optional[str] = Field(default=None, max_length=50)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    # Explicit null removes the color. Omitted = unchanged.
    color: Optional[str] = Field(default=None, max_length=50)


class ProjectOrder(BaseModel):
    ids: list[str]
