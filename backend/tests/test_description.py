import pytest

from routers.export import _task_line


def _create(client, **extra):
    body = {"date": "2026-10-26", "text": "t", "position": 0, **extra}
    r = client.post("/api/tasks", json=body)
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_description_defaults_to_empty(client, db):
    assert _create(client)["description"] == ""
    assert db.tables["tasks"][0]["description"] == ""


def test_create_with_description_keeps_newlines(client):
    text = "line 1\nline 2\n\n  indented"
    assert _create(client, description=text)["description"] == text


@pytest.mark.parametrize("blank", ["", " ", "\n\t  \n"])
def test_blank_description_is_stored_as_empty(client, blank):
    assert _create(client, description=blank)["description"] == ""


def test_description_length_limit(client):
    assert _create(client, description="a" * 10000)["description"] == "a" * 10000
    body = {"date": "2026-10-26", "text": "t", "position": 0, "description": "a" * 10001}
    assert client.post("/api/tasks", json=body).status_code == 422
    t = _create(client)
    assert client.patch(f"/api/tasks/{t['id']}", json={"description": "a" * 10001}).status_code == 422


def test_patch_set_clear_and_leave_untouched(client):
    t = _create(client)
    url = f"/api/tasks/{t['id']}"
    assert client.patch(url, json={"description": "notes"}).json()["data"]["description"] == "notes"
    # Unrelated patch and explicit null leave it untouched (legacy null rule).
    assert client.patch(url, json={"done": True}).json()["data"]["description"] == "notes"
    assert client.patch(url, json={"description": None}).json()["data"]["description"] == "notes"
    # Whitespace-only and "" remove it.
    assert client.patch(url, json={"description": "  \n"}).json()["data"]["description"] == ""
    client.patch(url, json={"description": "again"})
    assert client.patch(url, json={"description": ""}).json()["data"]["description"] == ""


def test_description_does_not_leak_between_users(client, db):
    t = _create(client, description="secret")
    r = client.patch(f"/api/tasks/{t['id']}", json={"description": "x"}, headers={"X-Test-User": "user_b"})
    assert r.json()["data"] is None
    assert db.tables["tasks"][0]["description"] == "secret"


def test_reorder_keeps_description(client, db):
    t = _create(client, description="keep")
    client.patch("/api/tasks/reorder", json={"updates": [{"id": t["id"], "date": "2026-10-28", "position": 0}]})
    assert db.tables["tasks"][0]["description"] == "keep"


def test_trash_round_trip_keeps_description(client, db):
    t = _create(client, description="a\nb")
    client.delete(f"/api/tasks/{t['id']}")
    assert db.tables["deleted_tasks"][0]["description"] == "a\nb"
    client.post(f"/api/trash/{t['id']}/restore")
    assert db.tables["tasks"][0]["description"] == "a\nb"


def test_restore_of_row_trashed_before_migration(client, db):
    db.tables["deleted_tasks"].append(
        {"id": "legacy", "user_id": "user_a", "date": "2026-10-20", "text": "old", "color": None}
    )
    assert client.post("/api/trash/legacy/restore").status_code == 200
    assert db.tables["tasks"][0]["description"] == ""


def test_export_appends_description_as_indented_quote():
    assert _task_line({"done": False, "text": "a", "description": ""}) == "- [ ] a"
    assert _task_line({"done": False, "text": "a"}) == "- [ ] a"
    assert _task_line({"done": True, "text": "a", "description": "x\n\ny"}) == "- [x] a\n  > x\n  >\n  > y"
