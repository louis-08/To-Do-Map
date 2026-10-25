from tests.conftest import as_user


def make_project(client, name="Uni", color=None, user="user_a"):
    r = client.post("/api/projects", json={"name": name, "color": color}, headers=as_user(user))
    assert r.status_code == 200, r.text
    return r.json()["data"]


def make_task(client, project_id=None, date="2026-10-26", text="t", user="user_a", **extra):
    body = {"date": date, "text": text, "color": None, "position": 0,
            "is_weekly_objective": False, "project_id": project_id, **extra}
    r = client.post("/api/tasks", json=body, headers=as_user(user))
    assert r.status_code == 200, r.text
    return r.json()["data"]


def list_tasks(client, user="user_a"):
    return client.get("/api/tasks?start=2026-01-01&end=2031-12-31", headers=as_user(user)).json()["data"]


# ---------------------------------------------------------------- projects CRUD

def test_create_and_list_projects_in_creation_order(client):
    a = make_project(client, "  Uni  ", "blue")
    b = make_project(client, "SICK")
    assert a["name"] == "Uni"            # trimmed
    assert (a["position"], b["position"]) == (0, 1)
    names = [p["name"] for p in client.get("/api/projects").json()["data"]]
    assert names == ["Uni", "SICK"]


def test_project_name_validation(client):
    assert client.post("/api/projects", json={"name": ""}).status_code == 422
    assert client.post("/api/projects", json={"name": "   "}).status_code == 422
    assert client.post("/api/projects", json={"name": "x" * 61}).status_code == 422


def test_update_project_name_and_color_semantics(client):
    p = make_project(client, "Uni", "blue")
    r = client.patch(f"/api/projects/{p['id']}", json={"name": "Studium"})
    assert r.json()["data"]["name"] == "Studium"
    assert r.json()["data"]["color"] == "blue"          # omitted color = unchanged
    r = client.patch(f"/api/projects/{p['id']}", json={"color": None})
    assert r.json()["data"]["color"] is None             # explicit null clears
    assert client.patch(f"/api/projects/{p['id']}", json={}).status_code == 422


def test_order_projects(client):
    a, b, c = (make_project(client, n) for n in "ABC")
    assert client.put("/api/projects/order", json={"ids": [c["id"], a["id"], b["id"]]}).status_code == 200
    names = [p["name"] for p in client.get("/api/projects").json()["data"]]
    assert names == ["C", "A", "B"]


# ---------------------------------------------------------------- soft delete

def test_delete_project_keeps_tasks_assigned(client):
    p = make_project(client, "Uni")
    t = make_task(client, p["id"])
    r = client.delete(f"/api/projects/{p['id']}")
    assert r.status_code == 200
    assert r.json()["data"]["deleted_at"] is not None

    # Project is still listed (for labels) but marked deleted.
    listed = client.get("/api/projects").json()["data"]
    assert listed[0]["id"] == p["id"] and listed[0]["deleted_at"] is not None

    # The task keeps its project.
    assert list_tasks(client)[0]["project_id"] == p["id"]
    assert list_tasks(client)[0]["id"] == t["id"]

    # Deleting twice is a 404.
    assert client.delete(f"/api/projects/{p['id']}").status_code == 404


def test_deleted_project_can_still_be_used_for_existing_lane_moves(client):
    p = make_project(client, "Uni")
    t = make_task(client)
    client.delete(f"/api/projects/{p['id']}")
    r = client.patch("/api/tasks/reorder", json={"updates": [
        {"id": t["id"], "date": "2026-10-27", "position": 0, "project_id": p["id"]}]})
    assert r.status_code == 200
    assert list_tasks(client)[0]["project_id"] == p["id"]


# ---------------------------------------------------------------- isolation

