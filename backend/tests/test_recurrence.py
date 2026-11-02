import datetime
import random

import pytest
from pydantic import ValidationError

from models import TaskCreate, TaskUpdate
from recurrence import FREQS, next_occurrence, occurrence
from routers.export import _task_line

D = datetime.date


# --------------------------------------------------------------------------
# Schedule arithmetic
# --------------------------------------------------------------------------
class TestOccurrence:
    def test_day_and_week(self):
        assert occurrence(D(2026, 10, 26), "day", 3, 2) == D(2026, 11, 1)
        assert occurrence(D(2026, 10, 26), "week", 2, 1) == D(2026, 11, 9)

    def test_month_end_is_clamped_without_drifting(self):
        got = [occurrence(D(2026, 1, 31), "month", 1, k) for k in range(5)]
        assert got == [D(2026, 1, 31), D(2026, 2, 28), D(2026, 3, 31), D(2026, 4, 30), D(2026, 5, 31)]

    def test_leap_day_yearly(self):
        assert occurrence(D(2024, 2, 29), "year", 1, 1) == D(2025, 2, 28)
        assert occurrence(D(2024, 2, 29), "year", 1, 4) == D(2028, 2, 29)

    def test_unknown_frequency(self):
        with pytest.raises(ValueError):
            occurrence(D(2026, 1, 1), "hour", 1, 1)


class TestNextOccurrence:
    def test_is_strictly_after(self):
        assert next_occurrence(D(2026, 10, 26), "week", 1, D(2026, 10, 26)) == D(2026, 11, 2)

    def test_anchor_in_the_future_is_returned(self):
        assert next_occurrence(D(2026, 12, 1), "day", 1, D(2026, 10, 1)) == D(2026, 12, 1)

    def test_skips_missed_occurrences(self):
        assert next_occurrence(D(2026, 10, 1), "day", 2, D(2026, 10, 10)) == D(2026, 10, 11)

    def test_overflow_ends_the_series(self):
        assert next_occurrence(D(9999, 12, 31), "day", 1, D(9999, 12, 31)) is None
        assert next_occurrence(D(9999, 1, 1), "year", 1, D(9999, 6, 1)) is None

    def test_matches_brute_force(self):
        rng = random.Random(7)
        for _ in range(3000):
            anchor = D(2020, 1, 1) + datetime.timedelta(days=rng.randint(0, 3000))
            freq, n = rng.choice(FREQS), rng.randint(1, 40)
            after = anchor + datetime.timedelta(days=rng.randint(-400, 6000))
            k = 0
            while occurrence(anchor, freq, n, k) <= after:
                k += 1
            assert next_occurrence(anchor, freq, n, after) == occurrence(anchor, freq, n, k)


# --------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------
class TestModels:
    def test_create_defaults_to_no_repeat(self):
        t = TaskCreate(date="2026-10-26", text="a", position=0)
        assert (t.repeat_freq, t.repeat_interval, t.repeat_until) == (None, 1, None)

    @pytest.mark.parametrize("bad", [{"repeat_freq": "hourly"}, {"repeat_interval": 0}, {"repeat_interval": 1000}])
    def test_create_rejects_invalid_rules(self, bad):
        with pytest.raises(ValidationError):
            TaskCreate(date="2026-10-26", text="a", position=0, **bad)

    def test_patch_omitted_vs_explicit_null(self):
        assert TaskUpdate(done=True).to_patch() == {"done": True}
        assert TaskUpdate.model_validate({"repeat_freq": None}).to_patch() == {"repeat_freq": None}
        assert TaskUpdate.model_validate({"repeat_until": None}).to_patch() == {"repeat_until": None}
        assert TaskUpdate(repeat_until="2027-01-01").to_patch() == {"repeat_until": "2027-01-01"}


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def fixed_today(monkeypatch):
    """Freeze `today` (Mon 26 Oct 2026) in the tasks router."""
    import routers.tasks as tasks

    class FakeDate(datetime.date):
        @classmethod
        def today(cls):
            return cls(2026, 10, 26)

    monkeypatch.setattr(tasks.datetime, "date", FakeDate)


