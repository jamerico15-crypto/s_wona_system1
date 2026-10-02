import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, FolderKanban, Plus, Trash2, Pencil, Loader2, AlertTriangle,
  RefreshCw, X, Search, ShieldCheck, ChevronDown, UserCircle, Check, Link2, Unlink,
} from 'lucide-react';
import {
  fetchUsers, fetchAllProjects, fetchAllUserProjectAssignments,
  createUserProjectAssignment, updateUserProjectAssignmentRole,
  deleteUserProjectAssignment, fetchRoles,
  DatabaseError, type AppUser, type RoleDef,
  type ProjectInfo, type UserProjectAssignment,
} from '@/services/database';
import { useToast } from '@/components/Toast';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';
import ConfirmDialog from '@/components/ConfirmDialog';

function roleLabel(role: string | null, roles: RoleDef[]): string {
  if (!role) return 'Sem role';
  const found = roles.find((r) => r.name === role.trim());
  return found ? (found.title || found.name) : role;
}

function roleBadgeClass(role: string | null): string {
  if (!role) return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  const r = role.trim().toLowerCase();
  if (r.includes('admin') || r === 'root' || r === 'super_admin') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  if (r.includes('editor') || r.includes('officer') || r.includes('merl') || r.includes('focal') || r.includes('field'))
    return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  if (r.includes('viewer') || r.includes('leitor') || r.includes('member'))
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
}

