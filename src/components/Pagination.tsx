import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface PaginationProps {
  page: number;
  limit: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMITS = [10, 25, 50, 100];

export default function Pagination({
  page,
  limit,
  totalRows,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const start = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalRows);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:px-6">
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>
          <span className="font-medium text-slate-700">{start}</span>–
          <span className="font-medium text-slate-700">{end}</span> {t('table.of')}{' '}
          <span className="font-medium text-slate-700">{totalRows.toLocaleString()}</span>
        </span>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-slate-400">{t('table.records')}</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
          >
            {LIMITS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('table.prev')}
        </button>
        <span className="px-2 text-sm text-slate-500">
          {t('table.page')} <span className="font-medium text-slate-700">{page}</span> {t('table.of')}{' '}
          <span className="font-medium text-slate-700">{totalPages}</span>
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('table.next')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