def test_users_cannot_touch_foreign_projects(client):
    p = make_project(client, "Secret", user="user_a")
    assert client.get("/api/projects", headers=as_user("user_b")).json()["data"] == []
    assert client.patch(f"/api/projects/{p['id']}", json={"name": "x"}, headers=as_user("user_b")).status_code == 404
    assert client.delete(f"/api/projects/{p['id']}", headers=as_user("user_b")).status_code == 404
    assert client.put("/api/projects/order", json={"ids": [p["id"]]}, headers=as_user("user_b")).status_code == 400
    # Nor assign it to their own tasks.
    body = {"date": "2026-10-26", "text": "t", "color": None, "position": 0,
            "is_weekly_objective": False, "project_id": p["id"]}
    assert client.post("/api/tasks", json=body, headers=as_user("user_b")).status_code == 400
    own = make_task(client, user="user_b")
    assert client.patch(f"/api/tasks/{own['id']}", json={"project_id": p["id"]},
                        headers=as_user("user_b")).status_code == 400
    assert client.patch("/api/tasks/reorder", json={"updates": [
        {"id": own["id"], "date": "2026-10-26", "position": 0, "project_id": p["id"]}]},
        headers=as_user("user_b")).status_code == 400


# ---------------------------------------------------------------- task assignment

def test_task_create_with_and_without_project(client):
    p = make_project(client)
    assert make_task(client, p["id"])["project_id"] == p["id"]
    assert make_task(client, None)["project_id"] is None
    # Omitting the field entirely (legacy clients) = no project.
    r = client.post("/api/tasks", json={"date": "2026-10-26", "text": "x", "position": 0})
    assert r.json()["data"]["project_id"] is None


def test_task_patch_project_null_semantics(client):
    p = make_project(client)
    t = make_task(client)
    tid = t["id"]
    assert client.patch(f"/api/tasks/{tid}", json={"project_id": p["id"]}).json()["data"]["project_id"] == p["id"]
    # Omitted project_id = unchanged.
    assert client.patch(f"/api/tasks/{tid}", json={"done": True}).json()["data"]["project_id"] == p["id"]
    # Other fields keep the legacy "null = unchanged" meaning.
    r = client.patch(f"/api/tasks/{tid}", json={"text": None, "color": None, "date": None})
    assert r.json()["data"]["text"] == "t"
    assert r.json()["data"]["project_id"] == p["id"]
    # Explicit null project = "(kein Projekt)".
    assert client.patch(f"/api/tasks/{tid}", json={"project_id": None}).json()["data"]["project_id"] is None


def test_reorder_project_semantics(client):
    p = make_project(client)
    t = make_task(client, p["id"])
    # No project_id key -> unchanged.
    client.patch("/api/tasks/reorder", json={"updates": [{"id": t["id"], "date": "2026-10-28", "position": 3}]})
    row = list_tasks(client)[0]
    assert (row["date"], row["position"], row["project_id"]) == ("2026-10-28", 3, p["id"])
    # Explicit null -> no project.
    client.patch("/api/tasks/reorder", json={"updates": [
        {"id": t["id"], "date": "2026-10-28", "position": 0, "project_id": None}]})
    assert list_tasks(client)[0]["project_id"] is None


# ---------------------------------------------------------------- trash / export / account

def test_trash_restore_is_lossless(client):
    p = make_project(client)
    t = make_task(client, p["id"], date="2026-11-01", scope="month")
    w = make_task(client, p["id"], date="2026-10-26", is_weekly_objective=True)
    for task in (t, w):
        assert client.delete(f"/api/tasks/{task['id']}").json() == {"data": "ok"}
    trash = client.get("/api/trash").json()["data"]
    assert {r["project_id"] for r in trash} == {p["id"]}
    for task in (t, w):
        client.post(f"/api/trash/{task['id']}/restore")
    rows = {r["id"]: r for r in list_tasks(client)}
    assert rows[t["id"]]["scope"] == "month" and rows[t["id"]]["project_id"] == p["id"]
    assert rows[w["id"]]["is_weekly_objective"] is True and rows[w["id"]]["project_id"] == p["id"]


def test_export_labels_tasks_with_project_even_after_delete(client):
    p = make_project(client, "Uni")
    make_task(client, p["id"], text="Lernen")
    make_task(client, None, text="Einkaufen")
    client.delete(f"/api/projects/{p['id']}")
    md = client.get("/api/export/markdown").text
    assert "- [ ] Lernen `[Uni]`" in md
    assert "- [ ] Einkaufen\n" in md + "\n"


def test_account_delete_removes_projects(client, db):
    make_project(client)
    make_task(client)
    client.delete("/api/account")
    assert db.rows("projects") == [] and db.rows("tasks") == []