export default function UserProjectManager() {
  const { notify } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [assignments, setAssignments] = useState<UserProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserProjectAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<UserProjectAssignment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [roles, setRoles] = useState<RoleDef[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, p, a, r] = await Promise.all([
        fetchUsers(),
        fetchAllProjects(),
        fetchAllUserProjectAssignments(),
        fetchRoles(),
      ]);
      setUsers(u);
      setProjects(p);
      setAssignments(a);
      setRoles(r);
    } catch (err) {
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao carregar dados.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build a map: userId -> array of assignments
  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, UserProjectAssignment[]>();
    for (const a of assignments) {
      const key = String(a.userId);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [assignments]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.nickname ?? '').toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(selectedUserId)) ?? null,
    [users, selectedUserId],
  );

  const selectedUserAssignments = useMemo(
    () => assignmentsByUser.get(String(selectedUserId)) ?? [],
    [assignmentsByUser, selectedUserId],
  );

  // Projects not yet assigned to the selected user
  const availableProjects = useMemo(() => {
    if (!selectedUser) return [];
    const assignedIds = new Set(selectedUserAssignments.map((a) => String(a.projectId)));
    return projects.filter((p) => !assignedIds.has(String(p.id)));
  }, [projects, selectedUser, selectedUserAssignments]);

  const handleDelete = async () => {
    if (!deletingAssignment) return;
    setDeleteLoading(true);
    try {
      await deleteUserProjectAssignment(deletingAssignment.id);
      notify('success', 'Atribuição removida com sucesso.');
      setDeletingAssignment(null);
      loadData();
    } catch (err) {
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao remover atribuição.';
      notify('error', msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Gestão de Utilizadores por Projeto</h3>
            <p className="text-xs text-slate-500">Atribui e gere quais projetos cada utilizador pode aceder, com que role</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-emerald-50 px-5 py-2.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-xs text-emerald-700">
          As alterações são guardadas diretamente no Supabase (tabela <code className="rounded bg-emerald-100 px-1">usuarios_projetos</code>) e refletem-se imediatamente no Bolt.
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-900">Erro ao carregar dados</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">A carregar utilizadores e projetos...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* Left: Users list */}
          <div className="flex flex-col border-b border-slate-200 lg:w-80 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Procurar utilizador..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-400">
                {filteredUsers.length} utilizador{filteredUsers.length === 1 ? '' : 'es'}
              </p>
            </div>
            <div className="max-h-[50vh] flex-1 overflow-y-auto lg:max-h-[60vh]">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <UserCircle className="mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhum utilizador encontrado.</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredUsers.map((u) => {
                    const isActive = String(u.id) === String(selectedUserId);
                    const userAssignments = assignmentsByUser.get(String(u.id)) ?? [];
                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${
                          isActive
                            ? 'border-slate-300 bg-slate-50 shadow-sm'
                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: TLM_PRIMARY }}>
                          {(u.nickname || u.username || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                            {u.nickname || u.username || u.email}
                          </p>
                          <p className="truncate text-xs text-slate-400">{u.email}</p>
                        </div>
                        {userAssignments.length > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                            <FolderKanban className="h-3 w-3" />
                            {userAssignments.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected user's project assignments */}
          <div className="flex flex-1 flex-col bg-slate-50">
            {!selectedUser ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                  <Link2 className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-600">Seleciona um utilizador</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Clique num utilizador à esquerda para ver e gerir os projetos a que tem acesso.
                </p>
              </div>
            ) : (
              <>
                {/* User header */}
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white" style={{ background: TLM_PRIMARY }}>
                      {(selectedUser.nickname || selectedUser.username || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedUser.nickname || selectedUser.username || selectedUser.email}
                      </h3>
                      <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    disabled={availableProjects.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: TLM_PRIMARY }}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Atribuir Projeto</span>
                  </button>
                </div>

                {/* Assignments list */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {selectedUserAssignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                        <Unlink className="h-7 w-7 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Sem projetos atribuídos</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Este utilizador não tem acesso a nenhum projeto. Clique em "Atribuir Projeto" para começar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedUserAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: TLM_SECONDARY }}>
                            <FolderKanban className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{a.projectName}</p>
                            <p className="text-xs text-slate-400">
                              ID: <code className="rounded bg-slate-100 px-1">{String(a.projectId)}</code>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(a.role)}`}>
                              <ShieldCheck className="h-3 w-3" />
                              {roleLabel(a.role, roles)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                              <EditRoleButton
                                assignment={a}
                                roles={roles}
                                onUpdated={(newRole) => {
                                  setEditingAssignment(null);
                                  loadData();
                                }}
                                notify={notify}
                              />
                              <button
                                onClick={() => setDeletingAssignment(a)}
                                title="Remover acesso"
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableProjects.length === 0 && selectedUserAssignments.length > 0 && (
                    <p className="mt-4 text-center text-xs text-slate-400">
                      Todos os projetos já estão atribuídos a este utilizador.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && selectedUser && (
        <AssignProjectModal
          user={selectedUser}
          availableProjects={availableProjects}
          roles={roles}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            setShowAssignModal(false);
            loadData();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletingAssignment}
        title="Remover Acesso ao Projeto"
        message={deletingAssignment ? `Confirma remover o acesso de "${deletingAssignment.userNickname || deletingAssignment.userEmail || selectedUser?.email}" ao projeto "${deletingAssignment.projectName}"?` : ''}
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeletingAssignment(null)}
        loading={deleteLoading}
      />
    </div>
  );
}

function EditRoleButton({
  assignment,
  roles,
  onUpdated,
  notify,
}: {
  assignment: UserProjectAssignment;
  roles: RoleDef[];
  onUpdated: (newRole: string) => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newRole: string) => {
    setSaving(true);
    try {
      await updateUserProjectAssignmentRole(assignment.id, newRole);
      notify('success', `Role atualizado para "${roleLabel(newRole, roles)}".`);
      onUpdated(newRole);
    } catch (err) {
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao atualizar role.';
      notify('error', msg);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Editar role"
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <p className="mb-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Alterar Role</p>
            {roles.map((r) => (
              <button
                key={r.name}
                onClick={() => handleChange(r.name)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {r.title || r.name}
                {assignment.role === r.name && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AssignProjectModal({
  user,
  availableProjects,
  roles,
  onClose,
  onAssigned,
}: {
  user: AppUser;
  availableProjects: ProjectInfo[];
  roles: RoleDef[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { notify } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string | number>('');
  const [selectedRole, setSelectedRole] = useState(roles[0]?.name ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      notify('error', 'Selecione um projeto.');
      return;
    }
    setSubmitting(true);
    try {
      await createUserProjectAssignment(user.id, selectedProjectId, selectedRole);
      notify('success', 'Projeto atribuído com sucesso.');
      onAssigned();
    } catch (err) {
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao atribuir projeto.';
      notify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: TLM_PRIMARY }}>
              <Link2 className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Atribuir Projeto</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-4 md:p-6">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: TLM_PRIMARY }}>
              {(user.nickname || user.username || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user.nickname || user.username || user.email}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Projeto</label>
            {availableProjects.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                Todos os projetos já estão atribuídos a este utilizador.
              </p>
            ) : (
              <div className="relative">
                <select
                  value={String(selectedProjectId)}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                >
                  <option value="" disabled>Selecione um projeto...</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.nome}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Role no Projeto</label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              >
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>{r.title || r.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedProjectId || availableProjects.length === 0}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: TLM_PRIMARY }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Atribuir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
