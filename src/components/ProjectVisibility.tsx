import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Search, Eye, EyeOff, CheckCircle2, XCircle,
  ChevronDown, RefreshCw, Users, FolderKanban,
} from 'lucide-react';
import {
  fetchAllProjects,
  fetchUsers,
  fetchAllProjectVisibility,
  upsertProjectVisibility,
  NocoDBError,
  type NocoBaseUser,
  type ProjectInfo,
  type ProjectVisibilityRow,
} from '@/services/nocodb';
import { useToast } from '@/components/Toast';
import { TLM_PRIMARY } from '@/config/theme';

export default function ProjectVisibility() {
  const { notify } = useToast();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [users, setUsers] = useState<NocoBaseUser[]>([]);
  const [visibilityRows, setVisibilityRows] = useState<ProjectVisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVisibility, setLoadingVisibility] = useState(false);
  const [savingProject, setSavingProject] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [projs, usrs] = await Promise.all([
        fetchAllProjects().catch(() => []),
        fetchUsers().catch(() => []),
      ]);
      setProjects(projs);
      setUsers(usrs);
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao carregar dados.';
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadVisibility = useCallback(async () => {
    setLoadingVisibility(true);
    try {
      const rows = await fetchAllProjectVisibility();
      setVisibilityRows(rows);
    } catch {
      setVisibilityRows([]);
    } finally {
      setLoadingVisibility(false);
    }
  }, []);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const visibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of visibilityRows) {
      const key = `${row.user_id}:${row.project_id}`;
      map.set(key, row.visible);
    }
    return map;
  }, [visibilityRows]);

  const isProjectVisible = (userId: string | number, projectId: string | number): boolean => {
    const key = `${userId}:${projectId}`;
    if (visibilityMap.has(key)) return visibilityMap.get(key)!;
    return true;
  };

  const handleToggle = async (userId: string | number, projectId: string | number) => {
    const current = isProjectVisible(userId, projectId);
    const next = !current;
    const key = `${userId}:${projectId}`;
    setSavingProject(key);
    setVisibilityRows((prev) => {
      const existing = prev.find((r) => String(r.user_id) === String(userId) && String(r.project_id) === String(projectId));
      if (existing) {
        return prev.map((r) =>
          String(r.user_id) === String(userId) && String(r.project_id) === String(projectId)
            ? { ...r, visible: next }
            : r,
        );
      }
      return [...prev, { user_id: userId, project_id: projectId, visible: next }];
    });
    try {
      await upsertProjectVisibility(userId, projectId, next);
      notify('success', next ? 'Projeto agora visível.' : 'Projeto ocultado.');
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao atualizar visibilidade.';
      notify('error', msg);
      setVisibilityRows((prev) => {
        const existing = prev.find((r) => String(r.user_id) === String(userId) && String(r.project_id) === String(projectId));
        if (existing) {
          return prev.map((r) =>
            String(r.user_id) === String(userId) && String(r.project_id) === String(projectId)
              ? { ...r, visible: current }
              : r,
          );
        }
        return [...prev, { user_id: userId, project_id: projectId, visible: current }];
      });
    } finally {
      setSavingProject(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter((u) => {
      const name = u.nickname || u.username || u.email;
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [users, search]);

  const selectedUserLabel = useMemo(() => {
    if (selectedUserId == null) return 'Todos os utilizadores';
    const u = users.find((u) => String(u.id) === String(selectedUserId));
    return u ? (u.nickname || u.username || u.email) : `Utilizador ${selectedUserId}`;
  }, [selectedUserId, users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">A carregar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800 md:text-xl">Visibilidade de Projetos por Utilizador</h2>
        <p className="text-sm text-slate-500">
          Controle quais projetos cada utilizador pode ver. Clique no ícone do olho para mostrar ou ocultar um projeto para um utilizador específico.
        </p>
      </div>

      {/* User filter + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Filtrar por utilizador:</label>
            <div className="relative">
              <select
                value={String(selectedUserId ?? '')}
                onChange={(e) => setSelectedUserId(e.target.value === '' ? null : e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                <option value="">Todos os utilizadores</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.nickname || u.username || u.email}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <button
            onClick={loadVisibility}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar utilizadores..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
        <Users className="h-4 w-4 shrink-0" />
        <span>A mostrar visibilidade de projetos para: <strong>{selectedUserLabel}</strong></span>
      </div>

      {/* Matrix: users x projects */}
      {loadingVisibility ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-400">A carregar visibilidade...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum utilizador encontrado.</p>
      ) : projects.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum projeto encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Utilizador
                </th>
                {projects.map((p) => (
                  <th key={p.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <div className="flex flex-col items-center gap-1">
                      <FolderKanban className="h-4 w-4 text-slate-400" />
                      <span className="max-w-24 truncate" title={p.nome}>{p.nome}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers
                .filter((u) => selectedUserId == null || String(u.id) === String(selectedUserId))
                .map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TLM_PRIMARY }}>
                          {(u.nickname || u.username || u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{u.nickname || u.username || u.email}</span>
                      </div>
                    </td>
                    {projects.map((p) => {
                      const visible = isProjectVisible(u.id, p.id);
                      const key = `${u.id}:${p.id}`;
                      const isSaving = savingProject === key;
                      return (
                        <td key={p.id} className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleToggle(u.id, p.id)}
                            disabled={isSaving}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
                              visible
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } ${isSaving ? 'opacity-60' : ''}`}
                            title={visible ? 'Visível — clique para ocultar' : 'Oculto — clique para mostrar'}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : visible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
