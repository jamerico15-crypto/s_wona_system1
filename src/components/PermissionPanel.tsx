import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck, Search, Loader2, AlertTriangle, RefreshCw,
  Eye, Plus, Pencil, Trash2, ChevronRight, Table2, Users,
} from 'lucide-react';
import {
  fetchTablePermissions,
  upsertTablePermission,
  deleteTablePermission,
  fetchRoles,
  type TablePermissionRow,
  type TablePermission,
  type NocoBaseRole,
} from '@/services/nocodb';
import type { NocoBaseCollection } from '@/types/nocodb';
import { useToast } from '@/components/Toast';
import { displayTitle } from '@/components/Sidebar';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';



const PERMISSION_META: { key: TablePermission; label: string; icon: typeof Eye; color: string }[] = [
  { key: 'view', label: 'Visualizar', icon: Eye, color: 'text-blue-600' },
  { key: 'create', label: 'Criar', icon: Plus, color: 'text-emerald-600' },
  { key: 'edit', label: 'Editar', icon: Pencil, color: 'text-amber-600' },
  { key: 'delete', label: 'Eliminar', icon: Trash2, color: 'text-rose-600' },
];

interface PermissionPanelProps {
  collections: NocoBaseCollection[];
}

export default function PermissionPanel({ collections }: PermissionPanelProps) {
  const { notify } = useToast();
  const [roles, setRoles] = useState<NocoBaseRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [search, setSearch] = useState('');
  const [permissions, setPermissions] = useState<TablePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  const loadPermissions = useCallback(async (role: string) => {
    setLoading(true);
    try {
      const data = await fetchTablePermissions(role);
      setPermissions(data);
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles()
      .then((r) => {
        setRoles(r);
        if (r.length > 0 && !selectedRole) setSelectedRole(r[0].name);
      })
      .catch(() => {});
  }, [selectedRole]);

  useEffect(() => {
    if (selectedRole) loadPermissions(selectedRole);
  }, [selectedRole, loadPermissions]);

  const permMap = useMemo(() => {
    const map: Record<string, TablePermissionRow> = {};
    for (const p of permissions) {
      map[p.collection_name] = p;
    }
    return map;
  }, [permissions]);

  const filteredCollections = useMemo(() => {
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter(
      (c) => c.name.toLowerCase().includes(q) || displayTitle(c).toLowerCase().includes(q),
    );
  }, [collections, search]);

  const getPerm = (collectionName: string, perm: TablePermission): boolean => {
    const row = permMap[collectionName];
    if (!row) return false;
    switch (perm) {
      case 'view': return row.can_view;
      case 'create': return row.can_create;
      case 'edit': return row.can_edit;
      case 'delete': return row.can_delete;
    }
  };

  const handleToggle = useCallback(
    async (collectionName: string, perm: TablePermission, value: boolean) => {
      const key = `${collectionName}:${perm}`;
      setSaving(key);
      // Optimistic update
      setPermissions((prev) => {
        const existing = prev.find((p) => p.collection_name === collectionName);
        if (existing) {
          return prev.map((p) =>
            p.collection_name === collectionName
              ? { ...p, [`can_${perm}`]: value }
              : p,
          );
        }
        return [
          ...prev,
          {
            role_name: selectedRole,
            collection_name: collectionName,
            can_view: perm === 'view' ? value : false,
            can_create: perm === 'create' ? value : false,
            can_edit: perm === 'edit' ? value : false,
            can_delete: perm === 'delete' ? value : false,
          },
        ];
      });
      try {
        await upsertTablePermission(selectedRole, collectionName, perm, value);
        notify('success', `Permissao atualizada para ${collectionName}`);
      } catch {
        notify('error', `Erro ao atualizar permissao para ${collectionName}`);
        // Revert
        loadPermissions(selectedRole);
      } finally {
        setSaving(null);
      }
    },
    [selectedRole, notify, loadPermissions],
  );

  const handleClearAll = useCallback(
    async (collectionName: string) => {
      setSaving(`clear:${collectionName}`);
      try {
        await deleteTablePermission(selectedRole, collectionName);
        notify('success', `Permissoes removidas para ${collectionName}`);
        loadPermissions(selectedRole);
      } catch {
        notify('error', `Erro ao remover permissoes`);
      } finally {
        setSaving(null);
      }
    },
    [selectedRole, notify, loadPermissions],
  );

  const handleClearAllForRole = useCallback(async () => {
    setSaving('clear-all');
    try {
      for (const c of collections) {
        await deleteTablePermission(selectedRole, c.name);
      }
      notify('success', `Todas as permissoes removidas para ${selectedRole}`);
      setPermissions([]);
    } catch {
      notify('error', 'Erro ao remover permissoes');
    } finally {
      setSaving(null);
    }
  }, [selectedRole, collections, notify]);

  const activeCollectionData = collections.find((c) => c.name === activeCollection);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white md:h-10 md:w-10"
              style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}
            >
              <ShieldCheck className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 md:text-lg">Permissoes por Tabela e Cargo</h2>
              <p className="text-xs text-slate-500">
                Atribua permissoes de visualizar, criar, editar e eliminar por cargo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role selector */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>{r.title || r.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleClearAllForRole}
              disabled={saving === 'clear-all' || permissions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Limpar tudo</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar tabelas..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
        </div>
      </div>

      {/* Split: collections list + detail */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: Collections list */}
        <div className="flex h-48 shrink-0 flex-col border-b border-slate-200 bg-white md:h-auto md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-medium text-slate-400">
              {filteredCollections.length} tabela{filteredCollections.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <Table2 className="mb-2 h-6 w-6 text-slate-300" />
                <p className="text-xs text-slate-400">Nenhuma tabela encontrada</p>
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {filteredCollections.map((c) => {
                  const isActive = activeCollection === c.name;
                  const row = permMap[c.name];
                  const permCount = row
                    ? [row.can_view, row.can_create, row.can_edit, row.can_delete].filter(Boolean).length
                    : 0;
                  return (
                    <div
                      key={c.key}
                      onClick={() => setActiveCollection(c.name)}
                      className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                        isActive
                          ? 'border-slate-300 bg-slate-50 shadow-sm'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          permCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Table2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {displayTitle(c)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          <code className="rounded bg-slate-100 px-1">{c.name}</code>
                        </p>
                      </div>
                      {permCount > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">
                          {permCount} perm
                        </span>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-slate-600' : 'text-slate-300 group-hover:text-slate-400'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Permission detail */}
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          {!activeCollectionData ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <ShieldCheck className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-600">Selecione uma tabela</h3>
              <p className="mt-1 text-sm text-slate-400">
                Escolha uma tabela para configurar as permissoes do cargo {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Detail header */}
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Table2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 md:text-base">
                    {displayTitle(activeCollectionData)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    <code className="rounded bg-slate-100 px-1">{activeCollectionData.name}</code>
                    {' · '}
                    Cargo: <span className="font-medium text-slate-700">
                      {roles.find((r) => r.name === selectedRole)?.title || selectedRole}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleClearAll(activeCollectionData.name)}
                  disabled={saving === `clear:${activeCollectionData.name}` || !permMap[activeCollectionData.name]}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover regras
                </button>
              </div>

              {/* Permission toggles */}
              <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
                <div className="mx-auto max-w-2xl space-y-3">
                  <p className="text-sm font-medium text-slate-600">
                    Atribua as permissoes para o cargo{' '}
                    <span className="font-bold text-slate-800">
                      {roles.find((r) => r.name === selectedRole)?.title || selectedRole}
                    </span>{' '}
                    na tabela{' '}
                    <span className="font-bold text-slate-800">{displayTitle(activeCollectionData)}</span>:
                  </p>

                  {PERMISSION_META.map((meta) => {
                    const value = getPerm(activeCollectionData.name, meta.key);
                    const isSaving = saving === `${activeCollectionData.name}:${meta.key}`;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={meta.key}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              value ? `bg-slate-100 ${meta.color}` : 'bg-slate-50 text-slate-300'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                            <p className="text-xs text-slate-400">
                              {value
                                ? `Permite ${meta.label.toLowerCase()} registos nesta tabela`
                                : `Nao permite ${meta.label.toLowerCase()} registos nesta tabela`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggle(activeCollectionData.name, meta.key, !value)}
                          disabled={isSaving}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                            value ? 'bg-emerald-500' : 'bg-slate-200'
                          } disabled:opacity-50`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}

                  {/* Summary */}
                  <div className="mt-6 rounded-xl bg-slate-100 p-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <p>
                        Se nenhuma permissao estiver definida para um cargo, o sistema usa as regras
                        por defeito baseadas no nome do cargo. Para override explicito, ative ou
                        desative pelo menos uma permissao acima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
