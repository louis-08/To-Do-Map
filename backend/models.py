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
    deadline: Optional[datetime.date] = None


class TaskUpdate(BaseModel):
    text: Optional[str] = Field(default=None, max_length=2000)
    done: Optional[bool] = None
    color: Optional[str] = Field(default=None, max_length=50)
    position: Optional[int] = None
    date: Optional[datetime.date] = None
    is_weekly_objective: Optional[bool] = None
    scope: Optional[str] = None
    # `null` means "clear the deadline"; an omitted key means "leave unchanged".
    # The two are told apart via `model_fields_set` in `to_patch`.
    deadline: Optional[datetime.date] = None

    def to_patch(self) -> dict:
        """Build the column patch for Supabase.

        Existing fields keep their historical behaviour (None = untouched).
        `deadline` is the only field that can be explicitly cleared.
        """
        patch = {k: v for k, v in self.model_dump().items() if v is not None and k != "deadline"}
        if "date" in patch:
            patch["date"] = str(patch["date"])
        if "deadline" in self.model_fields_set:
            patch["deadline"] = str(self.deadline) if self.deadline is not None else None
        return patch


class ReorderItem(BaseModel):
    id: str
    date: datetime.date
    position: int
    is_weekly_objective: Optional[bool] = None
    scope: Optional[str] = None


class ReorderRequest(BaseModel):
    updates: list[ReorderItem]


class ObjectiveUpsert(BaseModel):
    text: str = Field(max_length=2000)


class SettingsUpdate(BaseModel):
    auto_rollover: bool
