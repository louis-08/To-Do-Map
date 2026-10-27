"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/lib/api";
import { PRIORITIES, PRIORITY_STYLE, normalizePriority, type Priority } from "@/lib/priority";
import { projectDotColor } from "./ProjectLabel";
import { useI18n } from "@/lib/i18n";
import { useProjects } from "@/lib/projects";
import { assignableProjects } from "@/lib/board";
import { DESCRIPTION_MAX, hasDescription, useDescriptionActions } from "@/lib/description";
import {
  REPEAT_FREQS, REPEAT_INTERVAL_MAX, canRepeat, describeRepeat, normalizeInterval, sameRule, taskRule, useRepeatActions,
  type RepeatFreq, type RepeatRule,
} from "@/lib/repeat";

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

export function NoteIcon({ size = 20, dot = false }: { size?: number; dot?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <rect x="2.4" y="2.2" width="11.2" height="11.6" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 6h6M5 8.5h6M5 11h3.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {dot && <circle cx="13" cy="3" r="2.2" fill="var(--accent)" stroke="var(--canvas)" strokeWidth="1" />}
    </svg>
  );
}

/** Two arrows chasing each other: the "repeat" symbol. */
export function RepeatIcon({ size = 20, dot = false }: { size?: number; dot?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path d="M3 7.2V6.4A2.4 2.4 0 0 1 5.4 4H12M10.2 1.9 12.3 4l-2.1 2.1M13 8.8v.8a2.4 2.4 0 0 1-2.4 2.4H4M5.8 14.1 3.7 12l2.1-2.1"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {dot && <circle cx="13" cy="3" r="2.2" fill="var(--accent)" stroke="var(--canvas)" strokeWidth="1" />}
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

export type TaskMenuView = "home" | "priority" | "deadline" | "project" | "description" | "repeat";
type View = TaskMenuView;

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
  initialView = "home",
}: {
  task: Task;
  onPriorityChange: (priority: Priority) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDeadlineChange: (deadline: string | null) => void;
  onClose: () => void;
  /** Lets the description icon on the card open straight into the editor. */
  initialView?: TaskMenuView;
}) {
  const { t, lang } = useI18n();
  const { setDescription } = useDescriptionActions();
  const { setRepeat } = useRepeatActions();
  const { projects, byId, assignProject, createProject } = useProjects();
  const [view, setView] = useState<View>(initialView);
  const [descDraft, setDescDraft] = useState(task.description ?? "");
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

  const savedRule = taskRule(task);
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq | "none">(savedRule?.freq ?? "none");
  const [repeatInterval, setRepeatInterval] = useState(String(savedRule?.interval ?? 1));
  const [repeatUntil, setRepeatUntil] = useState(savedRule?.until ?? "");
  const locale = lang === "de" ? "de-DE" : "en-US";
  // The end date can not lie before the task itself (the backend rejects it).
  const untilInvalid = !!repeatUntil && repeatUntil < task.date;
  const repeatDraft: RepeatRule | null =
    repeatFreq === "none"
      ? null
      : { freq: repeatFreq, interval: normalizeInterval(repeatInterval), until: repeatUntil || null };
  const repeatDirty = !sameRule(repeatDraft, savedRule);

  const savedDescription = task.description ?? "";
  const descDirty = descDraft.trim() !== savedDescription.trim();

  // Leaving the description editor (back, X, click outside) keeps what was typed,
  // like leaving the inline text edit does. Escape is the explicit "discard".
  function saveDescription() {
    if (descDirty) setDescription(task.id, descDraft.trim());
  }
  function leave(action: () => void) {
    if (view === "description") saveDescription();
    action();
  }

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
    : view === "description" ? t.description
    : view === "repeat" ? t.repeat
    : task.text;

  return createPortal(
    <div
      className="tm-modal-overlay"
      onClick={(e) => { e.stopPropagation(); leave(onClose); }}
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      onDoubleClick={stop}
      onKeyDown={(e) => {
        // stopPropagation below also hides the event from the document-level
        // listener, so Escape typed inside the modal (textarea, date input)
        // has to be handled here.
        if (e.key === "Escape") onClose();
        e.stopPropagation();
      }}
    >
      <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tm-modal-head">
          {view === "home" ? (
            <span className="tm-modal-nav-spacer" />
          ) : (
            <button className="tm-modal-nav" onClick={() => leave(() => setView("home"))} aria-label={t.back}>
              <BackIcon />
            </button>
          )}
          <span className="tm-modal-title">{title}</span>
          <button className="tm-modal-nav" onClick={() => leave(onClose)} aria-label={t.close}>
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
            <button className="tm-modal-opt" onClick={() => setView("description")} aria-label={t.changeDescription}>
              <NoteIcon dot={hasDescription(task)} /><span>{t.description}</span>
            </button>
            {canRepeat(task) && (
              <button className="tm-modal-opt" onClick={() => setView("repeat")} aria-label={t.repeat}>
                <RepeatIcon dot={!!savedRule} />
                <span className="tm-modal-opt-sub">{savedRule ? describeRepeat(savedRule, t, locale) : t.repeat}</span>
              </button>
            )}
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

        {view === "description" && (
          <div className="tm-modal-body">
            <textarea
              className="tm-modal-textarea"
              value={descDraft}
              maxLength={DESCRIPTION_MAX}
              rows={7}
              autoFocus
              placeholder={t.descriptionPlaceholder}
              aria-label={t.description}
              onChange={(e) => setDescDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveDescription();
                  onClose();
                }
              }}
            />
            <div className="tm-modal-actions">
              {hasDescription(task) && (
                <button
                  className="tm-modal-btn"
                  onClick={() => { setDescription(task.id, ""); onClose(); }}
                >
                  {t.removeDescription}
                </button>
              )}
              <button
                className="tm-modal-btn is-primary"
                disabled={!descDirty}
                onClick={() => { saveDescription(); onClose(); }}
              >
                {t.save}
              </button>
            </div>
          </div>
        )}

        {view === "repeat" && (
          <div className="tm-modal-body tm-repeat">
            <select
              className="tm-modal-date"
              value={repeatFreq}
              onChange={(e) => setRepeatFreq(e.target.value as RepeatFreq | "none")}
              aria-label={t.repeat}
            >
              <option value="none">{t.repeatNone}</option>
              {REPEAT_FREQS.map((f) => (
                <option key={f} value={f}>{t.repeatOne[f]}</option>
              ))}
            </select>
            {repeatFreq !== "none" && (
              <>
                <label className="tm-repeat-field">
                  <span>{t.repeatInterval}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="tm-modal-date"
                    min={1}
                    max={REPEAT_INTERVAL_MAX}
                    step={1}
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(e.target.value)}
                    onBlur={() => setRepeatInterval(String(normalizeInterval(repeatInterval)))}
                  />
                </label>
                <label className="tm-repeat-field">
                  <span>{t.repeatEnds}</span>
                  <input
                    type="date"
                    className="tm-modal-date"
                    min={task.date}
                    value={repeatUntil}
                    aria-invalid={untilInvalid}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                  />
                </label>
                <p className="tm-repeat-summary">{repeatDraft && describeRepeat(repeatDraft, t, locale)}</p>
                <p className="tm-repeat-hint">{t.repeatHint}</p>
              </>
            )}
            <div className="tm-modal-actions">
              {savedRule && (
                <button className="tm-modal-btn" onClick={() => { setRepeat(task.id, null); onClose(); }}>
                  {t.repeatStop}
                </button>
              )}
              <button
                className="tm-modal-btn is-primary"
                disabled={!repeatDirty || untilInvalid}
                onClick={() => { setRepeat(task.id, repeatDraft); onClose(); }}
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
