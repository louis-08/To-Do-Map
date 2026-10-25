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


class TaskUpdate(BaseModel):
    text: Optional[str] = Field(default=None, max_length=2000)
    done: Optional[bool] = None
    color: Optional[str] = Field(default=None, max_length=50)
    position: Optional[int] = None
    date: Optional[datetime.date] = None
    is_weekly_objective: Optional[bool] = None
    scope: Optional[str] = None
    # Explicit null clears the project. Omitted = unchanged.
    project_id: Optional[str] = None


# Fields where an explicitly sent null is meaningful (clear the value).
# For all other TaskUpdate fields null keeps the legacy meaning "unchanged",
# so existing clients (e.g. the MCP server) that send nulls are unaffected.
NULLABLE_TASK_FIELDS = {"project_id"}


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
