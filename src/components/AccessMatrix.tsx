import { useState, useCallback, useEffect } from 'react';
import { ShieldCheck, Loader2, AlertCircle, RefreshCw, Eye, Crown, Pencil, UserCircle } from 'lucide-react';
import { fetchUsersWithProjects, NocoDBError, type NocoBaseUserWithProject } from '@/services/nocodb';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';

function roleBadgeClass(roles: string | null): string {
  if (!roles) return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  const r = roles.trim().toLowerCase();
  if (r.includes('admin') || r === 'root' || r === 'super_admin')
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  if (r.includes('editor') || r.includes('merl') || r.includes('officer') || r.includes('focal'))
    return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  if (r.includes('leitor') || r.includes('viewer') || r.includes('member'))
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
}

function roleIcon(roles: string | null) {
  if (!roles) return <Eye className="h-3 w-3" />;
  const r = roles.trim().toLowerCase();
  if (r.includes('admin') || r === 'root' || r === 'super_admin') return <Crown className="h-3 w-3" />;
  if (r.includes('editor') || r.includes('merl') || r.includes('officer') || r.includes('focal')) return <Pencil className="h-3 w-3" />;
  return <Eye className="h-3 w-3" />;
}

function roleLabel(roles: string | null): string {
  if (!roles) return 'Sem role';
  const r = roles.trim().toLowerCase();
  if (r.includes('admin') || r === 'root' || r === 'super_admin') return 'Administrador';
  if (r.includes('editor') || r.includes('merl') || r.includes('officer') || r.includes('focal')) return 'Editor';
  if (r.includes('leitor') || r.includes('viewer') || r.includes('member')) return 'Leitor';
  return roles;
}

export default function AccessMatrix() {
  const [users, setUsers] = useState<NocoBaseUserWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsersWithProjects();
      setUsers(data);
    } catch (err) {
      if (err instanceof NocoDBError) {
        if (err.status === 401 || err.status === 403) {
          setError('Erro ao conectar ao servidor externo NocoBase: acesso não autorizado (401/403).');
        } else {
          setError(`Erro ao conectar ao servidor externo NocoBase (${err.status}): ${err.message}`);
        }
      } else {
        setError('Erro ao conectar ao servidor externo NocoBase. Verifique a ligação de rede.');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const usersWithProject = users.filter((u) => u.active_project);
  const usersWithoutProject = users.filter((u) => !u.active_project);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Matriz de Controlo de Acessos</h3>
            <p className="text-xs text-slate-500">Espelho de consulta (só leitura) dos utilizadores e projetos ativos no NocoBase</p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-sky-50 px-5 py-2.5">
        <Eye className="h-3.5 w-3.5 text-sky-600" />
        <p className="text-xs text-sky-700">
          Modo de consulta. Os vínculos e atribuições são geridos centralmente no painel nativo do NocoBase.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-900">Erro ao conectar ao servidor externo NocoBase</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">A carregar utilizadores do NocoBase...</p>
        </div>
      ) : error ? null : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <UserCircle className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">Nenhum utilizador encontrado</p>
          <p className="mt-1 text-xs text-slate-400">O servidor NocoBase não retornou dados de utilizadores.</p>
        </div>
      ) : (
        <div className="px-5 py-4">
          {/* Stats */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Utilizadores</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{users.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Com Projeto Ativo</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{usersWithProject.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Sem Projeto</p>
              <p className="mt-1 text-2xl font-bold text-slate-400">{usersWithoutProject.length}</p>
            </div>
          </div>

          {/* Users table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Utilizador</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Papel (Roles)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Projeto Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{String(u.id)}</code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {(u.nickname || u.email).charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-700">{u.nickname || 'Sem nome'}</p>
                          <p className="truncate text-xs text-slate-400">{u.email || 'Sem email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(u.roles)}`}>
                        {roleIcon(u.roles)}
                        {roleLabel(u.roles)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.active_project ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          {u.active_project.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Nenhum projeto ativo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grouped by project */}
          {usersWithProject.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-bold text-slate-600">Utilizadores Agrupados por Projeto</h4>
              <div className="space-y-3">
                {Object.entries(
                  usersWithProject.reduce<Record<string, { projectName: string; users: NocoBaseUserWithProject[] }>>((acc, u) => {
                    const key = String(u.active_project!.id);
                    if (!acc[key]) acc[key] = { projectName: u.active_project!.nome, users: [] };
                    acc[key].users.push(u);
                    return acc;
                  }, {}),
                ).map(([projId, group]) => (
                  <div key={projId} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold" style={{ background: TLM_PRIMARY }}>
                          {group.projectName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{group.projectName}</span>
                      </div>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {group.users.length} {group.users.length === 1 ? 'utilizador' : 'utilizadores'}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.users.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/60">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                            {(u.nickname || u.email).charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-700">{u.nickname || 'Sem nome'}</p>
                            <p className="truncate text-xs text-slate-400">{u.email}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(u.roles)}`}>
                            {roleIcon(u.roles)}
                            {roleLabel(u.roles)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
