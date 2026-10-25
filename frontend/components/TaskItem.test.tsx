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
    priority: "none",
    description: "",
    position: 0,
    is_weekly_objective: false,
    scope: "day",
    deadline: null,
    project_id: null,
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
            onPriorityChange={noop}
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

describe("TaskItem project label", () => {
  it("renders no label without a project", () => {
    expect(render(task())).not.toContain("tm-task-project");
  });

  it("shows deadline chip and project label in one meta row after the text", () => {
    const html = render(task({ deadline: "2026-12-24", project_id: "p1" }));
    expect(html).toContain("tm-task-meta");
    const text = html.indexOf("Write report");
    const deadline = html.indexOf("tm-deadline");
    const project = html.indexOf("tm-task-project");
    expect(text).toBeLessThan(deadline);
    expect(deadline).toBeLessThan(project);
  });
});

describe("TaskItem priority", () => {
  it("renders a plain card for priority none", () => {
    const html = render(task());
    expect(html).not.toContain("is-prio-");
    expect(html).not.toContain("background:#fd");
  });

  it("colours medium yellow and high red", () => {
    const medium = render(task({ priority: "medium" }));
    expect(medium).toContain("is-prio-medium");
    expect(medium).toContain("background:#fdefce");
    const high = render(task({ priority: "high" }));
    expect(high).toContain("is-prio-high");
    expect(high).toContain("background:#fde7e4");
  });

  it("ignores the legacy colour field", () => {
    const html = render(task({ color: "red" }));
    expect(html).not.toContain("is-prio-");
    expect(html).not.toContain("background:#fde7e4");
  });
});

describe("TaskItem description icon", () => {
  it("shows no icon without a description", () => {
    expect(render(task())).not.toContain("tm-task-note");
  });

  it("shows no icon for a whitespace-only description", () => {
    expect(render(task({ description: " \n " }))).not.toContain("tm-task-note");
  });

  it("shows an accessible icon button inside the text when a description exists", () => {
    const html = render(task({ description: "Call Anna about the budget" }));
    expect(html).toContain("tm-task-note");
    expect(html).toContain('title="Call Anna about the budget"');
    expect(html).toContain("Has a description");
    expect(html.indexOf("report")).toBeLessThan(html.indexOf("tm-task-note"));
  });

  it("keeps the full task text and glues the icon to its last word", () => {
    const html = render(task({ text: "Write the quarterly report", description: "x" }));
    expect(html).toContain('Write the quarterly <span class="tm-nowrap">report<button');
  });

  it("glues the icon only to the last 3 characters of a very long last word", () => {
    const html = render(task({ text: "Steuer vorbereiten", description: "x" }));
    expect(html).toContain('Steuer vorberei<span class="tm-nowrap">ten<button');
  });

  it("works for single-word tasks", () => {
    const html = render(task({ text: "Sport", description: "x" }));
    expect(html).toContain('<span class="tm-nowrap">Sport<button');
  });

  it("does not add a meta row (card height stays the same)", () => {
    expect(render(task({ description: "x" }))).not.toContain("tm-task-meta");
  });

  it("truncates the tooltip of long descriptions", () => {
    const html = render(task({ description: "y".repeat(600) }));
    expect(html).toContain("y".repeat(280) + "…");
    expect(html).not.toContain("y".repeat(281));
  });
});
