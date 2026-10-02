import { createContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { signIn as apiSignIn, fetchRecords, fetchUserWithProjects, validateProjectAccess, type AppUser } from '@/services/database';
import type { Project } from '@/contexts/ProjectContext';
import type { ProjectRole } from '@/contexts/ProjectContext';

export type AppRole = 'super_admin' | 'admin' | 'editor' | 'leitor';

export interface ProjectAssignment {
  projectId: string | number;
  role: string;
}

export interface AuthState {
  user: AppUser | null;
  token: string | null;
  role: AppRole;
  loading: boolean;
  assignedProjects: Project[];
  projectAssignments: ProjectAssignment[];
  serverActiveProjectId: string | number | null;
  serverActiveProject: Project | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  validateProjectRole: (projectId: string | number) => Promise<ProjectRole>;
  refreshActiveProject: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

function mapRole(user: AppUser): AppRole {
  const roleNames = user.roles.map((r) => r.name.trim().toLowerCase());

  if (roleNames.some((n) =>
    n === 'super_admin' || n === 'root'
    || n.startsWith('super') || n === 'system_admin'
  )) return 'super_admin';

  if (roleNames.some((n) =>
    n.includes('admin') || n.includes('manager') || n.includes('cdpm')
    || n.includes('pso') || n.includes('country_leader') || n.includes('leader')
    || n.includes('it_media')
  )) return 'admin';

  if (roleNames.some((n) =>
    n.includes('editor') || n.includes('merl') || n.includes('comms')
    || n.includes('member') || n.includes('officer') || n.includes('focal')
    || n.includes('safeguarding') || n.includes('climate')
  )) return 'editor';

  if (roleNames.length > 0) return 'editor';

  return 'editor';
}

export function mapAssignmentRole(roleName: string | null): ProjectRole {
  if (!roleName) return 'none';
  const r = roleName.trim().toLowerCase();
  if (r === 'manager' || r === 'super_admin' || r === 'admin' || r.includes('admin_projeto') || r.includes('admin')) return 'admin_projeto';
  if (r === 'field_worker' || r.includes('editor') || r.includes('merl') || r.includes('officer') || r.includes('focal')) return 'editor_projeto';
  if (r === 'viewer' || r.includes('leitor') || r.includes('viewer') || r.includes('member')) return 'leitor';
  return 'leitor';
}

function mapProjectRole(roleName: string | null): ProjectRole {
  return mapAssignmentRole(roleName);
}

async function fetchProjectAssignments(user: AppUser, token?: string | null): Promise<{ projects: Project[]; assignments: ProjectAssignment[] }> {
  // Strategy 1: Supabase users API with nested appends
  // GET /api/users/:userId?appends=usuarios_projetos.projeto_id
  try {
    const userData = await fetchUserWithProjects(user.id, token);
    if (userData) {
      const upRows = (userData.usuarios_projetos ?? []) as Record<string, unknown>[];
      if (upRows.length > 0) {
        const projects: Project[] = [];
        const assignments: ProjectAssignment[] = [];
        for (const upRow of upRows) {
          const projRow = upRow.projeto_id as Record<string, unknown> | undefined;
          const role = (upRow.role_no_projeto ?? upRow.role) as string | null;
          if (projRow && typeof projRow === 'object' && projRow.id != null) {
            const proj: Project = {
              id: projRow.id as string | number,
              nome: (projRow.nome as string) ?? `Projeto ${projRow.id}`,
              descricao: (projRow.descricao as string | null) ?? null,
              status: (projRow.status as string | null) ?? null,
              table_prefix: (projRow.table_prefix as string | null) ?? null,
            };
            projects.push(proj);
            assignments.push({ projectId: proj.id, role: role ?? 'viewer' });
          }
        }
        if (projects.length > 0) return { projects, assignments };
      }
    }
  } catch {
    // fall through
  }

  // Strategy 2: query usuarios_projetos directly with appends, filter by user
  try {
    const filter = {
      $or: [
        { usuario_fkey: user.id },
        { user_id: user.id },
        { usuario_id: user.id },
      ],
    };
    const data = await fetchRecords('usuarios_projetos', {
      page: 1,
      pageSize: 200,
      filter,
      appends: ['projeto_id'],
    });
    const rows = data.data ?? [];
    if (rows.length > 0) {
      const projects: Project[] = [];
      const assignments: ProjectAssignment[] = [];
      for (const row of rows) {
        const projRow = (row.projeto_id ?? row.projeto) as Record<string, unknown> | undefined;
        const role = (row.role_no_projeto ?? row.role ?? row.tipo_role ?? row.role_projeto) as string | null;
        if (projRow && typeof projRow === 'object' && projRow.id != null) {
          const proj: Project = {
            id: projRow.id as string | number,
            nome: (projRow.nome as string) ?? `Projeto ${projRow.id}`,
            descricao: (projRow.descricao as string | null) ?? null,
            status: (projRow.status as string | null) ?? null,
            table_prefix: (projRow.table_prefix as string | null) ?? null,
          };
          projects.push(proj);
          assignments.push({ projectId: proj.id, role: role ?? 'viewer' });
        }
      }
      if (projects.length > 0) return { projects, assignments };
    }
  } catch {
    // fall through
  }

  // Strategy 3: query usuarios_projetos without filter, match client-side
  try {
    const data = await fetchRecords('usuarios_projetos', {
      page: 1,
      pageSize: 500,
      appends: ['projeto_id'],
    });
    const userIdStr = String(user.id);
    const rows = (data.data ?? []).filter((row) => {
      const uid = row.usuario_fkey ?? row.user_id ?? row.usuario_id;
      return uid != null && String(uid) === userIdStr;
    });
    if (rows.length > 0) {
      const projects: Project[] = [];
      const assignments: ProjectAssignment[] = [];
      for (const row of rows) {
        const projRow = (row.projeto_id ?? row.projeto) as Record<string, unknown> | undefined;
        const role = (row.role_no_projeto ?? row.role ?? row.tipo_role ?? row.role_projeto) as string | null;
        if (projRow && typeof projRow === 'object' && projRow.id != null) {
          const proj: Project = {
            id: projRow.id as string | number,
            nome: (projRow.nome as string) ?? `Projeto ${projRow.id}`,
            descricao: (projRow.descricao as string | null) ?? null,
            status: (projRow.status as string | null) ?? null,
            table_prefix: (projRow.table_prefix as string | null) ?? null,
          };
          projects.push(proj);
          assignments.push({ projectId: proj.id, role: role ?? 'viewer' });
        }
      }
      if (projects.length > 0) return { projects, assignments };
    }
  } catch {
    // fall through
  }

  return { projects: [], assignments: [] };
}

const STORAGE_KEY = 'supabase_active_project';

function loadStoredProjectId(): string | number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [serverActiveProjectId, setServerActiveProjectId] = useState<string | number | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await apiSignIn(email, password);
      setUser(result.user);
      setToken(result.token);
      const appRole = mapRole(result.user);
      if (appRole !== 'super_admin') {
        const { projects, assignments } = await fetchProjectAssignments(result.user, result.token);
        setAssignedProjects(projects);
        setProjectAssignments(assignments);
        // Auto-select first project if one exists
        if (projects.length > 0) {
          setServerActiveProjectId(projects[0].id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects[0].id));
        } else {
          setServerActiveProjectId(null);
        }
      } else {
        setAssignedProjects([]);
        setProjectAssignments([]);
        setServerActiveProjectId(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setAssignedProjects([]);
    setProjectAssignments([]);
    setServerActiveProjectId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshActiveProject = useCallback(() => {
    if (!user) return;
    const appRole = mapRole(user);
    if (appRole === 'super_admin') return;
    fetchProjectAssignments(user, token).then(({ projects, assignments }) => {
      setAssignedProjects(projects);
      setProjectAssignments(assignments);
      if (projects.length > 0 && !serverActiveProjectId) {
        setServerActiveProjectId(projects[0].id);
      }
    }).catch(() => {});
  }, [user, token, serverActiveProjectId]);

  const validateProjectRole = useCallback(async (projectId: string | number): Promise<ProjectRole> => {
    if (!user) return 'none';
    const appRole = mapRole(user);
    if (appRole === 'super_admin') return 'super_admin';
    const assignment = projectAssignments.find((a) => String(a.projectId) === String(projectId));
    if (assignment) return mapAssignmentRole(assignment.role);
    try {
      const role = await validateProjectAccess(user.id, projectId);
      return mapProjectRole(role);
    } catch {
      return 'none';
    }
  }, [user, projectAssignments]);

  const serverActiveProject = useMemo<Project | null>(() => {
    if (!serverActiveProjectId) return null;
    return assignedProjects.find((p) => String(p.id) === String(serverActiveProjectId)) ?? null;
  }, [serverActiveProjectId, assignedProjects]);

  const role = user ? mapRole(user) : 'leitor';

  return (
    <AuthContext.Provider value={{
      user, token, role, loading, assignedProjects, projectAssignments,
      serverActiveProjectId, serverActiveProject,
      login, logout, validateProjectRole, refreshActiveProject,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