def _create(client, **extra):
    body = {"date": "2026-10-26", "text": "Gym", "position": 0, **extra}
    res = client.post("/api/tasks", json=body)
    assert res.status_code == 200, res.text
    return res.json()["data"]


def _done(client, task_id, done=True):
    res = client.patch(f"/api/tasks/{task_id}", json={"done": done})
    assert res.status_code == 200, res.text
    return res.json()


class TestCreateAndPatch:
    def test_plain_task_has_no_rule(self, client):
        t = _create(client)
        assert (t["repeat_freq"], t["repeat_interval"], t["repeat_anchor"], t["repeat_until"]) == (None, 1, None, None)

    def test_create_stores_rule_and_anchors_on_the_date(self, client):
        t = _create(client, repeat_freq="week", repeat_interval=2, repeat_until="2027-01-01")
        assert (t["repeat_freq"], t["repeat_interval"]) == ("week", 2)
        assert (t["repeat_anchor"], t["repeat_until"]) == ("2026-10-26", "2027-01-01")

    def test_create_ignores_stray_interval_without_freq(self, client):
        t = _create(client, repeat_interval=5, repeat_until="2027-01-01")
        assert (t["repeat_interval"], t["repeat_until"]) == (1, None)

    @pytest.mark.parametrize("extra", [{"scope": "month"}, {"scope": "year"}, {"is_weekly_objective": True}])
    def test_only_day_tasks_can_repeat(self, client, extra):
        res = client.post("/api/tasks", json={"date": "2026-10-26", "text": "a", "position": 0, "repeat_freq": "day", **extra})
        assert res.status_code == 422

    def test_until_before_date_is_rejected(self, client):
        res = client.post("/api/tasks", json={"date": "2026-10-26", "text": "a", "position": 0,
                                              "repeat_freq": "day", "repeat_until": "2026-10-25"})
        assert res.status_code == 422

    def test_patch_sets_rule_and_anchors_on_current_date(self, client, db):
        t = _create(client)
        res = client.patch(f"/api/tasks/{t['id']}", json={"repeat_freq": "month", "repeat_interval": 3})
        row = res.json()["data"]
        assert (row["repeat_freq"], row["repeat_interval"], row["repeat_anchor"]) == ("month", 3, "2026-10-26")

    def test_patch_freq_alone_keeps_interval_one(self, client):
        t = _create(client)
        row = client.patch(f"/api/tasks/{t['id']}", json={"repeat_freq": "day"}).json()["data"]
        assert row["repeat_interval"] == 1

    def test_changing_the_rule_reanchors_but_changing_until_does_not(self, client):
        t = _create(client, repeat_freq="week")
        client.patch(f"/api/tasks/{t['id']}", json={"date": "2026-10-28"})
        row = client.patch(f"/api/tasks/{t['id']}", json={"repeat_until": "2027-06-01"}).json()["data"]
        assert row["repeat_anchor"] == "2026-10-26"
        row = client.patch(f"/api/tasks/{t['id']}", json={"repeat_interval": 2}).json()["data"]
        assert row["repeat_anchor"] == "2026-10-28"

    def test_explicit_null_switches_repeat_off_and_resets(self, client):
        t = _create(client, repeat_freq="week", repeat_interval=2, repeat_until="2027-01-01")
        row = client.patch(f"/api/tasks/{t['id']}", json={"repeat_freq": None}).json()["data"]
        assert (row["repeat_freq"], row["repeat_interval"], row["repeat_anchor"], row["repeat_until"]) == (None, 1, None, None)

    def test_clear_only_the_end_date(self, client):
        t = _create(client, repeat_freq="week", repeat_until="2027-01-01")
        row = client.patch(f"/api/tasks/{t['id']}", json={"repeat_until": None}).json()["data"]
        assert (row["repeat_freq"], row["repeat_until"]) == ("week", None)

    def test_interval_or_until_without_a_rule_is_rejected(self, client):
        t = _create(client)
        assert client.patch(f"/api/tasks/{t['id']}", json={"repeat_interval": 2}).status_code == 422
        assert client.patch(f"/api/tasks/{t['id']}", json={"repeat_until": "2027-01-01"}).status_code == 422

    def test_non_day_task_cannot_get_a_rule(self, client):
        t = _create(client, scope="month")
        assert client.patch(f"/api/tasks/{t['id']}", json={"repeat_freq": "day"}).status_code == 422

    def test_until_before_date_on_patch_is_rejected(self, client):
        t = _create(client, repeat_freq="day")
        assert client.patch(f"/api/tasks/{t['id']}", json={"repeat_until": "2026-10-01"}).status_code == 422

    def test_patch_of_unknown_task(self, client):
        res = client.patch("/api/tasks/nope", json={"done": True})
        assert res.status_code == 200 and res.json()["data"] is None


