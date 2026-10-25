"use client";

import { useProjects } from "@/lib/projects";
import { useI18n } from "@/lib/i18n";
import { PROJECT_COLORS } from "@/lib/palette";

export function projectDotColor(color: string | null | undefined): string {
  return PROJECT_COLORS.find((c) => c.key === color)?.dot ?? "var(--muted)";
}

/** Small project chip under a task's text (normal week view, year view). */
export default function ProjectLabel({ projectId }: { projectId: string }) {
  const { byId } = useProjects();
  const { t } = useI18n();
  const project = byId.get(projectId);
  const name = project?.name ?? t.unknownProject;
  const deleted = !!project?.deleted_at;
  return (
    <span
      className={"tm-task-project" + (deleted ? " is-deleted" : "")}
      title={deleted ? `${name} (${t.deletedProject})` : name}
    >
      <i className="tm-project-dot" style={{ background: projectDotColor(project?.color) }} />
      <span className="tm-task-project-name">{name}</span>
    </span>
  );
}
