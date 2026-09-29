import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye, EyeOff, Table2, Search, Loader2, AlertTriangle, RefreshCw,
  Filter, FolderKanban, ChevronDown,
} from 'lucide-react';
import {
  fetchCollections, fetchAllProjects, NocoDBError,
  type NocoBaseCollection,
  type ProjectInfo,
} from '@/services/nocodb';
import { useVisibility } from '@/hooks/useVisibility';
import { useToast } from '@/components/Toast';
import { displayTitle } from '@/components/Sidebar';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';

export default function TableVisibilityManager() {
  const { notify } = useToast();
  const { collectionVisible, toggleCollection, loading: visLoading } = useVisibility();
  const [collections, setCollections] = useState<NocoBaseCollection[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [prefixFilter, setPrefixFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cols, projs] = await Promise.all([
        fetchCollections(),
        fetchAllProjects(),
      ]);
      setCollections(cols.filter((c) => !c.hidden && c.template !== 'sql'));
      setProjects(projs);
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao carregar tabelas.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b))),
    [collections],
  );

  const filteredCollections = useMemo(() => {
    let result = sortedCollections;
    if (prefixFilter !== 'all') {
      if (prefixFilter === 'global') {
        result = result.filter((c) => !projects.some((p) => p.table_prefix && c.name.startsWith(p.table_prefix)));
      } else {
        result = result.filter((c) => c.name.startsWith(prefixFilter));
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => displayTitle(c).toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }
    return result;
  }, [sortedCollections, prefixFilter, search, projects]);

  const visibleCount = filteredCollections.filter((c) => collectionVisible(c.name)).length;
  const hiddenCount = filteredCollections.length - visibleCount;

  const handleToggle = (c: NocoBaseCollection) => {
    const wasVisible = collectionVisible(c.name);
    toggleCollection(c.name);
    notify(
      wasVisible ? 'info' : 'success',
      wasVisible
        ? `Tabela "${displayTitle(c)}" ocultada.`
        : `Tabela "${displayTitle(c)}" visível.`,
    );
  };

  const handleShowAll = () => {
    filteredCollections.forEach((c) => {
      if (!collectionVisible(c.name)) toggleCollection(c.name);
    });
    notify('success', 'Todas as tabelas filtradas estão visíveis.');
  };

  const handleHideAll = () => {
    filteredCollections.forEach((c) => {
      if (collectionVisible(c.name)) toggleCollection(c.name);
    });
    notify('info', 'Todas as tabelas filtradas foram ocultadas.');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Visibilidade de Tabelas</h3>
            <p className="text-xs text-slate-500">Oculta ou mostra tabelas individuais. Filtra por projeto/prefixo para gerir conjuntos específicos.</p>
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
      <div className="flex items-center gap-2 border-b border-slate-100 bg-sky-50 px-5 py-2.5">
        <Filter className="h-3.5 w-3.5 text-sky-600" />
        <p className="text-xs text-sky-700">
          As tabelas ocultadas não aparecem na barra lateral nem na lista de tabelas do projeto. A filtragem por prefixo mostra apenas tabelas cujo nome começa com o prefixo do projeto selecionado.
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-900">Erro ao carregar tabelas</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {loading || visLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">A carregar tabelas...</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Procurar tabela..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>

              {/* Prefix filter */}
              <div className="relative sm:w-56">
                <select
                  value={prefixFilter}
                  onChange={(e) => setPrefixFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                >
                  <option value="all">Todos os projetos (sem filtro)</option>
                  <option value="global">Tabelas globais (sem prefixo)</option>
                  {projects.filter((p) => p.table_prefix).map((p) => (
                    <option key={p.id} value={p.table_prefix!}>
                      {p.nome} ({p.table_prefix})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShowAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Mostrar todas
              </button>
              <button
                onClick={handleHideAll}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Ocultar todas
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
            <span className="text-xs font-medium text-slate-500">
              {filteredCollections.length} tabela{filteredCollections.length === 1 ? '' : 's'}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Eye className="h-3 w-3" />
              {visibleCount} visíveis
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
              <EyeOff className="h-3 w-3" />
              {hiddenCount} ocultas
            </span>
          </div>

          {/* Table list */}
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {filteredCollections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Table2 className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">Nenhuma tabela encontrada com os filtros atuais.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCollections.map((c) => {
                  const visible = collectionVisible(c.name);
                  return (
                    <div
                      key={c.key}
                      className={`group flex items-center gap-3 rounded-xl border p-3 transition ${
                        visible
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          : 'border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                          visible ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Table2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${visible ? 'text-slate-800' : 'text-slate-400'}`}>
                          {displayTitle(c)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          <code className="rounded bg-slate-100 px-1">{c.name}</code>
                        </p>
                      </div>
                      <ToggleSwitch checked={visible} onChange={() => handleToggle(c)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-blue-500' : 'bg-slate-300'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
