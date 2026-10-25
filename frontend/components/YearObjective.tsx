"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import TaskItem from "./TaskItem";
import TaskInput from "./TaskInput";
import { useI18n } from "@/lib/i18n";

export default function YearObjective({
  year,
  yearISO,
  tasks,
  isCurrent,
  isPast,
  onAdd,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
  onDeadlineChange,
}: {
  year: number;
  yearISO: string;
  tasks: Task[];
  isCurrent: boolean;
  isPast: boolean;
  onAdd: (yearISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: "year:" + yearISO });

  const cls = [
    "tm-cell",
    "tm-obj",
    "tm-year-obj",
    isCurrent ? "is-current" : "",
    isPast ? "state-past" : "",
    isOver ? "is-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={setNodeRef} className={cls}>
      <div className="tm-obj-head">
        <span className="tm-weeknum">{year}</span>
        <span className="tm-monthspan">{t.yearlyObjective}</span>
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
              onDeadlineChange={(deadline) => onDeadlineChange(task.id, deadline)}
            />
          ))}
        </div>
      </SortableContext>

      <TaskInput onAdd={(text) => onAdd(yearISO, text)} />
    </div>
  );
}
