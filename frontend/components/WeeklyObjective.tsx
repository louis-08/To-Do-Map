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

export function WeeklyObjectiveHead({ weekNum, monday, sunday }: { weekNum: number; monday: Date; sunday: Date }) {
  const { t } = useI18n();
  return (
    <div className="tm-obj-head">
      <span className="tm-weeknum">{t.weekAbbr}{weekNum}</span>
      <span className="tm-monthspan">{monthSpanLabel(monday, sunday, t.monthsShort)}</span>
    </div>
  );
}

export default function WeeklyObjective({
  weekNum,
  monday,
  sunday,
  droppableId,
  showHead = true,
  tasks,
  isCurrent,
  onAdd,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
  onDeadlineChange,
}: {
  weekNum: number;
  monday: Date;
  sunday: Date;
  droppableId: string;
  /** false inside project lanes: the KW header lives in the week's head row. */
  showHead?: boolean;
  tasks: Task[];
  isCurrent: boolean;
  onAdd: (mondayISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
}) {
  const mondayISO = toISO(monday);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const cls = [
    "tm-cell",
    "tm-obj",
    isCurrent ? "is-current" : "",
    isOver ? "is-over" : "",
    showHead ? "" : "is-lane",
  ].filter(Boolean).join(" ");

  return (
    <div ref={setNodeRef} className={cls}>
      {showHead && <WeeklyObjectiveHead weekNum={weekNum} monday={monday} sunday={sunday} />}
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
      <TaskInput onAdd={(text) => onAdd(mondayISO, text)} />
    </div>
  );
}
