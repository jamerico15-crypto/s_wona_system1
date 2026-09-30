import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table2, Loader2, Search, Eye, EyeOff, CheckCircle2, XCircle,
  Database, ChevronDown, RefreshCw,
} from 'lucide-react';
import {
  fetchCollections,
  fetchAllProjects,
  NocoDBError,
  type NocoBaseCollection,
  type ProjectInfo,
} from '@/services/nocodb';
import {
  fetchProjectTableVisibilitySupabase,
  upsertProjectTableVisibilitySupabase,
  type ProjectTableVisibilityRow,
} from '@/services/projectVisibility';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/hooks/useLanguage';
import { TLM_PRIMARY } from '@/config/theme';
import { collectionDisplayTitle } from '@/components/Sidebar';

export default function ProjectTableVisibility() {
  const { notify } = useToast();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [allCollections, setAllCollections] = useState<NocoBaseCollection[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);
  const [visibilityRows, setVisibilityRows] = useState<ProjectTableVisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVisibility, setLoadingVisibility] = useState(false);
  const [savingCollection, setSavingCollection] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const [projs, cols] = await Promise.all([
        fetchAllProjects(),
        fetchCollections(),
      ]);
      setProjects(projs);
      setAllCollections(cols);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao carregar dados.';
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadVisibility = useCallback(async (projectId: string | number) => {
    setLoadingVisibility(true);
    try {
      const rows = await fetchProjectTableVisibilitySupabase(projectId);
      setVisibilityRows(rows);
    } catch {
      setVisibilityRows([]);
    } finally {
      setLoadingVisibility(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId != null) {
      loadVisibility(selectedProjectId);
    } else {
      setVisibilityRows([]);
    }
  }, [selectedProjectId, loadVisibility]);

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
        project_id: selectedProjectId,
        collection_name: collectionName,
        visible: next,
      }];
    });
    try {
      await upsertProjectTableVisibilitySupabase(selectedProjectId, collectionName, next);
      notify('success', next ? `Tabela "${collectionName}" agora visível.` : `Tabela "${collectionName}" ocultada.`);
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao atualizar visibilidade.';
      notify('error', msg);
      setVisibilityRows((prev) => {
        const existing = prev.find((r) => r.collection_name === collectionName);
        if (existing) {
          return prev.map((r) =>
            r.collection_name === collectionName ? { ...r, visible: current } : r,
          );
        }
        return [...prev, {
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
        <h2 className="text-lg font-bold text-slate-800 md:text-xl">Tabelas por Projeto</h2>
        <p className="text-sm text-slate-500">
          Escolha quais tabelas são visíveis para cada projeto. Os utilizadores só verão as tabelas ativas quando entram no projeto.
        </p>
      </div>

      {/* Project selector + stats */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
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
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">{visibleCount}</span> visíveis
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <XCircle className="h-4 w-4" />
            <span className="font-medium">{hiddenCount}</span> ocultas
          </span>
          <button
            onClick={() => selectedProjectId != null && loadVisibility(selectedProjectId)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
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
