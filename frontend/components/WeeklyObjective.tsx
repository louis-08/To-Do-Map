"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import TaskItem from "./TaskItem";
import TaskInput from "./TaskInput";
import { useI18n } from "@/lib/i18n";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthSpanLabel(monday: Date, sunday: Date, monthsShort: string[]): string {
  const a = monthsShort[monday.getMonth()];
  const b = monthsShort[sunday.getMonth()];
  if (a === b) return a + " " + monday.getFullYear();
  return a + "–" + b + " " + sunday.getFullYear();
}

export default function WeeklyObjective({
  weekNum,
  monday,
  sunday,
  tasks,
  isCurrent,
  onAdd,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
}: {
  weekNum: number;
  monday: Date;
  sunday: Date;
  tasks: Task[];
  isCurrent: boolean;
  onAdd: (mondayISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
}) {
  const { t } = useI18n();
  const mondayISO = toISO(monday);
  const { setNodeRef, isOver } = useDroppable({ id: "week:" + mondayISO });

  const cls = [
    "tm-cell",
    "tm-obj",
    isCurrent ? "is-current" : "",
    isOver ? "is-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={setNodeRef} className={cls}>
      <div className="tm-obj-head">
        <span className="tm-weeknum">{t.weekAbbr}{weekNum}</span>
        <span className="tm-monthspan">{monthSpanLabel(monday, sunday, t.monthsShort)}</span>
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
      <TaskInput onAdd={(text) => onAdd(mondayISO, text)} />
    </div>
  );
}
