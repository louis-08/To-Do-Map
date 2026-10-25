"use client";

import { memo } from "react";
import type { Task } from "@/lib/api";
import DayColumn from "./DayColumn";
import WeeklyObjective from "./WeeklyObjective";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return toISO(d);
}

const WeekRow = memo(function WeekRow({
  week,
  tasks,
  onAddTask,
  onAddWeeklyTask,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
  onDeadlineChange,
  currentRef,
  todayRef,
}: {
  week: { num: number; year: number; monday: Date; sunday: Date; days: Date[]; isCurrent: boolean };
  tasks: Task[];
  onAddTask: (date: string, text: string) => void;
  onAddWeeklyTask: (mondayISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
  currentRef?: React.RefObject<HTMLDivElement | null>;
  todayRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const today = isoToday();

  const dayState = (d: Date) => {
    const iso = toISO(d);
    if (iso < today) return "past" as const;
    if (iso === today) return "today" as const;
    return "future" as const;
  };

  const tasksForDay = (d: Date) =>
    tasks.filter((t) => t.date === toISO(d) && !t.is_weekly_objective);

  const weeklyTasks = tasks.filter((t) => t.is_weekly_objective);

  return (
    <div
      ref={week.isCurrent ? currentRef : undefined}
      data-week-year={week.year}
      className={"tm-row" + (week.isCurrent ? " is-current-week" : "")}
    >
      {week.days.map((day, i) => {
        const state = dayState(day);
        return (
          <DayColumn
            key={toISO(day)}
            date={day}
            dayIndex={i}
            state={state}
            tasks={tasksForDay(day)}
            onAdd={onAddTask}
            onToggle={onToggle}
            onDelete={onDelete}
            onColorChange={onColorChange}
            onEdit={onEdit}
            onDeadlineChange={onDeadlineChange}
            todayRef={state === "today" ? todayRef : undefined}
          />
        );
      })}
      <WeeklyObjective
        weekNum={week.num}
        monday={week.monday}
        sunday={week.sunday}
        tasks={weeklyTasks}
        isCurrent={week.isCurrent}
        onAdd={onAddWeeklyTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onColorChange={onColorChange}
        onEdit={onEdit}
        onDeadlineChange={onDeadlineChange}
      />
    </div>
  );
});

export default WeekRow;
