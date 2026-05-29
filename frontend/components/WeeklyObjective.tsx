"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import TaskItem from "./TaskItem";
import TaskInput from "./TaskInput";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthSpanLabel(monday: Date, sunday: Date): string {
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const a = MONTHS[monday.getMonth()];
  const b = MONTHS[sunday.getMonth()];
  if (a === b) return a.slice(0, 3) + " " + monday.getFullYear();
  return a.slice(0, 3) + "–" + b.slice(0, 3) + " " + sunday.getFullYear();
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
}) {
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
        <span className="tm-weeknum">W{weekNum}</span>
        <span className="tm-monthspan">{monthSpanLabel(monday, sunday)}</span>
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
            />
          ))}
        </div>
      </SortableContext>
      <TaskInput onAdd={(text) => onAdd(mondayISO, text)} />
    </div>
  );
}
