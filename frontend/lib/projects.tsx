"use client";

import { createContext, useContext, useMemo } from "react";
import type { Project } from "./api";

export type ProjectsContextValue = {
  /** All projects incl. soft-deleted ones (needed for labels of old tasks). */
  projects: Project[];
  byId: Map<string, Project>;
  /** Not deleted, ordered by position: what pickers and settings show. */
  active: Project[];
  assignProject: (taskId: string, projectId: string | null) => void;
  createProject: (name: string, color: string | null) => Promise<Project>;
  updateProject: (id: string, body: { name?: string; color?: string | null }) => void;
  deleteProject: (id: string) => void;
  orderProjects: (ids: string[]) => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({
  projects,
  children,
  ...actions
}: Omit<ProjectsContextValue, "byId" | "active"> & { children: React.ReactNode }) {
  const { assignProject, createProject, updateProject, deleteProject, orderProjects } = actions;
  const value = useMemo<ProjectsContextValue>(() => {
    const active = projects
      .filter((p) => !p.deleted_at)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    return {
      projects,
      byId: new Map(projects.map((p) => [p.id, p])),
      active,
      assignProject,
      createProject,
      updateProject,
      deleteProject,
      orderProjects,
    };
  }, [projects, assignProject, createProject, updateProject, deleteProject, orderProjects]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

const EMPTY: ProjectsContextValue = {
  projects: [],
  byId: new Map(),
  active: [],
  assignProject: () => {},
  createProject: () => Promise.reject(new Error("ProjectsProvider missing")),
  updateProject: () => {},
  deleteProject: () => {},
  orderProjects: () => {},
};

/** Outside a provider (e.g. a standalone page) projects are simply empty. */
export function useProjects(): ProjectsContextValue {
  return useContext(ProjectsContext) ?? EMPTY;
}
