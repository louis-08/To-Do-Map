"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/lib/api";
import { normalizePriority, priorityCardStyle, type Priority } from "@/lib/priority";
import TaskMenu from "./TaskMenu";
import ProjectLabel from "./ProjectLabel";
import { useI18n } from "@/lib/i18n";
import { deadlineStatus, formatDeadline, todayISO } from "@/lib/deadline";

function DotsIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
      <circle cx="8" cy="3.2" r="1.35" fill="currentColor" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
      <circle cx="8" cy="12.8" r="1.35" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden="true">
      <rect x="2.2" y="3.4" width="11.6" height="10.2" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.2 6.8h11.6M5.4 2v2.6M10.6 2v2.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function TaskItem({
  task,
  onToggle,
  onDelete,
  onPriorityChange,
  onEdit,
  onDeadlineChange,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onPriorityChange: (priority: Priority) => void;
  onEdit: (text: string) => void;
  onDeadlineChange: (deadline: string | null) => void;
}) {
  const { t, lang } = useI18n();
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

  const priority = normalizePriority(task.priority);
  const priorityStyle = priorityCardStyle(priority);

  const style = { transform: CSS.Transform.toString(transform), transition };

  const deadlineLabel = task.deadline
    ? formatDeadline(task.deadline, lang === "de" ? "de-DE" : "en-US")
    : null;
  const deadlineState = task.deadline
    ? deadlineStatus(task.deadline, task.done, todayISO())
    : null;

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
    priority !== "none" ? "is-prio-" + priority : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...priorityStyle }}
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
        <div className="tm-task-body">
          <span className="tm-task-text">{task.text}</span>
          {(deadlineLabel || task.project_id) && (
            <span className="tm-task-meta">
              {deadlineLabel && (
                <span
                  className={"tm-deadline is-" + deadlineState}
                  title={`${t.deadline}: ${deadlineLabel}`}
                >
                  <CalendarIcon />
                  {deadlineLabel}
                </span>
              )}
              {task.project_id && <ProjectLabel projectId={task.project_id} />}
            </span>
          )}
        </div>
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
          onPriorityChange={onPriorityChange}
          onDelete={onDelete}
          onEdit={() => setEditing(true)}
          onDeadlineChange={onDeadlineChange}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
