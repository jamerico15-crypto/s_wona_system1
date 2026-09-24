import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { isOlikanassa as isOlikanassaId, getProjectPrefix } from '@/config/projectConfig';

export type ProjectRole = 'super_admin' | 'admin_projeto' | 'editor_projeto' | 'leitor' | 'none';

export interface Project {
  id: string | number;
  nome: string;
  descricao?: string | null;
  status?: string | null;
  baseId?: string | null;
  apiToken?: string | null;
  table_prefix?: string | null;
}

export interface ProjectContextValue {
  activeProject: Project | null;
  projects: Project[];
  assignedProjects: Project[];
  projectRole: ProjectRole;
  accessDenied: boolean;
  setProjects: (projects: Project[]) => void;
  setAssignedProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  setProjectRole: (role: ProjectRole) => void;
  setAccessDenied: (denied: boolean) => void;
  resetProjectState: () => void;
  isOlikanassa: boolean;
  tablePrefix: string;
}

const STORAGE_KEY = 'nocobase_active_project';

export const ProjectContext = createContext<ProjectContextValue | null>(null);

function loadStoredProjectId(): string | number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjectsState] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projectRole, setProjectRoleState] = useState<ProjectRole>('none');
  const [accessDenied, setAccessDeniedState] = useState(false);

  useEffect(() => {
    const storedId = loadStoredProjectId();
    if (storedId && projects.length > 0) {
      const found = projects.find((p) => String(p.id) === String(storedId));
      if (found) setActiveProjectState(found);
    }
  }, [projects]);

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project.id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setProjects = useCallback((p: Project[]) => setProjectsState(p), []);
  const setAssignedProjects = useCallback((p: Project[]) => setAssignedProjectsState(p), []);
  const setProjectRole = useCallback((r: ProjectRole) => setProjectRoleState(r), []);
  const setAccessDenied = useCallback((d: boolean) => setAccessDeniedState(d), []);

  const resetProjectState = useCallback(() => {
    setActiveProjectState(null);
    setProjectRoleState('none');
    setAccessDeniedState(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isOlikanassa = useMemo(() => activeProject ? isOlikanassaId(activeProject.id) : false, [activeProject]);
  const tablePrefix = useMemo(() => {
    if (!activeProject) return '';
    if (activeProject.table_prefix) return activeProject.table_prefix;
    return getProjectPrefix(activeProject.id, activeProject.nome);
  }, [activeProject]);

  return (
    <ProjectContext.Provider value={{
      activeProject, projects, assignedProjects, projectRole, accessDenied,
      setProjects, setAssignedProjects, setActiveProject, setProjectRole, setAccessDenied, resetProjectState,
      isOlikanassa, tablePrefix,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
