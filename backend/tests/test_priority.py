import pytest

from routers.export import _task_line


def _create(client, **extra):
    body = {"date": "2026-10-26", "text": "t", "position": 0, **extra}
    r = client.post("/api/tasks", json=body)
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_priority_defaults_to_none(client, db):
    task = _create(client)
    assert task["priority"] == "none"
    assert db.tables["tasks"][0]["priority"] == "none"


@pytest.mark.parametrize("prio", ["none", "medium", "high"])
def test_create_with_each_priority(client, prio):
    assert _create(client, priority=prio)["priority"] == prio


@pytest.mark.parametrize("bad", ["low", "HIGH", "", 1, "red"])
def test_invalid_priority_is_rejected(client, bad):
    body = {"date": "2026-10-26", "text": "t", "position": 0, "priority": bad}
    assert client.post("/api/tasks", json=body).status_code == 422
    t = _create(client)
    assert client.patch(f"/api/tasks/{t['id']}", json={"priority": bad}).status_code == 422


def test_patch_priority_and_reset_to_none(client):
    t = _create(client)
    assert client.patch(f"/api/tasks/{t['id']}", json={"priority": "high"}).json()["data"]["priority"] == "high"
    # Unrelated patch and explicit null leave it untouched (legacy null rule).
    assert client.patch(f"/api/tasks/{t['id']}", json={"done": True}).json()["data"]["priority"] == "high"
    assert client.patch(f"/api/tasks/{t['id']}", json={"priority": None}).json()["data"]["priority"] == "high"
    # "none" is how a priority is removed.
    assert client.patch(f"/api/tasks/{t['id']}", json={"priority": "none"}).json()["data"]["priority"] == "none"


def test_reorder_keeps_priority(client, db):
    t = _create(client, priority="medium")
    client.patch("/api/tasks/reorder", json={"updates": [{"id": t["id"], "date": "2026-10-28", "position": 0}]})
    assert db.tables["tasks"][0]["priority"] == "medium"


def test_trash_round_trip_keeps_priority(client, db):
    t = _create(client, priority="high")
    client.delete(f"/api/tasks/{t['id']}")
    assert db.tables["deleted_tasks"][0]["priority"] == "high"
    client.post(f"/api/trash/{t['id']}/restore")
    assert db.tables["tasks"][0]["priority"] == "high"


def test_restore_of_row_trashed_before_migration(client, db):
    db.tables["deleted_tasks"].append(
        {"id": "legacy", "user_id": "user_a", "date": "2026-10-20", "text": "old", "color": "red"}
    )
    assert client.post("/api/trash/legacy/restore").status_code == 200
    assert db.tables["tasks"][0]["priority"] == "none"


def test_export_marks_medium_and_high_only():
    assert _task_line({"done": False, "text": "a", "priority": "none"}) == "- [ ] a"
    assert _task_line({"done": False, "text": "a", "priority": "medium"}) == "- [ ] a (Priority: medium)"
    assert _task_line({"done": False, "text": "a", "priority": "high", "deadline": "2026-11-01"}) == \
        "- [ ] a (Priority: high) (Deadline: 2026-11-01)"
