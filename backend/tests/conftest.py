"""Test fixtures: the FastAPI app wired to an in-memory fake of the Supabase
client, so router behaviour can be tested without network or credentials."""

import copy
import datetime
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

USER_ID = "user_test"


class FakeQuery:
    """Minimal fluent query builder covering the calls the routers use."""

    def __init__(self, rows: list[dict], defaults: dict | None = None):
        self._rows = rows
        self._defaults = defaults or {}
        self._op = "select"
        self._payload: dict | None = None
        self._filters: list = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._single = False

    # --- operations -------------------------------------------------------
    def select(self, _cols: str = "*"):
        self._op = "select"
        return self

    def insert(self, row: dict):
        self._op = "insert"
        self._payload = row
        return self

    def update(self, patch: dict):
        self._op = "update"
        self._payload = patch
        return self

    def delete(self):
        self._op = "delete"
        return self

    # --- filters / modifiers ---------------------------------------------
    def eq(self, key, value):
        self._filters.append(lambda r: r.get(key) == value)
        return self

    def in_(self, key, values):
        self._filters.append(lambda r: r.get(key) in values)
        return self

    def gte(self, key, value):
        self._filters.append(lambda r: r.get(key) >= value)
        return self

    def lte(self, key, value):
        self._filters.append(lambda r: r.get(key) <= value)
        return self

    def order(self, key, desc: bool = False):
        self._order = (key, desc)
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def single(self):
        self._single = True
        return self

    # --- execution --------------------------------------------------------
    def _matching(self) -> list[dict]:
        rows = [r for r in self._rows if all(f(r) for f in self._filters)]
        if self._order:
            key, desc = self._order
            rows = sorted(rows, key=lambda r: r[key], reverse=desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        return rows

    def execute(self):
        if self._op == "insert":
            row = copy.deepcopy(self._payload)
            row.setdefault("id", str(uuid.uuid4()))
            # Column defaults that Postgres would fill in (e.g. `deleted_at`).
            for key, factory in self._defaults.items():
                row.setdefault(key, factory())
            self._rows.append(row)
            return SimpleNamespace(data=[copy.deepcopy(row)])

        matched = self._matching()
        if self._op == "update":
            for r in matched:
                r.update(copy.deepcopy(self._payload))
        elif self._op == "delete":
            for r in matched:
                self._rows.remove(r)

        data = copy.deepcopy(matched)
        if self._single:
            return SimpleNamespace(data=data[0] if data else None)
        return SimpleNamespace(data=data)


class FakeDB:
    def __init__(self):
        self.tables: dict[str, list[dict]] = {
            "tasks": [],
            "deleted_tasks": [],
            "weekly_objectives": [],
        }

    _DEFAULTS = {
        "tasks": {"created_at": lambda: datetime.datetime.now(datetime.UTC).isoformat()},
        "deleted_tasks": {"deleted_at": lambda: datetime.datetime.now(datetime.UTC).isoformat()},
    }

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables.setdefault(name, []), self._DEFAULTS.get(name))


@pytest.fixture
def db(monkeypatch) -> FakeDB:
    fake = FakeDB()
    # Routers bind `get_db` by name at import time, so patch each module.
    from routers import export, tasks, trash

    for module in (tasks, trash, export):
        monkeypatch.setattr(module, "get_db", lambda: fake)
    return fake


@pytest.fixture
def client(db):
    from auth import get_current_user
    from main import app

    app.dependency_overrides[get_current_user] = lambda: USER_ID
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