class TestCompletion:
    def test_completing_creates_the_next_occurrence(self, client, db):
        t = _create(client, repeat_freq="week", project_id=None, priority="high",
                    description="bring towel", deadline="2026-10-30")
        body = _done(client, t["id"])
        nxt = body["spawned"]
        assert body["data"]["done"] is True
        assert nxt["date"] == "2026-11-02"
        assert nxt["done"] is False
        assert (nxt["text"], nxt["priority"], nxt["description"]) == ("Gym", "high", "bring towel")
        assert nxt["deadline"] == "2026-11-06"  # same lead time as the original
        assert (nxt["repeat_freq"], nxt["repeat_interval"], nxt["repeat_anchor"]) == ("week", 1, "2026-10-26")
        assert nxt["repeat_from_id"] == t["id"]
        assert len(db.tables["tasks"]) == 2

    def test_non_repeating_task_spawns_nothing(self, client, db):
        t = _create(client)
        assert _done(client, t["id"])["spawned"] is None
        assert len(db.tables["tasks"]) == 1

    def test_other_edits_do_not_spawn(self, client, db):
        t = _create(client, repeat_freq="day")
        client.patch(f"/api/tasks/{t['id']}", json={"text": "renamed"})
        assert len(db.tables["tasks"]) == 1

    def test_toggling_done_repeatedly_never_duplicates(self, client, db):
        t = _create(client, repeat_freq="day")
        _done(client, t["id"])
        _done(client, t["id"], done=False)
        _done(client, t["id"])
        assert len(db.tables["tasks"]) == 2

    def test_undo_removes_the_untouched_successor(self, client, db):
        t = _create(client, repeat_freq="day")
        _done(client, t["id"])
        _done(client, t["id"], done=False)
        assert [r["id"] for r in db.tables["tasks"]] == [t["id"]]

    def test_undo_keeps_a_successor_that_is_already_done(self, client, db):
        t = _create(client, repeat_freq="day")
        nxt = _done(client, t["id"])["spawned"]
        _done(client, nxt["id"])
        _done(client, t["id"], done=False)
        assert nxt["id"] in {r["id"] for r in db.tables["tasks"]}

    def test_late_completion_skips_past_occurrences(self, client):
        # Daily task from 20 Oct finished on Mon 26 Oct: next is the 27th, not the 21st.
        t = _create(client, date="2026-10-20", repeat_freq="day")
        assert _done(client, t["id"])["spawned"]["date"] == "2026-10-27"

    def test_rolled_over_task_stays_on_its_schedule(self, client):
        # Weekly on Thursdays (anchor 22 Oct), rolled over to Mon 26 Oct, done there:
        # next occurrence is Thu 29 Oct.
        t = _create(client, date="2026-10-22", repeat_freq="week")
        client.patch(f"/api/tasks/{t['id']}", json={"date": "2026-10-26"})
        assert _done(client, t["id"])["spawned"]["date"] == "2026-10-29"

    def test_early_completion_does_not_pull_the_series_forward(self, client):
        t = _create(client, date="2026-10-30", repeat_freq="week")
        assert _done(client, t["id"])["spawned"]["date"] == "2026-11-06"

    def test_series_ends_after_until(self, client, db):
        t = _create(client, repeat_freq="week", repeat_until="2026-11-02")
        nxt = _done(client, t["id"])["spawned"]
        assert nxt["date"] == "2026-11-02"  # until is inclusive
        assert _done(client, nxt["id"])["spawned"] is None
        assert len(db.tables["tasks"]) == 2

    def test_new_task_is_appended_to_the_target_day(self, client, db):
        _create(client, date="2026-11-02", text="other", position=4)
        t = _create(client, repeat_freq="week")
        assert _done(client, t["id"])["spawned"]["position"] == 5

    def test_monthly_on_the_31st_does_not_drift(self, client):
        t = _create(client, date="2026-01-31", repeat_freq="month")
        # Completed on 26 Oct 2026: walk the chain; each date is clamped from the 31st anchor.
        cur, seen = _done(client, t["id"])["spawned"], []
        for _ in range(4):
            seen.append(cur["date"])
            cur = _done(client, cur["id"])["spawned"]
        assert seen == ["2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31"]

    def test_task_moved_to_weekly_objective_stops_the_series(self, client, db):
        t = _create(client, repeat_freq="day")
        client.patch("/api/tasks/reorder", json={"updates": [
            {"id": t["id"], "date": "2026-10-26", "position": 0, "is_weekly_objective": True}]})
        assert _done(client, t["id"])["spawned"] is None

    def test_other_users_task_is_untouched(self, client, db):
        t = _create(client, repeat_freq="day")
        db.tables["tasks"][0]["user_id"] = "someone_else"
        res = client.patch(f"/api/tasks/{t['id']}", json={"done": True})
        assert res.json()["data"] is None
        assert len(db.tables["tasks"]) == 1


