"use client";

import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/api";
import ColorPicker, { TASK_COLORS } from "./ColorPicker";

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden="true">
      <path d="M3 4.4h10M6.4 4.4V3.2c0-.45.35-.8.8-.8h1.6c.45 0 .8.35.8.8v1.2M4.5 4.4l.45 8.1c.03.5.44.9.95.9h4.2c.51 0 .92-.4.95-.9l.45-8.1"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.7 6.9v3.8M9.3 6.9v3.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function TaskItem({
  task,
  onToggle,
  onDelete,
  onColorChange,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onColorChange: (color: string | null) => void;
}) {
  const [menu, setMenu] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const colorEntry = TASK_COLORS.find((c) => c.key === (task.color ?? "none"));
  const colorStyle =
    colorEntry && colorEntry.bg
      ? { background: colorEntry.bg, borderColor: colorEntry.dot + "70" }
      : undefined;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startPress = () => {
    movedRef.current = false;
    pressTimer.current = setTimeout(() => {
      if (!movedRef.current) setMenu(true);
    }, 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...colorStyle }}
      className={
        "tm-task" +
        (task.done ? " is-done" : "") +
        (isDragging ? " is-dragging" : "") +
        (colorStyle ? " is-colored" : "")
      }
      {...attributes}
      {...listeners}
      onDoubleClick={(e) => { e.preventDefault(); setMenu(true); }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={() => { movedRef.current = true; cancelPress(); }}
    >
      <button
        className={"tm-check" + (task.done ? " is-done" : "")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
      >
        <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden="true">
          <path d="M4.3 8.4L6.7 10.8L11.7 5.2" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <span className="tm-task-text">{task.text}</span>

      <button
        className="tm-task-del"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete task"
      >
        <TrashIcon />
      </button>

      {menu && (
        <ColorPicker
          current={task.color ?? null}
          onSelect={onColorChange}
          onClose={() => setMenu(false)}
        />
      )}
    </div>
  );
}
