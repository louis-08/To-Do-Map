"use client";

import { useCallback, type RefObject } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import TaskItem from "./TaskItem";
import TaskInput from "./TaskInput";
import { useI18n } from "@/lib/i18n";

function dmKey(d: Date) {
  return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0");
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DayState = "past" | "today" | "future";

export default function DayColumn({
  date,
  dayIndex,
  state,
  tasks,
  onAdd,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
  todayRef,
}: {
  date: Date;
  dayIndex: number;
  state: DayState;
  tasks: Task[];
  onAdd: (date: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  todayRef?: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useI18n();
  const isoDate = toISO(date);
  const { setNodeRef, isOver } = useDroppable({ id: isoDate });
  const setCellRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (todayRef) todayRef.current = node;
  }, [setNodeRef, todayRef]);

  const cls = [
    "tm-cell",
    "state-" + state,
    isOver ? "is-over" : "",
    dayIndex >= 5 ? "is-weekend" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={setCellRef} className={cls}>
      <div className="tm-cell-head">
        <span className="tm-wd">{t.daysShort[dayIndex]}</span>
        <span className="tm-date">{dmKey(date)}</span>
        {state === "today" && <span className="tm-today-pill">{t.todayPill}</span>}
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="tm-tasks">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
              onColorChange={(color) => onColorChange(task.id, color)}
              onEdit={(text) => onEdit(task.id, text)}
            />
          ))}
        </div>
      </SortableContext>

      <TaskInput onAdd={(text) => onAdd(isoDate, text)} />
    </div>
  );
}
