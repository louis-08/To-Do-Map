import datetime

import pytest
from pydantic import ValidationError

from conftest import USER_ID
from models import TaskCreate, TaskUpdate
from routers.export import _build_markdown, _task_line


# --------------------------------------------------------------------------
# Model layer: omitted vs. explicit null is the core of the deadline contract
# --------------------------------------------------------------------------
class TestTaskUpdatePatch:
    def test_omitted_deadline_is_left_untouched(self):
        patch = TaskUpdate(done=True).to_patch()
        assert patch == {"done": True}
        assert "deadline" not in patch

    def test_deadline_is_serialised_as_iso_string(self):
        patch = TaskUpdate(deadline="2026-12-24").to_patch()
        assert patch == {"deadline": "2026-12-24"}

    def test_explicit_null_clears_the_deadline(self):
        patch = TaskUpdate.model_validate({"deadline": None}).to_patch()
        assert patch == {"deadline": None}

    def test_deadline_combines_with_other_fields(self):
        patch = TaskUpdate(text="x", deadline="2026-11-01", date="2026-10-30").to_patch()
        assert patch == {"text": "x", "deadline": "2026-11-01", "date": "2026-10-30"}

    def test_other_none_fields_keep_historical_behaviour(self):
        # `color: null` was ignored before deadlines existed; it must stay that way.
        patch = TaskUpdate.model_validate({"color": None, "done": False}).to_patch()
        assert patch == {"done": False}

    @pytest.mark.parametrize("bad", ["not-a-date", "2026-13-01", "2026-02-30", 5])
    def test_invalid_deadline_is_rejected(self, bad):
        with pytest.raises(ValidationError):
            TaskUpdate.model_validate({"deadline": bad})


class TestTaskCreate:
    def test_deadline_defaults_to_none(self):
        t = TaskCreate(date="2026-10-25", text="a", position=0)
        assert t.deadline is None

    def test_deadline_is_parsed(self):
        t = TaskCreate(date="2026-10-25", text="a", position=0, deadline="2026-11-02")
        assert t.deadline == datetime.date(2026, 11, 2)


# --------------------------------------------------------------------------
# Router layer (FastAPI + in-memory DB)
# --------------------------------------------------------------------------
def _create(client, **extra):
    body = {"date": "2026-10-25", "text": "Write report", "position": 0, **extra}
    res = client.post("/api/tasks", json=body)
    assert res.status_code == 200, res.text
    return res.json()["data"]


class TestTaskRoutes:
    def test_create_without_deadline_stores_null(self, client, db):
        task = _create(client)
        assert task["deadline"] is None
        assert db.tables["tasks"][0]["deadline"] is None

    def test_create_with_deadline(self, client):
        task = _create(client, deadline="2026-11-15")
        assert task["deadline"] == "2026-11-15"

    def test_set_deadline_on_existing_task(self, client, db):
        task = _create(client)
        res = client.patch(f"/api/tasks/{task['id']}", json={"deadline": "2026-12-01"})
        assert res.status_code == 200
        assert res.json()["data"]["deadline"] == "2026-12-01"
        assert db.tables["tasks"][0]["deadline"] == "2026-12-01"

    def test_clear_deadline_with_explicit_null(self, client, db):
        task = _create(client, deadline="2026-11-15")
        res = client.patch(f"/api/tasks/{task['id']}", json={"deadline": None})
        assert res.status_code == 200
        assert res.json()["data"]["deadline"] is None
        assert db.tables["tasks"][0]["deadline"] is None

    @pytest.mark.parametrize(
        "patch",
        [{"done": True}, {"text": "renamed"}, {"color": "red"}, {"position": 3}],
    )
    def test_unrelated_patch_does_not_touch_deadline(self, client, db, patch):
        task = _create(client, deadline="2026-11-15")
        client.patch(f"/api/tasks/{task['id']}", json=patch)
        assert db.tables["tasks"][0]["deadline"] == "2026-11-15"

    def test_moving_a_task_keeps_its_deadline(self, client, db):
        task = _create(client, deadline="2026-11-15")
        client.patch(
            "/api/tasks/reorder",
            json={"updates": [{"id": task["id"], "date": "2026-10-28", "position": 0}]},
        )
        row = db.tables["tasks"][0]
        assert row["date"] == "2026-10-28"
        assert row["deadline"] == "2026-11-15"

    def test_invalid_deadline_returns_422(self, client):
        task = _create(client)
        res = client.patch(f"/api/tasks/{task['id']}", json={"deadline": "tomorrow"})
        assert res.status_code == 422

    def test_list_returns_deadline(self, client):
        _create(client, deadline="2026-11-15")
        res = client.get("/api/tasks", params={"start": "2026-10-01", "end": "2026-10-31"})
        assert res.json()["data"][0]["deadline"] == "2026-11-15"

    def test_other_users_task_is_not_patched(self, client, db):
        task = _create(client)
        db.tables["tasks"][0]["user_id"] = "someone_else"
        client.patch(f"/api/tasks/{task['id']}", json={"deadline": "2026-12-01"})
        assert db.tables["tasks"][0].get("deadline") is None


class TestTrashRoundTrip:
    def test_delete_then_restore_preserves_deadline(self, client, db):
        task = _create(client, deadline="2026-11-15")

        assert client.delete(f"/api/tasks/{task['id']}").status_code == 200
        assert db.tables["tasks"] == []
        assert db.tables["deleted_tasks"][0]["deadline"] == "2026-11-15"

        assert client.post(f"/api/trash/{task['id']}/restore").status_code == 200
        restored = db.tables["tasks"][0]
        assert restored["deadline"] == "2026-11-15"
        assert restored["user_id"] == USER_ID
        assert db.tables["deleted_tasks"] == []

    def test_restore_of_legacy_row_without_deadline_column(self, client, db):
        # Rows trashed before the migration have no `deadline` key at all.
        db.tables["deleted_tasks"].append(
            {"id": "legacy", "user_id": USER_ID, "date": "2026-10-20", "text": "old", "color": None}
        )
        assert client.post("/api/trash/legacy/restore").status_code == 200
        assert db.tables["tasks"][0]["deadline"] is None


class TestExport:
    def test_task_line_without_deadline(self):
        assert _task_line({"done": False, "text": "a"}) == "- [ ] a"
        assert _task_line({"done": True, "text": "a", "deadline": None}) == "- [x] a"

    def test_task_line_with_deadline(self):
        line = _task_line({"done": False, "text": "a", "deadline": "2026-11-15"})
        assert line == "- [ ] a (Deadline: 2026-11-15)"

    def test_markdown_contains_deadline_in_every_scope(self, db):
        base = {"user_id": USER_ID, "done": False, "position": 0, "color": None}
        for i, (scope, date) in enumerate(
            [("day", "2026-10-26"), ("month", "2026-10-01"), ("quarter", "2026-10-01"), ("year", "2026-01-01")]
        ):
            db.tables["tasks"].append(
                {**base, "id": str(i), "scope": scope, "date": date,
                 "text": f"{scope}-task", "deadline": f"2026-12-0{i + 1}"}
            )
        md = _build_markdown(USER_ID)
        for i, scope in enumerate(["day", "month", "quarter", "year"]):
            assert f"- [ ] {scope}-task (Deadline: 2026-12-0{i + 1})" in md
