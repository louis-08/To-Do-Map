"""Test fixtures: the FastAPI app wired to an in-memory fake of the Supabase
client (tests/fake_db.py), so routers are tested without network or credentials.

The authenticated user comes from the `X-Test-User` header (default USER_ID),
which makes isolation between users testable."""

import os

import pytest
from fastapi import Header
from fastapi.testclient import TestClient

os.environ.setdefault("CLERK_JWKS_URL", "https://example.invalid/.well-known/jwks.json")

from fake_db import FakeDB  # noqa: E402

USER_ID = "user_a"


@pytest.fixture
def db(monkeypatch) -> FakeDB:
    fake = FakeDB()
    # Routers bind `get_db` by name at import time, so patch each module.
    from routers import account, export, objectives, projects, rollover, settings, tasks, trash

    for module in (account, export, objectives, projects, rollover, settings, tasks, trash):
        monkeypatch.setattr(module, "get_db", lambda: fake)
    return fake


@pytest.fixture
def client(db):
    from auth import get_current_user
    from main import app

    async def fake_user(x_test_user: str = Header(default=USER_ID)) -> str:
        return x_test_user

    app.dependency_overrides[get_current_user] = fake_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def as_user(user: str) -> dict:
    return {"X-Test-User": user}
