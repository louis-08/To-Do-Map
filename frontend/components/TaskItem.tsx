"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/api";
import ColorPicker, { TASK_COLORS } from "./ColorPicker";

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path d="M3 4.4h10M6.4 4.4V3.2c0-.45.35-.8.8-.8h1.6c.45 0 .8.35.8.8v1.2M4.5 4.4l.45 8.1c.03.5.44.9.95.9h4.2c.51 0 .92-.4.95-.9l.45-8.1"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.7 6.9v3.8M9.3 6.9v3.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ColorIcon({ color }: { color: string | null }) {
  const entry = TASK_COLORS.find((c) => c.key === color);
  const dot = entry?.dot ?? "#c2c2c8";
  const bg = entry?.bg ?? "";
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" fill={entry ? bg : "none"} stroke={dot} strokeWidth="1.5" />
      {entry && <circle cx="8" cy="8" r="2.2" fill={dot} />}
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
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(task.text);
  const [actionsVisible, setActionsVisible] = useState(false);
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

  function startEditing() {
    setEditing(true);
    setActionsVisible(false);
  }

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
      startEditing();
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
    actionsVisible ? "is-actions" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...colorStyle }}
      className={cls}
      {...attributes}
      {...(editing ? {} : listeners)}
      onClick={() => { if (!editing) setActionsVisible((v) => !v); }}
      onDoubleClick={(e) => { e.preventDefault(); startEditing(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className={"tm-check" + (task.done ? " is-done" : "")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setActionsVisible(false); onToggle(); }}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
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

      <button
        className="tm-task-color"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setMenu(true); setActionsVisible(false); }}
        aria-label="Change color"
      >
        <ColorIcon color={task.color ?? null} />
      </button>

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
