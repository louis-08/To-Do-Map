"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/api";
import { TASK_COLORS } from "./ColorPicker";
import TaskMenu from "./TaskMenu";
import { useI18n } from "@/lib/i18n";

function DotsIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
      <circle cx="8" cy="3.2" r="1.35" fill="currentColor" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
      <circle cx="8" cy="12.8" r="1.35" fill="currentColor" />
    </svg>
  );
}

export default function TaskItem({
  task,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onColorChange: (color: string | null) => void;
  onEdit: (text: string) => void;
}) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.text);
  const editRef = useRef<HTMLInputElement>(null);
  const lastTapRef = useRef(0);
  const movedRef = useRef(false);

  useEffect(() => { setEditVal(task.text); }, [task.text]);
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editing]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const colorEntry = TASK_COLORS.find((c) => c.key === (task.color ?? "none"));
  const colorStyle = colorEntry?.bg
    ? { background: colorEntry.bg, borderColor: colorEntry.dot + "70" }
    : undefined;

  const style = { transform: CSS.Transform.toString(transform), transition };

  function commitEdit() {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== task.text) onEdit(trimmed);
    setEditing(false);
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    movedRef.current = false;
    if (!editing) listeners?.onTouchStart?.(e);
  };
  const handleTouchMove = () => { movedRef.current = true; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (movedRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      setEditing(true);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const cls = [
    "tm-task",
    task.done ? "is-done" : "",
    isDragging ? "is-dragging" : "",
    colorStyle ? "is-colored" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...colorStyle }}
      className={cls}
      {...attributes}
      {...(editing ? {} : listeners)}
      onDoubleClick={(e) => { e.preventDefault(); setEditing(true); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className={"tm-check" + (task.done ? " is-done" : "")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={task.done ? t.markIncomplete : t.markComplete}
      >
        <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden="true">
          <path d="M4.3 8.4L6.7 10.8L11.7 5.2" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {editing ? (
        <input
          ref={editRef}
          className="tm-task-edit"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
            else if (e.key === "Escape") { setEditVal(task.text); setEditing(false); }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="tm-task-text">{task.text}</span>
      )}

      {!editing && (
        <button
          className="tm-task-menu-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
          aria-label={t.taskOptions}
        >
          <DotsIcon />
        </button>
      )}

      {menuOpen && (
        <TaskMenu
          task={task}
          onColorChange={onColorChange}
          onDelete={onDelete}
          onEdit={() => setEditing(true)}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
