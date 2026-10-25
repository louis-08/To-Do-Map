from pydantic import BaseModel, Field
from typing import Optional
import datetime


class TaskCreate(BaseModel):
    date: datetime.date
    text: str = Field(max_length=2000)
    color: Optional[str] = Field(default=None, max_length=50)
    position: int
    is_weekly_objective: bool = False
    scope: str = "day"
    project_id: Optional[str] = None  # None = "(kein Projekt)"
    deadline: Optional[datetime.date] = None


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
        return patch


# Fields where an explicitly sent null is meaningful (clear the value).
NULLABLE_TASK_FIELDS = {"project_id", "deadline"}


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
