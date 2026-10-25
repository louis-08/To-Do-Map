"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/lib/api";
import { PRIORITIES, PRIORITY_STYLE, normalizePriority, type Priority } from "@/lib/priority";
import { projectDotColor } from "./ProjectLabel";
import { useI18n } from "@/lib/i18n";
import { useProjects } from "@/lib/projects";
import { assignableProjects } from "@/lib/board";

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
      <path d="M10.8 2.9l2.3 2.3M11.6 2.1 4.3 9.4l-.9 3 3-.9 7.3-7.3a1.3 1.3 0 0 0 0-1.8l-1.2-1.2a1.3 1.3 0 0 0-1.8 0z"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Flag icon, filled with the priority colour (outline only for "none"). */
function FlagIcon({ priority, size = 20 }: { priority: Priority; size?: number }) {
  const s = PRIORITY_STYLE[priority];
  const stroke = s?.dot ?? "#9a9aa2";
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M4 14V2.6" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 3h7.6l-1.8 2.6 1.8 2.6H4z" fill={s ? s.dot : "none"} stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
      <path d="M3 4.4h10M6.4 4.4V3.2c0-.45.35-.8.8-.8h1.6c.45 0 .8.35.8.8v1.2M4.5 4.4l.45 8.1c.03.5.44.9.95.9h4.2c.51 0 .92-.4.95-.9l.45-8.1"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.7 6.9v3.8M9.3 6.9v3.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
      <path d="M2.2 4.6c0-.66.54-1.2 1.2-1.2h2.7l1.4 1.5h5.1c.66 0 1.2.54 1.2 1.2v5.6c0 .66-.54 1.2-1.2 1.2H3.4c-.66 0-1.2-.54-1.2-1.2z"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
      <rect x="2.2" y="3.4" width="11.6" height="10.2" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.2 6.8h11.6M5.4 2v2.6M10.6 2v2.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {active && <circle cx="8" cy="10.2" r="1.5" fill="currentColor" />}
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

type View = "home" | "priority" | "deadline" | "project";

// The menu is portalled to <body>, but React still bubbles its events up to the
// task card (dnd-kit drag handlers, double-click-to-edit). Stop them at the overlay
// so typing/selecting in the modal never starts a drag or edit mode.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function TaskMenu({
  task,
  onPriorityChange,
  onDelete,
  onEdit,
  onDeadlineChange,
  onClose,
}: {
  task: Task;
  onPriorityChange: (priority: Priority) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDeadlineChange: (deadline: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { projects, byId, assignProject, createProject } = useProjects();
  const [view, setView] = useState<View>("home");
  const [mounted, setMounted] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const current = task.project_id ? byId.get(task.project_id) : undefined;
  const priority = normalizePriority(task.priority);
  const priorityLabel: Record<Priority, string> = {
    none: t.priorityNone,
    medium: t.priorityMedium,
    high: t.priorityHigh,
  };
  const options = assignableProjects(projects, task.project_id);

  function pick(projectId: string | null) {
    if (projectId !== task.project_id) assignProject(task.id, projectId);
    onClose();
  }

  async function createAndPick() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const p = await createProject(name, null);
      pick(p.id);
    } catch {
      setCreating(false);
    }
  }
  const [draft, setDraft] = useState(task.deadline ?? "");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!mounted) return null;

  const title =
    view === "priority" ? t.priority
    : view === "deadline" ? t.deadline
    : view === "project" ? t.project
    : task.text;

  return createPortal(
    <div
      className="tm-modal-overlay"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      onDoubleClick={stop}
      onKeyDown={stop}
    >
      <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tm-modal-head">
          {view === "home" ? (
            <span className="tm-modal-nav-spacer" />
          ) : (
            <button className="tm-modal-nav" onClick={() => setView("home")} aria-label={t.back}>
              <BackIcon />
            </button>
          )}
          <span className="tm-modal-title">{title}</span>
          <button className="tm-modal-nav" onClick={onClose} aria-label={t.close}>
            <CloseIcon />
          </button>
        </div>

        {view === "home" && (
          <div className="tm-modal-grid">
            <button className="tm-modal-opt" onClick={() => { onEdit(); onClose(); }} aria-label={t.editTask}>
              <PencilIcon /><span>{t.edit}</span>
            </button>
            <button className="tm-modal-opt" onClick={() => setView("priority")} aria-label={t.changePriority}>
              <FlagIcon priority={priority} />
              <span>{priority === "none" ? t.priority : priorityLabel[priority]}</span>
            </button>
            <button className="tm-modal-opt" onClick={() => setView("deadline")} aria-label={t.setDeadline}>
              <CalendarIcon active={!!task.deadline} /><span>{t.deadline}</span>
            </button>
            <button className="tm-modal-opt" onClick={() => setView("project")} aria-label={t.changeProject}>
              <FolderIcon />
              <span className="tm-modal-opt-sub">{current ? current.name : t.project}</span>
            </button>
            <button className="tm-modal-opt is-danger" onClick={() => { onDelete(); onClose(); }} aria-label={t.deleteTask}>
              <TrashIcon /><span>{t.delete}</span>
            </button>
          </div>
        )}

        {view === "project" && (
          <div className="tm-modal-body tm-project-pick">
            <button
              className={"tm-project-opt" + (task.project_id === null ? " is-sel" : "")}
              onClick={() => pick(null)}
            >
              <i className="tm-project-dot is-none" />
              <span>{t.noProject}</span>
            </button>
            {options.map((p) => (
              <button
                key={p.id}
                className={"tm-project-opt" + (task.project_id === p.id ? " is-sel" : "")}
                onClick={() => pick(p.id)}
              >
                <i className="tm-project-dot" style={{ background: projectDotColor(p.color) }} />
                <span>{p.name}</span>
                {p.deleted_at && <em className="tm-project-deleted">{t.deletedProject}</em>}
              </button>
            ))}
            <form
              className="tm-project-new"
              onSubmit={(e) => { e.preventDefault(); createAndPick(); }}
            >
              <input
                className="tab-input"
                value={newName}
                maxLength={60}
                placeholder={t.newProjectPlaceholder}
                onChange={(e) => setNewName(e.target.value)}
                aria-label={t.projectName}
              />
              <button className="btn-ghost" type="submit" disabled={!newName.trim() || creating}>
                {t.addProject}
              </button>
            </form>
          </div>
        )}

        {view === "deadline" && (
          <div className="tm-modal-body">
            <input
              type="date"
              className="tm-modal-date"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft) { onDeadlineChange(draft); onClose(); }
              }}
              aria-label={t.deadline}
            />
            <div className="tm-modal-actions">
              {task.deadline && (
                <button
                  className="tm-modal-btn"
                  onClick={() => { onDeadlineChange(null); onClose(); }}
                >
                  {t.removeDeadline}
                </button>
              )}
              <button
                className="tm-modal-btn is-primary"
                disabled={!draft}
                onClick={() => { onDeadlineChange(draft); onClose(); }}
              >
                {t.save}
              </button>
            </div>
          </div>
        )}

        {view === "priority" && (
          <div className="tm-modal-body tm-project-pick" role="radiogroup" aria-label={t.priority}>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={priority === p}
                className={"tm-project-opt tm-prio-opt is-" + p + (priority === p ? " is-sel" : "")}
                onClick={() => { if (p !== priority) onPriorityChange(p); onClose(); }}
              >
                <FlagIcon priority={p} size={16} />
                <span>{priorityLabel[p]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
