"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/lib/api";
import { useProjects } from "@/lib/projects";
import { useI18n } from "@/lib/i18n";
import { TASK_COLORS } from "./ColorPicker";
import { projectDotColor } from "./ProjectLabel";

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
      <path d={up ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectRow({
  project, isFirst, isLast, onMove,
}: {
  project: Project;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const { updateProject, deleteProject } = useProjects();
  const [name, setName] = useState(project.name);
  const [colorOpen, setColorOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { setName(project.name); }, [project.name]);

  function commitName() {
    const next = name.trim();
    if (!next) { setName(project.name); return; }
    if (next !== project.name) updateProject(project.id, { name: next });
  }

  return (
    <li className="tm-proj-row">
      <div className="tm-proj-main">
        <button
          className="tm-proj-dotbtn"
          onClick={() => setColorOpen((o) => !o)}
          aria-label={t.projectColor}
          aria-expanded={colorOpen}
        >
          <i className="tm-project-dot" style={{ background: projectDotColor(project.color) }} />
        </button>
        <input
          className="tm-proj-name"
          value={name}
          maxLength={60}
          aria-label={t.projectName}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else if (e.key === "Escape") { setName(project.name); (e.target as HTMLInputElement).blur(); }
          }}
        />
        <button className="tm-proj-icon" disabled={isFirst} onClick={() => onMove(-1)} aria-label={t.moveUp}><Arrow up /></button>
        <button className="tm-proj-icon" disabled={isLast} onClick={() => onMove(1)} aria-label={t.moveDown}><Arrow /></button>
        {!confirm ? (
          <button className="btn-ghost danger tm-proj-del" onClick={() => setConfirm(true)}>{t.delete}</button>
        ) : (
          <span className="confirm">
            <button className="btn-ghost" onClick={() => setConfirm(false)}>{t.cancel}</button>
            <button className="btn-danger" onClick={() => deleteProject(project.id)}>{t.confirmDelete}</button>
          </span>
        )}
      </div>
      {confirm && <div className="set-row-sub tm-proj-hint">{t.deleteProjectConfirm}</div>}
      {colorOpen && (
        <div className="tm-proj-colors">
          {TASK_COLORS.map((c) => (
            <button
              key={c.key}
              className={"tm-color-sw" + (project.color === c.key ? " is-sel" : "")}
              style={{ background: c.bg, borderColor: c.dot }}
              title={c.key}
              onClick={() => { updateProject(project.id, { color: c.key }); setColorOpen(false); }}
            />
          ))}
        </div>
      )}
    </li>
  );
}

/** Settings card: create, rename, recolor, reorder and (soft) delete projects. */
export default function ProjectsSettings() {
  const { t } = useI18n();
  const { active, createProject, orderProjects } = useProjects();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const next = name.trim();
    if (!next || busy) return;
    setBusy(true);
    try {
      // Cycle through the palette so new projects are distinguishable by default.
      const color = TASK_COLORS[(active.length + 1) % TASK_COLORS.length].key;
      await createProject(next, color);
      setName("");
    } catch {
      // Keep the typed name so the user can retry.
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const ids = active.map((p) => p.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    orderProjects(ids);
  }

  return (
    <section className="tab-card">
      <div className="tab-card-title">{t.projects}</div>
      <div className="set-row-sub" style={{ marginTop: -6, marginBottom: 12 }}>{t.projectsSub}</div>

      {active.length === 0 ? (
        <div className="set-row-sub" style={{ marginBottom: 12 }}>{t.noProjectsYet}</div>
      ) : (
        <ul className="tm-proj-list">
          {active.map((p, i) => (
            <ProjectRow
              key={p.id}
              project={p}
              isFirst={i === 0}
              isLast={i === active.length - 1}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </ul>
      )}

      <form className="tm-project-new" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input
          className="tab-input"
          value={name}
          maxLength={60}
          placeholder={t.newProjectPlaceholder}
          aria-label={t.projectName}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-ghost" type="submit" disabled={!name.trim() || busy}>{t.addProject}</button>
      </form>
    </section>
  );
}
