from pydantic import BaseModel
from typing import Optional
import datetime


class TaskCreate(BaseModel):
    date: datetime.date
    text: str
    color: Optional[str] = None
    position: int
    is_weekly_objective: bool = False


class TaskUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    color: Optional[str] = None
    position: Optional[int] = None
    date: Optional[datetime.date] = None
    is_weekly_objective: Optional[bool] = None


class ReorderItem(BaseModel):
    id: str
    date: datetime.date
    position: int
    is_weekly_objective: Optional[bool] = None


class ReorderRequest(BaseModel):
    updates: list[ReorderItem]


class ObjectiveUpsert(BaseModel):
    text: str
