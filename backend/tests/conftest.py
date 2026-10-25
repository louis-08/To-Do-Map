import os

import pytest
from fastapi import Header
from fastapi.testclient import TestClient

os.environ.setdefault("CLERK_JWKS_URL", "https://example.invalid/.well-known/jwks.json")

import main  # noqa: E402
from auth import get_current_user  # noqa: E402
from routers import tasks, objectives, trash, rollover, export, account, settings, projects  # noqa: E402
from tests.fake_db import FakeDB  # noqa: E402

ROUTER_MODULES = [tasks, objectives, trash, rollover, export, account, settings, projects]


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    for mod in ROUTER_MODULES:
        monkeypatch.setattr(mod, "get_db", lambda: fake)
    return fake


@pytest.fixture
def client(db):
    # The user id comes from a test header so isolation between users is testable.
    async def fake_user(x_test_user: str = Header(default="user_a")) -> str:
        return x_test_user

    main.app.dependency_overrides[get_current_user] = fake_user
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def as_user(user: str) -> dict:
    return {"X-Test-User": user}
