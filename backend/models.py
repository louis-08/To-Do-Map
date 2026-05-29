from pydantic import BaseModel
from typing import Optional
from datetime import date


class TaskCreate(BaseModel):
    date: date
    text: str
    color: Optional[str] = None
    position: int
    is_weekly_objective: bool = False


class TaskUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    color: Optional[str] = None
    position: Optional[int] = None
    date: Optional[date] = None
    is_weekly_objective: Optional[bool] = None


class ReorderItem(BaseModel):
    id: str
    date: date
    position: int
    is_weekly_objective: Optional[bool] = None


class ReorderRequest(BaseModel):
    updates: list[ReorderItem]


class ObjectiveUpsert(BaseModel):
    text: str
