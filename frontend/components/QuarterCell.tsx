"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import TaskItem from "./TaskItem";
import TaskInput from "./TaskInput";
import { useI18n } from "@/lib/i18n";

export default function QuarterCell({
  quarter,
  quarterISO,
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
  quarter: number;
  quarterISO: string;
  tasks: Task[];
  isCurrent: boolean;
  isPast: boolean;
  onAdd: (quarterISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: "quarter:" + quarterISO });

  const cls = [
    "tm-cell",
    "tm-obj",
    "tm-quarter-obj",
    isCurrent ? "is-current" : "",
    isPast ? "state-past" : "",
    isOver ? "is-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={setNodeRef} className={cls}>
      <div className="tm-obj-head">
        <span className="tm-weeknum">{t.quarterAbbr}{quarter + 1}</span>
        <span className="tm-monthspan">{t.monthsShort[quarter * 3] + " – " + t.monthsShort[quarter * 3 + 2]}</span>
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

      <TaskInput onAdd={(text) => onAdd(quarterISO, text)} />
    </div>
  );
}
