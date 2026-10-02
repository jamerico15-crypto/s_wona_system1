import { useEffect, useState, useCallback, useMemo } from 'react';
import * as echarts from 'echarts/core';
import { TreemapChart, BarChart } from 'echarts/charts';
import { TooltipComponent, VisualMapComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import ReactECharts from 'echarts-for-react/lib/core';
import type { EChartsOption } from 'echarts';
import {
  Database, Table2, Loader2, AlertTriangle, RefreshCw, BarChart3, Sparkles,
} from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import { fetchFields, fetchRecords, DatabaseError } from '@/services/database';
import { useToast } from '@/components/Toast';
import { collectionDisplayTitle } from '@/components/Sidebar';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';
import type { TableCollection, FieldDef } from '@/types/database';

echarts.use([TreemapChart, BarChart, TooltipComponent, VisualMapComponent, GridComponent, CanvasRenderer]);

const KPI_COLORS = [
  'bg-sky-50 text-sky-600 ring-sky-200',
  'bg-emerald-50 text-emerald-600 ring-emerald-200',
  'bg-amber-50 text-amber-600 ring-amber-200',
  'bg-rose-50 text-rose-600 ring-rose-200',
];

const KPI_ICONS = [Table2, Database, BarChart3, Sparkles];

interface KpiData {
  label: string;
  count: number;
  collectionName: string;
}

interface ChartGroup {
  label: string;
  value: number;
}

interface ChartData {
  collectionName: string;
  collectionTitle: string;
  groupByField: string;
  groupByLabel: string;
  groups: ChartGroup[];
  totalRecords: number;
}

function pickGroupByField(fields: FieldDef[]): FieldDef | null {
  const systemFields = new Set(['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', '__collection']);
  const priorityKeywords = ['district', 'distrito', 'village', 'comunidade', 'status', 'tipo', 'type', 'categoria', 'category', 'genero', 'gender', 'provincia', 'province'];

  const candidates = fields.filter((f) => {
    if (systemFields.has(f.name)) return false;
    if (f.interface === 'm2o' || f.interface === 'o2m' || f.interface === 'm2m' || f.interface === 'o2o') return false;
    if (f.interface === 'attachment' || f.interface === 'json' || f.interface === 'formula') return false;
    return f.interface === 'select' || f.interface === 'radio' || f.interface === 'input' || f.interface === 'textarea';
  });

  for (const kw of priorityKeywords) {
    const match = candidates.find((f) => f.name.toLowerCase().includes(kw) || (f.title ?? '').toLowerCase().includes(kw));
    if (match) return match;
  }

  return candidates[0] ?? null;
}

function humanizeLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export default function DynamicDashboard({ collections }: { collections: TableCollection[] }) {
  const { activeProject } = useProject();
  const { notify } = useToast();
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKpis = useCallback(async (cols: TableCollection[]) => {
    const topCols = cols.slice(0, 4);
    const results = await Promise.allSettled(
      topCols.map(async (c) => {
        const data = await fetchRecords(c.name, { page: 1, pageSize: 1 });
        return {
          label: collectionDisplayTitle(c),
          count: data.meta?.count ?? 0,
          collectionName: c.name,
        };
      }),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<KpiData> => r.status === 'fulfilled')
      .map((r) => r.value);
  }, []);

  const loadChart = useCallback(async (cols: TableCollection[]): Promise<ChartData | null> => {
    const scored: { collection: TableCollection; count: number }[] = [];
    for (const c of cols) {
      try {
        const data = await fetchRecords(c.name, { page: 1, pageSize: 1 });
        scored.push({ collection: c, count: data.meta?.count ?? 0 });
      } catch {
        scored.push({ collection: c, count: 0 });
      }
    }
    scored.sort((a, b) => b.count - a.count);

    for (const { collection, count } of scored) {
      if (count === 0) continue;
      try {
        const fields = await fetchFields(collection.name);
        const groupField = pickGroupByField(fields);
        if (!groupField) continue;

        const allRecords: Record<string, unknown>[] = [];
        let page = 1;
        const pageSize = 100;
        while (true) {
          const data = await fetchRecords(collection.name, { page, pageSize });
          allRecords.push(...data.data);
          if (page >= data.meta.totalPage) break;
          page++;
          if (page > 20) break;
        }

        const groupMap = new Map<string, number>();
        for (const rec of allRecords) {
          const raw = rec[groupField.name];
          const key = raw == null || raw === '' ? '(Vazio)' : String(raw);
          groupMap.set(key, (groupMap.get(key) ?? 0) + 1);
        }

        if (groupMap.size === 0) continue;

        const groups = Array.from(groupMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 30);

        return {
          collectionName: collection.name,
          collectionTitle: collectionDisplayTitle(collection),
          groupByField: groupField.name,
          groupByLabel: groupField.title || humanizeLabel(groupField.name),
          groups,
          totalRecords: count,
        };
      } catch {
        continue;
      }
    }
    return null;
  }, []);

  const loadAll = useCallback(async () => {
    if (collections.length === 0) {
      setKpis([]);
      setChartData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [kpiResults, chartResult] = await Promise.all([
        loadKpis(collections),
        loadChart(collections),
      ]);
      setKpis(kpiResults);
      setChartData(chartResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao carregar os dados do dashboard.';
      setError(msg);
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  }, [collections, loadKpis, loadChart, notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const useTreemap = useMemo(() => {
    if (!chartData) return true;
    return chartData.groups.length <= 15;
  }, [chartData]);

  const chartOption = useMemo<EChartsOption | null>(() => {
    if (!chartData || chartData.groups.length === 0) return null;

    if (useTreemap) {
      return {
        tooltip: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (info: any) =>
            `<b>${info.data.name}</b><br/>Total: ${info.data.value}`,
        },
        series: [{
          type: 'treemap',
          roam: true,
          nodeClick: 'zoomToNode',
          data: chartData.groups.map((g) => ({ name: g.label, value: g.value })),
          breadcrumb: { show: true, bottom: 5 },
          label: {
            show: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (info: any) => {
              const name = info.data.name ?? '';
              const value = info.data.value ?? 0;
              return `{name|${name}}{count|${value}}`;
            },
            rich: {
              name: { fontSize: 14, fontWeight: 'bold', color: '#fff', align: 'left', padding: [0, 0, 0, 4] },
              count: { fontSize: 24, fontWeight: 'bold', color: '#fff', align: 'right', padding: [0, 4, 0, 0] },
            },
          },
          upperLabel: { show: true, height: 30 },
          itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
          levels: [
            { itemStyle: { borderColor: '#fff', borderWidth: 0, gapWidth: 0 } },
            { colorSaturation: [0.35, 0.5], itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 } },
          ],
        }],
      };
    }

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.groups.map((g) => g.label),
        axisLabel: { rotate: 30, fontSize: 11 },
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: chartData.groups.map((g) => g.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#0ea5e9' },
            { offset: 1, color: '#0369a1' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        label: { show: true, position: 'top', fontSize: 11, fontWeight: 'bold' },
      }],
    };
  }, [chartData, useTreemap]);

  const handleRefresh = () => {
    loadAll();
  };

  const hasTables = collections.length > 0;
  const hasData = kpis.some((k) => k.count > 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">A montar dashboard dinâmico...</p>
        </div>
      </div>
    );
  }

  if (!hasTables) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <DashboardHeader projectName={activeProject?.nome ?? ''} onRefresh={handleRefresh} loading={loading} />
        <EmptyState />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <DashboardHeader projectName={activeProject?.nome ?? ''} onRefresh={handleRefresh} loading={loading} />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Database className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">As tabelas estão vazias</h3>
            <p className="mt-2 text-sm text-slate-500">
              O teu Dashboard está quase pronto! Adiciona dados nas tabelas deste projeto para começares a ver os gráficos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DashboardHeader projectName={activeProject?.nome ?? ''} onRefresh={handleRefresh} loading={loading} />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-900">Erro ao carregar dados</p>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, i) => {
            const Icon = KPI_ICONS[i % KPI_ICONS.length];
            return (
              <div key={kpi.collectionName} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${KPI_COLORS[i % KPI_COLORS.length]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-slate-900">{kpi.count.toLocaleString()}</p>
                  <p className="truncate text-xs font-medium text-slate-500">{kpi.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {chartData && chartOption ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">
              {chartData.collectionTitle} por {chartData.groupByLabel}
            </h3>
            <ReactECharts
              echarts={echarts}
              option={chartOption}
              style={{ height: '400px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">Gráfico Automático</h3>
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Não foi possível encontrar uma coluna de categoria nos dados para gerar um gráfico automático.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardHeader({ projectName, onRefresh, loading }: { projectName: string; onRefresh: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard Dinâmico</h2>
          <p className="text-xs text-slate-400">Missão Contra a Lepra · {projectName}</p>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Atualizar
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-emerald-50 ring-1 ring-slate-200">
          <Sparkles className="h-10 w-10 text-sky-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">O teu Dashboard está quase pronto!</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Cria tabelas e adiciona dados no menu <span className="font-semibold text-slate-600">"Configuração · Tabelas"</span> para começares a ver os gráficos surgirem automaticamente aqui.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Database className="h-4 w-4" />
          <span>O dashboard adapta-se sozinho às tuas tabelas</span>
        </div>
      </div>
    </div>
  );
}
