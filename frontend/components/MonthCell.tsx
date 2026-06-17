"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import TaskItem from "./TaskItem";
import TaskInput from "./TaskInput";
import { useI18n } from "@/lib/i18n";

type MonthState = "past" | "today" | "future";

export default function MonthCell({
  monthISO,
  label,
  state,
  tasks,
  onAdd,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
}: {
  monthISO: string;
  label: string;
  state: MonthState;
  tasks: Task[];
  onAdd: (monthISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: monthISO });

  const cls = [
    "tm-cell",
    "state-" + state,
    isOver ? "is-over" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={setNodeRef} className={cls}>
      <div className="tm-cell-head">
        <span className="tm-wd">{label}</span>
        {state === "today" && <span className="tm-today-pill">{t.nowPill}</span>}
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

      <TaskInput onAdd={(text) => onAdd(monthISO, text)} />
    </div>
  );
}
