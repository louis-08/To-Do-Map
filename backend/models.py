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


class TaskUpdate(BaseModel):
    text: Optional[str] = Field(default=None, max_length=2000)
    done: Optional[bool] = None
    color: Optional[str] = Field(default=None, max_length=50)
    position: Optional[int] = None
    date: Optional[datetime.date] = None
    is_weekly_objective: Optional[bool] = None
    scope: Optional[str] = None


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
