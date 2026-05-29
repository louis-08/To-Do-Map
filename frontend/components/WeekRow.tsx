"use client";

import { memo } from "react";
import type { Task, WeeklyObjective } from "@/lib/api";
import DayColumn from "./DayColumn";
import WeeklyObjectiveComp from "./WeeklyObjective";

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
  objective,
  onAddTask,
  onToggle,
  onDelete,
  onColorChange,
  onObjectiveSave,
  currentRef,
}: {
  week: { num: number; year: number; monday: Date; sunday: Date; days: Date[]; isCurrent: boolean };
  tasks: Task[];
  objective: WeeklyObjective | undefined;
  onAddTask: (date: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onObjectiveSave: (weekStart: string, text: string) => void;
  currentRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const today = isoToday();

  const dayState = (d: Date) => {
    const iso = toISO(d);
    if (iso < today) return "past" as const;
    if (iso === today) return "today" as const;
    return "future" as const;
  };

  const tasksForDay = (d: Date) => tasks.filter((t) => t.date === toISO(d));

  return (
    <div
      ref={week.isCurrent ? currentRef : undefined}
      data-week-year={week.year}
      className={"tm-row" + (week.isCurrent ? " is-current-week" : "")}
    >
      {week.days.map((day, i) => (
        <DayColumn
          key={toISO(day)}
          date={day}
          dayIndex={i}
          state={dayState(day)}
          tasks={tasksForDay(day)}
          onAdd={onAddTask}
          onToggle={onToggle}
          onDelete={onDelete}
          onColorChange={onColorChange}
        />
      ))}
      <WeeklyObjectiveComp
        weekNum={week.num}
        monday={week.monday}
        sunday={week.sunday}
        value={objective?.text ?? ""}
        isCurrent={week.isCurrent}
        onSave={(text) => onObjectiveSave(toISO(week.monday), text)}
      />
    </div>
  );
});

export default WeekRow;
