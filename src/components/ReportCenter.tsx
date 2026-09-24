import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileSpreadsheet, FileText, FileType, Loader2, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Filter, Columns3, PenLine,
  BarChart3, Download, RefreshCw, Database,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useVisibility } from '@/hooks/useVisibility';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import { useToast } from '@/components/Toast';
import { fetchFields, fetchRecords, NocoDBError } from '@/services/nocodb';
import {
  prepareReportData, exportExcel, exportWord, exportPdf,
  type ReportData,
} from '@/services/reportExport';
import { collectionDisplayTitle } from '@/components/Sidebar';
import { TLM_PRIMARY, TLM_PRIMARY_DARK, TLM_SECONDARY } from '@/config/theme';
import type { NocoBaseCollection, NocoBaseField } from '@/types/nocodb';

interface FilterRule {
  id: string;
  field: string;
  value: string;
}

type ExportFormat = 'excel' | 'word' | 'pdf';

export default function ReportCenter({ collections }: { collections: NocoBaseCollection[] }) {
  const { t } = useLanguage();
  const { fieldVisible } = useVisibility();
  const { user } = useAuth();
  const { activeProject } = useProject();
  const { notify } = useToast();

  const [selectedCollection, setSelectedCollection] = useState<NocoBaseCollection | null>(null);
  const [fields, setFields] = useState<NocoBaseField[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [loadingFields, setLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [narrative, setNarrative] = useState('');
  const [includeCharts, setIncludeCharts] = useState(false);

  const [generating, setGenerating] = useState<ExportFormat | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const visibleCollections = useMemo(
    () => collections.filter((c) => c.hidden !== true),
    [collections],
  );

  useEffect(() => {
    if (visibleCollections.length > 0 && !selectedCollection) {
      setSelectedCollection(visibleCollections[0]);
    }
  }, [visibleCollections, selectedCollection]);

  const loadFields = useCallback(async (collection: NocoBaseCollection) => {
    setLoadingFields(true);
    setFieldsError(null);
    try {
      const allFields = await fetchFields(collection.name);
      const visible = allFields.filter(
        (f) => f.interface !== 'attachment' &&
        f.interface !== 'o2m' && f.interface !== 'm2m' &&
        f.interface !== 'formula' && f.interface !== 'sequence' &&
        fieldVisible(collection.name, f.name),
      );
      setFields(visible);
      setSelectedFields(new Set(visible.map((f) => f.name)));
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : t('reports.errorLoadingFields');
      setFieldsError(msg);
      setFields([]);
      setSelectedFields(new Set());
    } finally {
      setLoadingFields(false);
    }
  }, [fieldVisible, t]);

  useEffect(() => {
    if (selectedCollection) {
      loadFields(selectedCollection);
      setPreviewData(null);
    } else {
      setFields([]);
      setSelectedFields(new Set());
    }
  }, [selectedCollection, loadFields]);

  const toggleField = (name: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAllFields = () => setSelectedFields(new Set(fields.map((f) => f.name)));
  const clearSelection = () => setSelectedFields(new Set());

  const addFilter = () => {
    setFilters((prev) => [...prev, { id: crypto.randomUUID(), field: '', value: '' }]);
  };
  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };
  const updateFilter = (id: string, key: 'field' | 'value', value: string) => {
    setFilters((prev) => prev.map((f) => f.id === id ? { ...f, [key]: value } : f));
  };

  const buildApiFilter = useCallback((): Record<string, unknown> | undefined => {
    const conditions: Record<string, unknown>[] = [];

    if (dateFrom && dateTo) {
      const dateField = fields.find((f) => f.interface === 'date' || f.interface === 'dateOnly' || f.interface === 'datetime' || f.interface === 'createdAt');
      if (dateField) {
        conditions.push({
          [dateField.name]: { $gte: dateFrom, $lte: dateTo },
        });
      }
    } else if (dateFrom) {
      const dateField = fields.find((f) => f.interface === 'date' || f.interface === 'dateOnly' || f.interface === 'datetime' || f.interface === 'createdAt');
      if (dateField) {
        conditions.push({ [dateField.name]: { $gte: dateFrom } });
      }
    } else if (dateTo) {
      const dateField = fields.find((f) => f.interface === 'date' || f.interface === 'dateOnly' || f.interface === 'datetime' || f.interface === 'createdAt');
      if (dateField) {
        conditions.push({ [dateField.name]: { $lte: dateTo } });
      }
    }

    for (const rule of filters) {
      if (rule.field && rule.value) {
        const field = fields.find((f) => f.name === rule.field);
        if (field) {
          if (field.interface === 'integer' || field.interface === 'bigInt' || field.interface === 'float' || field.interface === 'decimal') {
            const num = Number(rule.value);
            if (!isNaN(num)) conditions.push({ [rule.field]: num });
          } else if (field.interface === 'checkbox' || field.interface === 'boolean') {
            conditions.push({ [rule.field]: rule.value === 'true' || rule.value === '1' });
          } else {
            conditions.push({ [rule.field]: { $includes: rule.value } });
          }
        }
      }
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { $and: conditions };
  }, [dateFrom, dateTo, filters, fields]);

  const loadPreview = useCallback(async () => {
    if (!selectedCollection || selectedFields.size === 0) return;
    setLoadingPreview(true);
    try {
      const apiFilter = buildApiFilter();
      const data = await fetchRecords(selectedCollection.name, {
        page: 1,
        pageSize: 10,
        filter: apiFilter,
      });
      setPreviewData(data.data ?? []);
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : t('reports.errorLoadingData');
      notify('error', msg);
      setPreviewData([]);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedCollection, selectedFields, buildApiFilter, notify, t]);

  const captureCharts = useCallback(async (): Promise<string[]> => {
    if (!includeCharts) return [];
    const images: string[] = [];
    const chartCanvases = document.querySelectorAll('canvas');
    for (const canvas of chartCanvases) {
      try {
        const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
        if (dataUrl && dataUrl.length > 100) images.push(dataUrl);
      } catch { /* skip */ }
    }
    return images;
  }, [includeCharts]);

  const handleGenerate = async (format: ExportFormat) => {
    if (!selectedCollection || selectedFields.size === 0) {
      notify('error', t('reports.noFields'));
      return;
    }

    setGenerating(format);
    try {
      const apiFilter = buildApiFilter();
      const allRecords: Record<string, unknown>[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const data = await fetchRecords(selectedCollection.name, {
          page,
          pageSize,
          filter: apiFilter,
        });
        allRecords.push(...(data.data ?? []));
        if (page >= data.meta.totalPage) break;
        page++;
        if (allRecords.length > 5000) break;
      }

      if (allRecords.length === 0) {
        notify('error', t('reports.noDataFiltered'));
        return;
      }

      const selectedFieldList = fields.filter((f) => selectedFields.has(f.name));
      const chartImages = await captureCharts();
      const reportData = prepareReportData(
        allRecords,
        selectedFieldList,
        collectionDisplayTitle(selectedCollection),
        narrative,
        chartImages,
        user?.nickname || user?.username || user?.email || '',
        'pt',
      );

      const timestamp = new Date().toISOString().split('T')[0];
      const baseName = `relatorio_${selectedCollection.name}_${timestamp}`;

      if (format === 'excel') {
        await exportExcel(reportData, `${baseName}.xlsx`);
      } else if (format === 'word') {
        await exportWord(reportData, `${baseName}.docx`);
      } else {
        await exportPdf(reportData, `${baseName}.pdf`);
      }

      notify('success', t('reports.reportGenerated'));
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message
        : err instanceof Error ? err.message
        : t('reports.errorLoadingData');
      notify('error', msg);
    } finally {
      setGenerating(null);
    }
  };

  const selectedCount = selectedFields.size;
  const totalFields = fields.length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <div ref={chartContainerRef} className="hidden">
        {/* Charts rendered off-screen for capture if needed */}
      </div>

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 lg:text-xl">{t('reports.title')}</h1>
              <p className="text-xs text-slate-500 lg:text-sm">{t('reports.subtitle')}</p>
            </div>
          </div>
          {activeProject && (
            <p className="mt-1 text-xs font-medium text-slate-400">
              {activeProject.nome}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-5">

          {/* Step 1: Table Selection */}
          <SectionCard
            icon={<Database className="h-4 w-4" />}
            number={1}
            title={t('reports.selectTable')}
            description={t('reports.selectTableDesc')}
          >
            <div className="flex flex-wrap gap-2">
              {visibleCollections.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setSelectedCollection(c)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    selectedCollection?.name === c.name
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={selectedCollection?.name === c.name ? { background: TLM_PRIMARY } : undefined}
                >
                  {collectionDisplayTitle(c)}
                </button>
              ))}
              {visibleCollections.length === 0 && (
                <p className="text-sm text-slate-400">{t('reports.noTableSelected')}</p>
              )}
            </div>
          </SectionCard>

          {/* Step 2: Filters */}
          <SectionCard
            icon={<Filter className="h-4 w-4" />}
            number={2}
            title={t('reports.filters')}
          >
            <div className="space-y-4">
              {/* Date range */}
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('reports.dateFrom')}</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{t('reports.dateTo')}</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
              </div>

              {/* Dynamic filters */}
              {filters.map((rule) => (
                <div key={rule.id} className="flex flex-wrap items-center gap-2">
                  <select
                    value={rule.field}
                    onChange={(e) => updateFilter(rule.id, 'field', e.target.value)}
                    className="min-w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
                  >
                    <option value="">{t('reports.filterField')}</option>
                    {fields.map((f) => (
                      <option key={f.name} value={f.name}>{f.title || f.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateFilter(rule.id, 'value', e.target.value)}
                    placeholder={t('reports.filterValue')}
                    className="min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none"
                  />
                  <button
                    onClick={() => removeFilter(rule.id)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title={t('reports.removeFilter')}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addFilter}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Filter className="h-3.5 w-3.5" />
                {t('reports.addFilter')}
              </button>
            </div>
          </SectionCard>

          {/* Step 3: Field Selection */}
          <SectionCard
            icon={<Columns3 className="h-4 w-4" />}
            number={3}
            title={t('reports.fields')}
            description={t('reports.fieldsDesc')}
          >
            {loadingFields ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('reports.loadingFields')}
              </div>
            ) : fieldsError ? (
              <div className="flex items-center gap-2 py-4 text-sm text-rose-600">
                <AlertTriangle className="h-4 w-4" />
                {fieldsError}
              </div>
            ) : fields.length === 0 ? (
              <p className="py-4 text-sm text-slate-400">{t('reports.noFields')}</p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    {t('reports.selectedCount', { n: selectedCount, total: totalFields })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllFields}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                      {t('reports.selectAll')}
                    </button>
                    <button
                      onClick={clearSelection}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                      {t('reports.clearSelection')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {fields.map((f) => {
                    const checked = selectedFields.has(f.name);
                    return (
                      <button
                        key={f.name}
                        onClick={() => toggleField(f.name)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                          checked
                            ? 'border-transparent bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-transparent bg-white' : 'border-slate-300'
                        }`}>
                          {checked && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: TLM_PRIMARY }} />}
                        </span>
                        <span className="truncate font-medium">{f.title || f.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>

          {/* Step 4: Narrative */}
          <SectionCard
            icon={<PenLine className="h-4 w-4" />}
            number={4}
            title={t('reports.narrative')}
            description={t('reports.narrativeDesc')}
          >
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder={t('reports.narrativePlaceholder')}
              rows={5}
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            />
          </SectionCard>

          {/* Step 5: Charts */}
          <SectionCard
            icon={<BarChart3 className="h-4 w-4" />}
            number={5}
            title={t('reports.includeCharts')}
            description={t('reports.chartsDesc')}
          >
            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                onClick={() => setIncludeCharts((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${includeCharts ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${includeCharts ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-slate-600">{includeCharts ? t('reports.chartsIncluded') : t('reports.noChartsAvailable')}</span>
            </label>
          </SectionCard>

          {/* Preview */}
          {selectedCollection && selectedFields.size > 0 && (
            <SectionCard
              icon={<RefreshCw className="h-4 w-4" />}
              number={6}
              title={t('reports.preview')}
            >
              <button
                onClick={loadPreview}
                disabled={loadingPreview}
                className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {t('reports.preview')}
              </button>
              {previewData && previewData.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        {fields.filter((f) => selectedFields.has(f.name)).map((f) => (
                          <th key={f.name} className="px-3 py-2 text-left font-semibold">{f.title || f.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          {fields.filter((f) => selectedFields.has(f.name)).map((f) => (
                            <td key={f.name} className="px-3 py-2 text-slate-600">
                              {row[f.name] != null ? String(row[f.name]).slice(0, 60) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {previewData && previewData.length === 0 && (
                <p className="text-sm text-slate-400">{t('reports.noDataFiltered')}</p>
              )}
            </SectionCard>
          )}

          {/* Generate Buttons */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">{t('reports.generate')}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <GenerateButton
                format="excel"
                icon={<FileSpreadsheet className="h-5 w-5" />}
                label={t('reports.generateExcel')}
                generating={generating === 'excel'}
                disabled={generating !== null || selectedFields.size === 0}
                onClick={() => handleGenerate('excel')}
              />
              <GenerateButton
                format="word"
                icon={<FileText className="h-5 w-5" />}
                label={t('reports.generateWord')}
                generating={generating === 'word'}
                disabled={generating !== null || selectedFields.size === 0}
                onClick={() => handleGenerate('word')}
              />
              <GenerateButton
                format="pdf"
                icon={<FileType className="h-5 w-5" />}
                label={t('reports.generatePdf')}
                generating={generating === 'pdf'}
                disabled={generating !== null || selectedFields.size === 0}
                onClick={() => handleGenerate('pdf')}
              />
            </div>
            {generating && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('reports.generating', { format: generating.toUpperCase() })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon, number, title, description, children,
}: {
  icon: React.ReactNode;
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TLM_PRIMARY }}>
            {number}
          </span>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        </div>
      </div>
      {description && <p className="mb-3 text-xs text-slate-500">{description}</p>}
      {children}
    </div>
  );
}

function GenerateButton({
  icon, label, generating, disabled, onClick,
}: {
  format: ExportFormat;
  icon: React.ReactNode;
  label: string;
  generating: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {generating ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : icon}
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <span>{label}</span>
      {!generating && <Download className="h-4 w-4 text-slate-400" />}
    </button>
  );
}
