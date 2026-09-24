import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import * as echarts from 'echarts/core';
import { TreemapChart, BarChart } from 'echarts/charts';
import { TooltipComponent, VisualMapComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import ReactECharts from 'echarts-for-react/lib/core';
import type { EChartsOption } from 'echarts';
import {
  Stethoscope, Users, UserCheck, ClipboardList, Target, TrendingUp,
  Calendar, Loader2, AlertTriangle, RefreshCw, MapPin, HeartHandshake,
  Award, BarChart3,
} from 'lucide-react';

echarts.use([TreemapChart, BarChart, TooltipComponent, VisualMapComponent, GridComponent, CanvasRenderer]);
import { fetchRecords, NocoDBError } from '@/services/nocodb';
import { useToast } from '@/components/Toast';
import { useProject } from '@/hooks/useProject';
import DynamicDashboard from '@/components/DynamicDashboard';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';
import type { NocoBaseCollection } from '@/types/nocodb';

interface ScreeningRecord {
  id: string | number;
  diagnosis: string | null;
  suspected_leprosy: string | null;
  screening_date: string | null;
  createdAt: string;
  districtId: string | number | null;
  villageId: string | number | null;
  village?: { name: string; geoDistrictId: string | number } | null;
  district?: { DistrictName: string; id: string | number } | null;
  beneficiary?: { gender: string | null; age: number | null } | null;
  beneficiaryId: string | number | null;
  [key: string]: unknown;
}

interface DistrictData {
  name: string;
  total: number;
  confirmed: number;
  male: number;
  female: number;
  mb: number;
  pb: number;
}

interface LiderancaRecord {
  id: string | number;
  tipo_de_lideranca: string | null;
  districtId?: string | number | null;
  district?: { DistrictName: string; id: string | number } | null;
  [key: string]: unknown;
}

export default function AnalyticsDashboard({ collections }: { collections?: NocoBaseCollection[] }) {
  const { isOlikanassa } = useProject();

  if (!isOlikanassa && collections) {
    return <DynamicDashboard collections={collections} />;
  }

  return <OlikanassaDashboard />;
}

function OlikanassaDashboard() {
  const { notify } = useToast();
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [liderancas, setLiderancas] = useState<LiderancaRecord[]>([]);
  const [districts, setDistricts] = useState<Map<string, string>>(new Map());
  const [membersCount, setMembersCount] = useState(0);
  const [goalsCount, setGoalsCount] = useState(0);
  const [outcomesCount, setOutcomesCount] = useState(0);
  const [indicatorMeasurements, setIndicatorMeasurements] = useState<number>(0);
  const [indicatorPlanned, setIndicatorPlanned] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');

  const loadDistricts = useCallback(async () => {
    try {
      const data = await fetchRecords('districts', { page: 1, pageSize: 100 });
      const map = new Map<string, string>();
      for (const d of data.data) {
        map.set(String(d.id), (d.DistrictName as string) || `Distrito ${d.id}`);
      }
      setDistricts(map);
    } catch {
      // non-critical
    }
  }, []);

  const loadCounts = useCallback(async () => {
    const safeCount = async (table: string): Promise<number> => {
      try {
        const data = await fetchRecords(table, { page: 1, pageSize: 1 });
        return data.meta?.count ?? 0;
      } catch {
        return 0;
      }
    };
    setMembersCount(await safeCount('members'));
    setGoalsCount(await safeCount('goals'));
    setOutcomesCount(await safeCount('Outcomes1'));

    try {
      const data = await fetchRecords('indicator_measurements', { page: 1, pageSize: 1 });
      setIndicatorMeasurements(data.meta?.count ?? 0);
    } catch {
      setIndicatorMeasurements(0);
    }

    try {
      const data = await fetchRecords('Indicator_Catalog', { page: 1, pageSize: 100 });
      let planned = 0;
      for (const rec of data.data) {
        const val = rec.valor_planeado ?? rec.planned_value ?? rec.meta ?? rec.target;
        if (val != null) planned += Number(val) || 0;
      }
      setIndicatorPlanned(planned);
    } catch {
      setIndicatorPlanned(0);
    }
  }, []);

  const loadScreenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allScreenings: ScreeningRecord[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const data = await fetchRecords('screenings', {
          page, pageSize,
          appends: ['district', 'village', 'beneficiary'],
        });
        allScreenings.push(...(data.data as ScreeningRecord[]));
        if (page >= data.meta.totalPage) break;
        page++;
      }
      setScreenings(allScreenings);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao carregar os dados de rastreio.';
      setError(msg);
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const loadLiderancas = useCallback(async () => {
    try {
      const all: LiderancaRecord[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const data = await fetchRecords('liderancas', {
          page, pageSize,
          appends: ['district'],
        });
        all.push(...(data.data as LiderancaRecord[]));
        if (page >= data.meta.totalPage) break;
        page++;
        if (page > 20) break;
      }
      setLiderancas(all);
    } catch {
      setLiderancas([]);
    }
  }, []);

  useEffect(() => {
    loadDistricts();
    loadCounts();
    loadScreenings();
    loadLiderancas();
  }, [loadDistricts, loadCounts, loadScreenings, loadLiderancas]);

  const filteredScreenings = useMemo(() => {
    return screenings.filter((s) => {
      if (dateFrom) {
        const d = s.screening_date || s.createdAt;
        if (d && new Date(d) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const d = s.screening_date || s.createdAt;
        if (d && new Date(d) > new Date(dateTo)) return false;
      }
      if (districtFilter !== 'all') {
        const dName = getDistrictName(s, districts);
        if (dName !== districtFilter) return false;
      }
      return true;
    });
  }, [screenings, dateFrom, dateTo, districtFilter, districts]);

  const filteredLiderancas = useMemo(() => {
    if (districtFilter === 'all') return liderancas;
    return liderancas.filter((l) => {
      const dName = l.district?.DistrictName ?? '';
      return dName === districtFilter;
    });
  }, [liderancas, districtFilter]);

  const confirmedCases = useMemo(
    () => filteredScreenings.filter((s) => s.diagnosis === 'Lepra' || s.diagnosis === 'MB' || s.diagnosis === 'PB').length,
    [filteredScreenings],
  );

  // CATEGORY 1: M&A data
  const goalsProgress = useMemo(() => {
    if (goalsCount === 0) return 0;
    return Math.min(100, Math.round((outcomesCount / goalsCount) * 100));
  }, [goalsCount, outcomesCount]);

  const indicatorProgress = useMemo(() => {
    if (indicatorPlanned === 0) return 0;
    return Math.min(100, Math.round((indicatorMeasurements / indicatorPlanned) * 100));
  }, [indicatorMeasurements, indicatorPlanned]);

  // CATEGORY 2: Lepra treemap
  const districtDataMap = useMemo(() => {
    const map = new Map<string, DistrictData>();
    for (const s of filteredScreenings) {
      const dName = getDistrictName(s, districts) || 'Sem Distrito';
      if (!map.has(dName)) {
        map.set(dName, { name: dName, total: 0, confirmed: 0, male: 0, female: 0, mb: 0, pb: 0 });
      }
      const d = map.get(dName)!;
      d.total++;
      if (s.diagnosis === 'Lepra' || s.diagnosis === 'MB' || s.diagnosis === 'PB') d.confirmed++;
      if (s.diagnosis === 'MB') d.mb++;
      if (s.diagnosis === 'PB') d.pb++;
      if (s.beneficiary?.gender === 'male') d.male++;
      if (s.beneficiary?.gender === 'female') d.female++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredScreenings, districts]);

  const treemapOption = useMemo<EChartsOption>(() => {
    const treemapData = districtDataMap.map((d) => ({
      name: d.name,
      value: d.total,
      confirmed: d.confirmed,
      male: d.male,
      female: d.female,
      mb: d.mb,
      pb: d.pb,
    }));

    return {
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (info: any) => {
          const d = info.data;
          return `<b>${d.name}</b><br/>Total: ${d.value}<br/>Confirmados: ${d.confirmed}<br/>Homens: ${d.male} | Mulheres: ${d.female}<br/>MB: ${d.mb} | PB: ${d.pb}`;
        },
      },
      series: [
        {
          type: 'treemap',
          roam: true,
          nodeClick: 'zoomToNode',
          data: treemapData,
          breadcrumb: { show: true, bottom: 5 },
          label: {
            show: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (info: any) => {
              const d = info.data;
              const name = d.name ?? '';
              const value = d.value ?? 0;
              const confirmed = d.confirmed ?? 0;
              const male = d.male ?? 0;
              const female = d.female ?? 0;
              return `{name|${name}}{count|${value}}\n{sub|Confirmados: ${confirmed} | H: ${male} | M: ${female}}`;
            },
            rich: {
              name: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#fff',
                align: 'left',
                padding: [0, 0, 0, 4],
              },
              count: {
                fontSize: 24,
                fontWeight: 'bold',
                color: '#fff',
                align: 'right',
                padding: [0, 4, 0, 0],
              },
              sub: {
                fontSize: 11,
                color: 'rgba(255,255,255,0.85)',
                align: 'left',
                padding: [4, 0, 0, 4],
              },
            },
          },
          upperLabel: { show: true, height: 30 },
          itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
          levels: [
            {
              itemStyle: { borderColor: '#fff', borderWidth: 0, gapWidth: 0 },
            },
            {
              colorSaturation: [0.35, 0.5],
              itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
            },
          ],
        },
      ],
    };
  }, [districtDataMap]);

  // CATEGORY 3: Lideranças bar chart
  const liderancaTypeData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filteredLiderancas) {
      const tipo = l.tipo_de_lideranca || 'Não especificado';
      map.set(tipo, (map.get(tipo) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLiderancas]);

  const liderancasChartOption = useMemo<EChartsOption>(() => {
    if (liderancaTypeData.length === 0) return {} as EChartsOption;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: liderancaTypeData.map((g) => g.label),
        axisLabel: { fontSize: 12 },
      },
      series: [{
        type: 'bar',
        data: liderancaTypeData.map((g) => g.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#10b981' },
            { offset: 1, color: '#059669' },
          ]),
          borderRadius: [0, 6, 6, 0],
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 13,
          fontWeight: 'bold',
          color: '#334155',
        },
        barMaxWidth: 40,
      }],
    };
  }, [liderancaTypeData]);

  const handleRefresh = () => {
    loadScreenings();
    loadCounts();
    loadLiderancas();
  };

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    for (const s of screenings) {
      const name = getDistrictName(s, districts);
      if (name) set.add(name);
    }
    for (const l of liderancas) {
      if (l.district?.DistrictName) set.add(l.district.DistrictName);
    }
    return Array.from(set).sort();
  }, [screenings, districts, liderancas]);

  if (loading && screenings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">A carregar dados analíticos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white md:h-10 md:w-10" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 md:text-lg">Dashboard Analítico · Olikanassa</h2>
            <p className="text-xs text-slate-400">Monitorização, Avaliação & Controlo de Lepra</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">De</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Até</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Distrito</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-700 focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                <option value="all">Todos os Distritos</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          {(dateFrom || dateTo || districtFilter !== 'all') && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setDistrictFilter('all'); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-900">Erro ao carregar dados</p>
              <p className="mt-1 text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* CATEGORY 1: M&A */}
        <SectionHeader
          icon={<Target className="h-4 w-4" />}
          title="Métricas de Monitorização e Avaliação (M&A)"
          subtitle="Progresso estratégico e metas do projeto"
        />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProgressCard
            icon={<Target className="h-5 w-5" />}
            label="Metas Definidas"
            value={goalsCount}
            sublabel={`${outcomesCount} resultados registados`}
            progress={goalsProgress}
            color="bg-sky-50 text-sky-600 ring-sky-200"
            barColor="bg-sky-500"
          />
          <ProgressCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Desempenho de Indicadores"
            value={indicatorMeasurements}
            sublabel={`Meta: ${indicatorPlanned} medições`}
            progress={indicatorProgress}
            color="bg-emerald-50 text-emerald-600 ring-emerald-200"
            barColor="bg-emerald-500"
          />
          <ProgressCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Total de Rastreios"
            value={filteredScreenings.length}
            sublabel={`${confirmedCases} casos confirmados`}
            progress={filteredScreenings.length > 0 ? Math.round((confirmedCases / filteredScreenings.length) * 100) : 0}
            color="bg-amber-50 text-amber-600 ring-amber-200"
            barColor="bg-amber-500"
          />
          <ProgressCard
            icon={<Award className="h-5 w-5" />}
            label="Resultados (Outcomes)"
            value={outcomesCount}
            sublabel={`Rácio: ${goalsCount > 0 ? Math.round((outcomesCount / goalsCount) * 100) : 0}%`}
            progress={goalsProgress}
            color="bg-rose-50 text-rose-600 ring-rose-200"
            barColor="bg-rose-500"
          />
        </div>

        {/* CATEGORY 2: Core Clínico - Lepra */}
        <SectionHeader
          icon={<Stethoscope className="h-4 w-4" />}
          title="Alvo Principal · Core Clínico e Epidemiológico (Lepra)"
          subtitle="Distribuição de casos por distrito com subníveis de género e tipo"
        />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Total de Rastreios"
            value={filteredScreenings.length}
            color="bg-sky-50 text-sky-600 ring-sky-200"
          />
          <KpiCard
            icon={<Stethoscope className="h-5 w-5" />}
            label="Casos Confirmados"
            value={confirmedCases}
            color="bg-rose-50 text-rose-600 ring-rose-200"
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Casos MB"
            value={filteredScreenings.filter((s) => s.diagnosis === 'MB').length}
            color="bg-orange-50 text-orange-600 ring-orange-200"
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Casos PB"
            value={filteredScreenings.filter((s) => s.diagnosis === 'PB').length}
            color="bg-yellow-50 text-yellow-600 ring-yellow-200"
          />
        </div>
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Total de Casos de Lepra por Distrito</h3>
          {districtDataMap.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Sem dados de distrito para mostrar com os filtros atuais.
            </div>
          ) : (
            <ReactECharts
              echarts={echarts}
              option={treemapOption}
              style={{ height: '420px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          )}
        </div>

        {/* CATEGORY 3: Componente Comunitária */}
        <SectionHeader
          icon={<HeartHandshake className="h-4 w-4" />}
          title="Componente Comunitária e Mobilização Social"
          subtitle="Força no terreno através de lideranças e beneficiários"
        />
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Beneficiários Acompanhados"
            value={membersCount}
            color="bg-amber-50 text-amber-600 ring-amber-200"
          />
          <KpiCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Líderes Comunitários Ativos"
            value={filteredLiderancas.length}
            color="bg-emerald-50 text-emerald-600 ring-emerald-200"
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Distribuição de Líderes por Tipo de Liderança</h3>
          {liderancaTypeData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Sem dados de lideranças para mostrar com os filtros atuais.
            </div>
          ) : (
            <ReactECharts
              echarts={echarts}
              option={liderancasChartOption}
              style={{ height: '320px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function getDistrictName(s: ScreeningRecord, districts: Map<string, string>): string {
  if (s.district?.DistrictName) return s.district.DistrictName;
  if (s.districtId && districts.has(String(s.districtId))) return districts.get(String(s.districtId))!;
  if (s.village?.geoDistrictId && districts.has(String(s.village.geoDistrictId))) {
    return districts.get(String(s.village.geoDistrictId))!;
  }
  return '';
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-md md:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset md:h-12 md:w-12 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums text-slate-900 md:text-2xl">{value.toLocaleString()}</p>
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ProgressCard({
  icon,
  label,
  value,
  sublabel,
  progress,
  color,
  barColor,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sublabel: string;
  progress: number;
  color: string;
  barColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-md md:p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset md:h-10 md:w-10 ${color}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold tabular-nums text-slate-900 md:text-xl">{value.toLocaleString()}</p>
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">{sublabel}</span>
        <span className="font-semibold text-slate-600">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
