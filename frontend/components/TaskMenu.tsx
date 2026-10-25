"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/lib/api";
import { TASK_COLORS } from "./ColorPicker";
import { useI18n } from "@/lib/i18n";

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
      <path d="M10.8 2.9l2.3 2.3M11.6 2.1 4.3 9.4l-.9 3 3-.9 7.3-7.3a1.3 1.3 0 0 0 0-1.8l-1.2-1.2a1.3 1.3 0 0 0-1.8 0z"
            fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ColorIcon({ color }: { color: string | null }) {
  const entry = TASK_COLORS.find((c) => c.key === color);
  const dot = entry?.dot ?? "#c2c2c8";
  const bg = entry?.bg ?? "";
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" fill={entry ? bg : "none"} stroke={dot} strokeWidth="1.5" />
      {entry && <circle cx="8" cy="8" r="2.2" fill={dot} />}
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

type View = "home" | "color" | "deadline";

// The menu is portalled to <body>, but React still bubbles its events up to the
// task card (dnd-kit drag handlers, double-click-to-edit). Stop them at the overlay.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function TaskMenu({
  task,
  onColorChange,
  onDelete,
  onEdit,
  onDeadlineChange,
  onClose,
}: {
  task: Task;
  onColorChange: (color: string | null) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDeadlineChange: (deadline: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("home");
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(task.deadline ?? "");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!mounted) return null;

  const title = view === "color" ? t.color : view === "deadline" ? t.deadline : task.text;

  return createPortal(
    <div
      className="tm-modal-overlay"
      onClick={onClose}
      onMouseDown={stop}
      onPointerDown={stop}
      onTouchStart={stop}
      onTouchEnd={stop}
      onDoubleClick={stop}
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
            <button className="tm-modal-opt" onClick={() => setView("color")} aria-label={t.changeColor}>
              <ColorIcon color={task.color ?? null} /><span>{t.color}</span>
            </button>
            <button className="tm-modal-opt" onClick={() => setView("deadline")} aria-label={t.setDeadline}>
              <CalendarIcon active={!!task.deadline} /><span>{t.deadline}</span>
            </button>
            <button className="tm-modal-opt is-danger" onClick={() => { onDelete(); onClose(); }} aria-label={t.deleteTask}>
              <TrashIcon /><span>{t.delete}</span>
            </button>
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

        {view === "color" && (
          <div className="tm-modal-body">
            <div className="tm-modal-colors">
              {TASK_COLORS.map((c) => {
                const sel = (task.color ?? "") === c.key;
                return (
                  <button
                    key={c.key}
                    className={"tm-color-sw" + (sel ? " is-sel" : "")}
                    style={{ background: c.bg, borderColor: c.dot }}
                    title={c.key}
                    onClick={() => { onColorChange(c.key); onClose(); }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
