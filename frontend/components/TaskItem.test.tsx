import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import TaskItem from "./TaskItem";
import { LanguageProvider } from "@/lib/i18n";
import type { Task } from "@/lib/api";

const noop = () => {};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    user_id: "u",
    date: "2026-10-25",
    text: "Write report",
    done: false,
    color: null,
    position: 0,
    is_weekly_objective: false,
    scope: "day",
    deadline: null,
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function render(t: Task) {
  return renderToStaticMarkup(
    <LanguageProvider>
      <DndContext>
        <SortableContext items={[t.id]}>
          <TaskItem
            task={t}
            onToggle={noop}
            onDelete={noop}
            onColorChange={noop}
            onEdit={noop}
            onDeadlineChange={noop}
          />
        </SortableContext>
      </DndContext>
    </LanguageProvider>,
  );
}

describe("TaskItem deadline chip", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0, 0)); // Sun 25 Oct 2026
  });
  afterEach(() => vi.useRealTimers());

  it("renders no chip when the task has no deadline", () => {
    const html = render(task());
    expect(html).not.toContain("tm-deadline");
    expect(html).toContain("Write report");
  });

  it("shows the formatted deadline inside the card, after the task text", () => {
    const html = render(task({ deadline: "2026-12-24" }));
    expect(html).toContain("tm-deadline is-upcoming");
    expect(html).toContain("Dec 24");
    expect(html.indexOf("Write report")).toBeLessThan(html.indexOf("tm-deadline"));
  });

  it("marks past deadlines of open tasks as overdue", () => {
    expect(render(task({ deadline: "2026-10-24" }))).toContain("tm-deadline is-overdue");
  });

  it("marks a deadline of today as due today", () => {
    expect(render(task({ deadline: "2026-10-25" }))).toContain("tm-deadline is-today");
  });

  it("never shows a finished task as overdue", () => {
    const html = render(task({ deadline: "2026-10-01", done: true }));
    expect(html).toContain("tm-deadline is-done");
    expect(html).not.toContain("is-overdue");
  });

  it("includes the year for deadlines outside the current year", () => {
    expect(render(task({ deadline: "2027-03-05" }))).toContain("Mar 5, 2027");
  });
});
