import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Search, Eye, EyeOff, CheckCircle2, XCircle,
  ChevronDown, RefreshCw, Users, Shield,
} from 'lucide-react';
import {
  fetchCollections,
  fetchAllProjects,
  fetchUsers,
  fetchRoles,
  fetchProjectTableVisibility,
  upsertProjectTableVisibility,
  fetchAllUserProjectAssignments,
  DatabaseError,
  type TableCollection,
  type AppUser,
  type RoleDef,
  type ProjectInfo,
  type ProjectTableVisibilityRow,
  type UserProjectAssignment,
  type VisibilityTarget,
} from '@/services/database';
import { useToast } from '@/components/Toast';
import { TLM_PRIMARY } from '@/config/theme';
import { collectionDisplayTitle } from '@/components/Sidebar';

export default function ProjectTableVisibility() {
  const { notify } = useToast();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [assignments, setAssignments] = useState<UserProjectAssignment[]>([]);
  const [allCollections, setAllCollections] = useState<TableCollection[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);
  const [targetType, setTargetType] = useState<VisibilityTarget>('user');
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [visibilityRows, setVisibilityRows] = useState<ProjectTableVisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVisibility, setLoadingVisibility] = useState(false);
  const [savingCollection, setSavingCollection] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [projs, cols, usrs, rls, asgns] = await Promise.all([
        fetchAllProjects().catch(() => []),
        fetchCollections().catch(() => []),
        fetchUsers().catch(() => []),
        fetchRoles().catch(() => []),
        fetchAllUserProjectAssignments().catch(() => []),
      ]);
      setProjects(projs);
      setAllCollections(cols);
      setUsers(usrs);
      setRoles(rls);
      setAssignments(asgns);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (err) {
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao carregar dados.';
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const usersForProject = useMemo(() => {
    if (selectedProjectId == null) return users;
    const assignedUserIds = new Set(
      assignments
        .filter((a) => String(a.projectId) === String(selectedProjectId))
        .map((a) => String(a.userId)),
    );
    return users.filter((u) => assignedUserIds.has(String(u.id)));
  }, [users, assignments, selectedProjectId]);

  const loadVisibility = useCallback(async (
    projectId: string | number,
    target: VisibilityTarget,
    userId: string | number | null,
    roleName: string | null,
  ) => {
    setLoadingVisibility(true);
    try {
      const rows = await fetchProjectTableVisibility(
        projectId,
        target === 'user' ? userId : undefined,
        target === 'role' ? roleName : undefined,
      );
      setVisibilityRows(rows);
    } catch {
      setVisibilityRows([]);
    } finally {
      setLoadingVisibility(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId != null) {
      loadVisibility(selectedProjectId, targetType, selectedUserId, selectedRoleName);
    } else {
      setVisibilityRows([]);
    }
  }, [selectedProjectId, targetType, selectedUserId, selectedRoleName, loadVisibility]);

  const visibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of visibilityRows) {
      map.set(row.collection_name, row.visible);
    }
    return map;
  }, [visibilityRows]);

  const isCollectionVisible = (collectionName: string): boolean => {
    if (visibilityMap.has(collectionName)) return visibilityMap.get(collectionName)!;
    return true;
  };

  const handleToggle = async (collectionName: string) => {
    if (selectedProjectId == null) return;
    const current = isCollectionVisible(collectionName);
    const next = !current;
    setSavingCollection(collectionName);
    setVisibilityRows((prev) => {
      const existing = prev.find((r) => r.collection_name === collectionName);
      if (existing) {
        return prev.map((r) =>
          r.collection_name === collectionName ? { ...r, visible: next } : r,
        );
      }
      return [...prev, {
        user_id: targetType === 'user' ? selectedUserId : null,
        role_name: targetType === 'role' ? selectedRoleName : null,
        project_id: selectedProjectId,
        collection_name: collectionName,
        visible: next,
      }];
    });
    try {
      await upsertProjectTableVisibility(
        selectedProjectId,
        collectionName,
        next,
        targetType === 'user' ? selectedUserId : null,
        targetType === 'role' ? selectedRoleName : null,
      );
      notify('success', next ? `Tabela "${collectionName}" agora visível.` : `Tabela "${collectionName}" ocultada.`);
    } catch (err) {
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao atualizar visibilidade.';
      notify('error', msg);
      setVisibilityRows((prev) => {
        const existing = prev.find((r) => r.collection_name === collectionName);
        if (existing) {
          return prev.map((r) =>
            r.collection_name === collectionName ? { ...r, visible: current } : r,
          );
        }
        return [...prev, {
          user_id: targetType === 'user' ? selectedUserId : null,
          role_name: targetType === 'role' ? selectedRoleName : null,
          project_id: selectedProjectId,
          collection_name: collectionName,
          visible: current,
        }];
      });
    } finally {
      setSavingCollection(null);
    }
  };

  const handleShowAll = async () => {
    if (selectedProjectId == null) return;
    for (const col of filteredCollections) {
      if (!isCollectionVisible(col.name)) {
        await handleToggle(col.name);
      }
    }
  };

  const handleHideAll = async () => {
    if (selectedProjectId == null) return;
    for (const col of filteredCollections) {
      if (isCollectionVisible(col.name)) {
        await handleToggle(col.name);
      }
    }
  };

  const filteredCollections = useMemo(() => {
    const list = allCollections.filter((c) => !c.hidden && c.template !== 'sql');
    if (!search) return list;
    return list.filter((c) =>
      collectionDisplayTitle(c).toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allCollections, search]);

  const visibleCount = filteredCollections.filter((c) => isCollectionVisible(c.name)).length;
  const hiddenCount = filteredCollections.length - visibleCount;

  const targetLabel = useMemo(() => {
    if (targetType === 'user') {
      if (selectedUserId == null) return 'Todos os utilizadores (geral)';
      const u = users.find((u) => String(u.id) === String(selectedUserId));
      return u ? (u.nickname || u.username || u.email) : `Utilizador ${selectedUserId}`;
    }
    if (selectedRoleName == null) return 'Todas as funções (geral)';
    return `Função: ${selectedRoleName}`;
  }, [targetType, selectedUserId, selectedRoleName, users]);

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
        <h2 className="text-lg font-bold text-slate-800 md:text-xl">Visibilidade de Tabelas</h2>
        <p className="text-sm text-slate-500">
          Escolha quais tabelas são visíveis para cada utilizador ou função dentro de cada projeto.
        </p>
      </div>

      {/* Project + Target selector + stats */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
          {/* Project selector */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="text-sm font-medium text-slate-600">Projeto:</label>
            <div className="relative">
              <select
                value={String(selectedProjectId ?? '')}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.nome}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Target type toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => { setTargetType('user'); setSelectedRoleName(null); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                targetType === 'user' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Utilizador
            </button>
            <button
              onClick={() => { setTargetType('role'); setSelectedUserId(null); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                targetType === 'role' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Função
            </button>
          </div>

          {/* User selector */}
          {targetType === 'user' && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="text-sm font-medium text-slate-600">Utilizador:</label>
              <div className="relative">
                <select
                  value={String(selectedUserId ?? '')}
                  onChange={(e) => setSelectedUserId(e.target.value === '' ? null : e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
                >
                  <option value="">Geral (todos)</option>
                  {usersForProject.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.nickname || u.username || u.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* Role selector */}
          {targetType === 'role' && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="text-sm font-medium text-slate-600">Função:</label>
              <div className="relative">
                <select
                  value={selectedRoleName ?? ''}
                  onChange={(e) => setSelectedRoleName(e.target.value === '' ? null : e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
                >
                  <option value="">Geral (todas)</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>{r.title || r.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">{visibleCount}</span> visíveis
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">{hiddenCount}</span> ocultas
          </span>
          <button
            onClick={() => selectedProjectId != null && loadVisibility(selectedProjectId, targetType, selectedUserId, selectedRoleName)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
        {targetType === 'user' ? <Users className="h-4 w-4 shrink-0" /> : <Shield className="h-4 w-4 shrink-0" />}
        <span>
          A configurar visibilidade para: <strong>{targetLabel}</strong>
          {selectedProjectId != null && (
            <> no projeto <strong>{projects.find((p) => String(p.id) === String(selectedProjectId))?.nome ?? ''}</strong></>
          )}
        </span>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar tabelas..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShowAll}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <Eye className="h-4 w-4" />
            Mostrar todas
          </button>
          <button
            onClick={handleHideAll}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
          >
            <EyeOff className="h-4 w-4" />
            Ocultar todas
          </button>
        </div>
      </div>

      {/* Collections list */}
      {loadingVisibility ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-400">A carregar visibilidade...</span>
        </div>
      ) : filteredCollections.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nenhuma tabela encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredCollections.map((col) => {
            const visible = isCollectionVisible(col.name);
            const isSaving = savingCollection === col.name;
            return (
              <button
                key={col.key ?? col.name}
                onClick={() => handleToggle(col.name)}
                disabled={isSaving}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  visible
                    ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                } ${isSaving ? 'opacity-60' : ''}`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={visible ? { background: TLM_PRIMARY } : { background: '#cbd5e1' }}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : visible ? (
                    <Eye className="h-4 w-4 text-white" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${visible ? 'text-slate-700' : 'text-slate-400'}`}>
                    {collectionDisplayTitle(col)}
                  </p>
                  <p className="truncate text-xs text-slate-400">{col.name}</p>
                </div>
                <div className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {visible ? 'Visível' : 'Oculto'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
