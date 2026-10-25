"""In-memory stand-in for the subset of the Supabase query builder the
routers use. Lets the API be tested end-to-end without a database.

Semantics mirror PostgREST closely enough for the routers: filters are ANDed,
`execute()` returns an object with `.data`, insert/update/delete return the
affected rows, `single()` returns one row (or None) instead of a list.
"""
import copy
import uuid
from datetime import datetime, timezone

_NOW = lambda: datetime.now(timezone.utc).isoformat()  # noqa: E731

DEFAULTS = {
    "tasks": lambda: {
        "id": str(uuid.uuid4()), "done": False, "color": None,
        "is_weekly_objective": False, "scope": "day", "project_id": None,
        "deadline": None, "priority": "none", "description": "", "created_at": _NOW(),
    },
    "projects": lambda: {
        "id": str(uuid.uuid4()), "color": None, "position": 0,
        "deleted_at": None, "created_at": _NOW(),
    },
    "deleted_tasks": lambda: {
        "id": str(uuid.uuid4()), "color": None, "scope": "day",
        "is_weekly_objective": False, "project_id": None, "deadline": None,
        "priority": "none", "description": "", "deleted_at": _NOW(),
    },
    "weekly_objectives": lambda: {"id": str(uuid.uuid4()), "text": ""},
    "rollover_log": lambda: {},
    "settings": lambda: {"auto_rollover": False},
}

# Conflict target for upsert (primary key / unique constraint).
UPSERT_KEYS = {
    "weekly_objectives": ("user_id", "week_start"),
    "rollover_log": ("user_id",),
    "settings": ("user_id",),
}


class Result:
    def __init__(self, data):
        self.data = data


class Query:
    def __init__(self, db: "FakeDB", table: str):
        self.db = db
        self.table = table
        self.op = "select"
        self.cols = "*"
        self.payload = None
        self.filters = []
        self.orders = []
        self.limit_n = None
        self.single_row = False

    # --- operations -------------------------------------------------------
    def select(self, cols="*"):
        self.op, self.cols = "select", cols
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def upsert(self, payload):
        self.op, self.payload = "upsert", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    # --- filters ----------------------------------------------------------
    def eq(self, k, v):
        self.filters.append(lambda r: r.get(k) == v)
        return self

    def gte(self, k, v):
        self.filters.append(lambda r: r.get(k) is not None and r.get(k) >= v)
        return self

    def lte(self, k, v):
        self.filters.append(lambda r: r.get(k) is not None and r.get(k) <= v)
        return self

    def lt(self, k, v):
        self.filters.append(lambda r: r.get(k) is not None and r.get(k) < v)
        return self

    def in_(self, k, values):
        vals = set(values)
        self.filters.append(lambda r: r.get(k) in vals)
        return self

    def is_(self, k, v):
        assert v == "null", "fake only supports is_(col, 'null')"
        self.filters.append(lambda r: r.get(k) is None)
        return self

    def order(self, col, desc=False):
        self.orders.append((col, desc))
        return self

    def limit(self, n):
        self.limit_n = n
        return self

    def single(self):
        self.single_row = True
        return self

    # --- execution --------------------------------------------------------
    def _match(self):
        return [r for r in self.db.rows(self.table) if all(f(r) for f in self.filters)]

    def _project(self, row):
        if self.cols.strip() == "*":
            return copy.deepcopy(row)
        keys = [c.strip() for c in self.cols.split(",")]
        return {k: copy.deepcopy(row.get(k)) for k in keys}

    def execute(self):
        rows = self.db.rows(self.table)
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            out = []
            for item in items:
                row = {**DEFAULTS[self.table](), **copy.deepcopy(item)}
                rows.append(row)
                out.append(copy.deepcopy(row))
            return Result(out)

        if self.op == "upsert":
            keys = UPSERT_KEYS[self.table]
            item = copy.deepcopy(self.payload)
            existing = next((r for r in rows if all(r.get(k) == item.get(k) for k in keys)), None)
            if existing:
                existing.update(item)
                return Result([copy.deepcopy(existing)])
            row = {**DEFAULTS[self.table](), **item}
            rows.append(row)
            return Result([copy.deepcopy(row)])

        matched = self._match()

        if self.op == "update":
            for r in matched:
                r.update(copy.deepcopy(self.payload))
            return Result([copy.deepcopy(r) for r in matched])

        if self.op == "delete":
            ids = {id(r) for r in matched}
            self.db.tables[self.table] = [r for r in rows if id(r) not in ids]
            return Result([copy.deepcopy(r) for r in matched])

        # select
        for col, desc in reversed(self.orders):
            matched.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=desc)
        if self.limit_n is not None:
            matched = matched[: self.limit_n]
        data = [self._project(r) for r in matched]
        if self.single_row:
            return Result(data[0] if data else None)
        return Result(data)


class FakeDB:
    def __init__(self):
        # Pre-create the tables tests inspect directly via `db.tables[...]`.
        self.tables: dict[str, list[dict]] = {
            "tasks": [], "deleted_tasks": [], "weekly_objectives": [], "projects": [],
        }

    def rows(self, table: str) -> list[dict]:
        return self.tables.setdefault(table, [])

    def table(self, name: str) -> Query:
        return Query(self, name)