class TestTrashAndExport:
    def test_trash_round_trip_keeps_the_rule(self, client, db):
        t = _create(client, repeat_freq="month", repeat_interval=2, repeat_until="2027-12-01")
        client.delete(f"/api/tasks/{t['id']}")
        assert db.tables["deleted_tasks"][0]["repeat_freq"] == "month"
        client.post(f"/api/trash/{t['id']}/restore")
        row = db.tables["tasks"][0]
        assert (row["repeat_freq"], row["repeat_interval"], row["repeat_anchor"], row["repeat_until"]) == (
            "month", 2, "2026-10-26", "2027-12-01")

    def test_restore_of_legacy_row_has_no_rule(self, client, db):
        db.tables["deleted_tasks"].append(
            {"id": "legacy", "user_id": "user_a", "date": "2026-10-20", "text": "old", "color": None})
        client.post("/api/trash/legacy/restore")
        assert db.tables["tasks"][0]["repeat_freq"] is None

    @pytest.mark.parametrize("rule,expected", [
        ({"repeat_freq": "day", "repeat_interval": 1}, " (Repeats: every day)"),
        ({"repeat_freq": "week", "repeat_interval": 2}, " (Repeats: every 2 weeks)"),
        ({"repeat_freq": "month", "repeat_interval": 1, "repeat_until": "2027-01-01"},
         " (Repeats: every month, until 2027-01-01)"),
    ])
    def test_export_line(self, rule, expected):
        assert _task_line({"done": False, "text": "a", **rule}) == "- [ ] a" + expected

    def test_export_line_without_rule(self):
        assert _task_line({"done": False, "text": "a", "repeat_freq": None}) == "- [ ] a"
