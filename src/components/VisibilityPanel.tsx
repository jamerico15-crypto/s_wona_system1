import { useState, useEffect, useCallback, useMemo, type MouseEvent } from 'react';
import {
  Table2, Eye, EyeOff, Search, Loader2, AlertTriangle, RefreshCw,
  Rows3, Rows4, ChevronRight, Columns3, Info, Users,
} from 'lucide-react';
import { fetchFields, fetchRoles, DatabaseError } from '@/services/database';
import type { TableCollection, FieldDef } from '@/types/database';
import type { RoleDef } from '@/services/database';
import { useVisibility } from '@/hooks/useVisibility';
import { useLanguage } from '@/hooks/useLanguage';

import { useToast } from '@/components/Toast';
import { displayTitle } from '@/components/Sidebar';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';



interface VisibilityPanelProps {
  collections: TableCollection[];
}

export default function VisibilityPanel({ collections }: VisibilityPanelProps) {
  const { notify } = useToast();
  const { t } = useLanguage();
  const {
    collectionVisible,
    fieldVisible,
    toggleCollection,
    toggleField,
    density,
    setDensity,
    hiddenFieldCount,
    activeRole,
    setActiveRole,
    loading: visibilityLoading,
  } = useVisibility();

  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [activeCollectionName, setActiveCollectionName] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b))),
    [collections],
  );

  const filteredCollections = useMemo(
    () =>
      sortedCollections.filter((c) =>
        displayTitle(c).toLowerCase().includes(tableSearch.toLowerCase()),
      ),
    [sortedCollections, tableSearch],
  );

  const filteredFields = useMemo(
    () =>
      fields.filter((f) => {
        const label = (f.title || f.name).toLowerCase();
        return label.includes(fieldSearch.toLowerCase());
      }),
    [fields, fieldSearch],
  );

  const activeCollection = useMemo(
    () => collections.find((c) => c.name === activeCollectionName) ?? null,
    [collections, activeCollectionName],
  );

  const loadFields = useCallback(async (name: string, signal?: AbortSignal) => {
    setLoadingFields(true);
    setFieldError(null);
    try {
      const data = await fetchFields(name, signal);
      setFields(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof DatabaseError ? err.message : t('visibility.errorLoadingFields');
      setFieldError(msg);
      setFields([]);
    } finally {
      setLoadingFields(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCollectionName) return;
    const controller = new AbortController();
    setFields([]);
    loadFields(activeCollectionName, controller.signal);
    return () => controller.abort();
  }, [activeCollectionName, loadFields]);

  const handleToggleCollection = (c: TableCollection) => {
    const wasVisible = collectionVisible(c.name);
    toggleCollection(c.name);
    notify(
      wasVisible ? 'info' : 'success',
      wasVisible
        ? t('visibility.tableHidden', { name: displayTitle(c) })
        : t('visibility.tableVisible', { name: displayTitle(c) }),
    );
  };

  const handleToggleField = (field: FieldDef) => {
    const wasVisible = fieldVisible(activeCollectionName!, field.name);
    toggleField(activeCollectionName!, field.name);
    notify(
      wasVisible ? 'info' : 'success',
      wasVisible
        ? t('visibility.fieldHidden', { name: field.title || field.name })
        : t('visibility.fieldVisible', { name: field.title || field.name }),
    );
  };

  const handleShowAllFields = () => {
    if (!activeCollectionName) return;
    fields.forEach((f) => {
      if (!fieldVisible(activeCollectionName, f.name)) {
        toggleField(activeCollectionName, f.name);
      }
    });
    notify('success', t('visibility.allFieldsVisible'));
  };

  const handleHideAllFields = () => {
    if (!activeCollectionName) return;
    fields.forEach((f) => {
      if (fieldVisible(activeCollectionName, f.name)) {
        toggleField(activeCollectionName, f.name);
      }
    });
    notify('info', t('visibility.allFieldsHidden'));
  };

  const rowPadding = density === 'comfortable' ? 'px-4 py-4' : 'px-4 py-2.5';
  const titleSize = density === 'comfortable' ? 'text-sm' : 'text-sm';
  const subtitleSize = density === 'comfortable' ? 'text-xs' : 'text-xs';

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
              <Eye className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 md:text-lg">Visibilidade de Tabelas e Campos</h2>
              <p className="text-xs text-slate-500">
                Controle quais tabelas e campos aparecem na visualização de dados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role selector */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <select
                value={activeRole ?? ''}
                onChange={(e) => setActiveRole(e.target.value || null)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                <option value="">Todos os cargos (global)</option>
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>{r.title || r.name}</option>
                ))}
              </select>
            </div>

            {/* Density selector */}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs font-medium text-slate-400">{t('visibility.density')}</span>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  onClick={() => setDensity('compact')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    density === 'compact'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Rows3 className="h-3.5 w-3.5" />
                  {t('visibility.compact')}
                </button>
                <button
                  onClick={() => setDensity('comfortable')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    density === 'comfortable'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Rows4 className="h-3.5 w-3.5" />
                  {t('visibility.comfortable')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Split screen */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: Collections list */}
        <div className="flex h-48 shrink-0 flex-col border-b border-slate-200 bg-white md:h-auto md:w-80 md:border-b-0 md:border-r">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={t('visibility.searchTables')}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-400">
              {filteredCollections.length === 1 ? t('visibility.tablesCountSingular', { n: filteredCollections.length }) : t('visibility.tablesCount', { n: filteredCollections.length })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredCollections.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Table2 className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">{t('visibility.noTablesFound')}</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredCollections.map((c) => {
                  const visible = collectionVisible(c.name);
                  const isActive = activeCollectionName === c.name;
                  const hidden = hiddenFieldCount(c.name);
                  return (
                    <div
                      key={c.key}
                      onClick={() => setActiveCollectionName(c.name)}
                      className={`group flex cursor-pointer items-center gap-3 rounded-xl border transition ${
                        isActive
                          ? 'border-slate-300 bg-slate-50 shadow-sm'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      } ${rowPadding}`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                          visible
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Table2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-semibold ${titleSize} ${
                            visible ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {displayTitle(c)}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={`truncate ${subtitleSize} text-slate-400`}>
                            <code className="rounded bg-slate-100 px-1">{c.name}</code>
                          </p>
                          {hidden > 0 && (
                            <span className={`flex items-center gap-0.5 ${subtitleSize} text-amber-500`}>
                              <EyeOff className="h-3 w-3" />
                              {hidden}
                            </span>
                          )}
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={visible}
                        onChange={() => handleToggleCollection(c)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition ${
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

        {/* Right: Fields panel */}
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          {!activeCollection ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <Columns3 className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-600">{t('visibility.selectTable')}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {t('visibility.selectTableDesc')}
              </p>
            </div>
          ) : fieldError ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-7 w-7 text-rose-600" />
              </div>
              <h3 className="text-base font-semibold text-rose-900">{t('visibility.errorLoadingFields')}</h3>
              <p className="mt-1 max-w-sm text-sm text-rose-700">{fieldError}</p>
              <button
                onClick={() => loadFields(activeCollection.name)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                <RefreshCw className="h-4 w-4" />
                {t('visibility.tryAgain')}
              </button>
            </div>
          ) : (
            <>
              {/* Fields header */}
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10 ${
                      collectionVisible(activeCollection.name)
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Table2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 md:text-base">
                      {displayTitle(activeCollection)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {fields.length === 1 ? t('visibility.fieldCount', { n: fields.length, s: '' }) : t('visibility.fieldCount', { n: fields.length, s: 's' })} ·{' '}
                      {hiddenFieldCount(activeCollection.name) === 1 ? t('visibility.hiddenCount', { n: hiddenFieldCount(activeCollection.name), s: '' }) : t('visibility.hiddenCount', { n: hiddenFieldCount(activeCollection.name), s: 's' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShowAllFields}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('visibility.showAll')}</span>
                    <span className="sm:hidden">{t('visibility.showAllShort')}</span>
                  </button>
                  <button
                    onClick={handleHideAllFields}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('visibility.hideAll')}</span>
                    <span className="sm:hidden">{t('visibility.hideAllShort')}</span>
                  </button>
                </div>
              </div>

              {/* Field search */}
              <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    placeholder={t('visibility.searchFields')}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
              </div>

              {/* Fields list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                {loadingFields ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : filteredFields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Columns3 className="mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      {fieldSearch ? t('visibility.noFieldsFound') : t('visibility.noFields')}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Column headers */}
                    <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="w-8" />
                      <div className="flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t('visibility.colField')}
                      </div>
                      <div className="w-32 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t('visibility.colType')}
                      </div>
                      <div className="w-20 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t('visibility.colStatus')}
                      </div>
                    </div>

                    {filteredFields.map((f, idx) => {
                      const visible = fieldVisible(activeCollection.name, f.name);
                      return (
                        <div
                          key={f.key}
                          className={`flex items-center gap-3 transition ${
                            idx !== filteredFields.length - 1 ? 'border-b border-slate-100' : ''
                          } ${rowPadding} hover:bg-blue-50/40`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              visible
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate font-semibold ${titleSize} ${
                                visible ? 'text-slate-800' : 'text-slate-400'
                              }`}
                            >
                              {f.title || f.name}
                            </p>
                            <p className={`truncate ${subtitleSize} text-slate-400`}>
                              <code className="rounded bg-slate-100 px-1">{f.name}</code>
                              {f.primaryKey && (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-amber-500">
                                  <Info className="h-3 w-3" /> PK
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="w-32">
                            <FieldTypeBadge type={f.interface || f.type} />
                          </div>
                          <div className="flex w-20 justify-end">
                            <ToggleSwitch
                              checked={visible}
                              onChange={() => handleToggleField(f)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  onClick,
}: {
  checked: boolean;
  onChange: () => void;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        onChange();
      }}
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

const FIELD_TYPE_LABELS: Record<string, string> = {
  input: 'Texto',
  textarea: 'Texto Longo',
  integer: 'Inteiro',
  float: 'Decimal',
  boolean: 'Sim/Não',
  checkbox: 'Checkbox',
  select: 'Seleção',
  date: 'Data',
  datetime: 'Data/Hora',
  email: 'Email',
  url: 'URL',
  attachment: 'Anexo',
  m2o: 'Relação N:1',
  o2m: 'Relação 1:N',
  m2m: 'Relação N:N',
  o2o: 'Relação 1:1',
  formula: 'Fórmula',
  json: 'JSON',
  id: 'ID',
  createdAt: 'Criado em',
  updatedAt: 'Atualizado em',
};

function FieldTypeBadge({ type }: { type: string }) {
  const label = FIELD_TYPE_LABELS[type] ?? type;
  const isRelation = ['m2o', 'o2m', 'm2m', 'o2o'].includes(type);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        isRelation
          ? 'bg-purple-50 text-purple-600'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  );
}
