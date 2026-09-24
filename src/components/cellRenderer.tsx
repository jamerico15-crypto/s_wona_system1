import { Check, Minus, Link2, FileText, Hash, Calendar, Type, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NocoBaseField } from '@/types/nocodb';

export interface CellRender {
  content: ReactNode;
  align: 'left' | 'right' | 'center';
  className?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractLabel(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isObject(value)) {
    for (const key of ['title', 'name', 'nome', 'label', 'DistrictName', 'district_name', 'village_name', 'Nome', 'label_pt', 'descricao', 'description']) {
      const v = value[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
    for (const key of Object.keys(value)) {
      if (key === 'id' || key.startsWith('_') || key === 'createdAt' || key === 'updatedAt' || key === 'createdBy' || key === 'updatedBy') continue;
      const v = value[key];
      if (typeof v === 'string' && v.length > 0 && v.length < 200) return v;
    }
    if (typeof value.id === 'string' || typeof value.id === 'number') return String(value.id);
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  if (Array.isArray(value)) {
    return value.map((v) => extractLabel(v)).join(', ');
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatNumber(value: unknown, isInt: boolean): string {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return isInt ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatDate(value: unknown): string {
  if (value == null || value === '') return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function formatDateTime(value: unknown): string {
  if (value == null || value === '') return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function selectColor(title?: string): string {
  if (!title) return 'bg-slate-100 text-slate-700 ring-slate-200';
  const palette = [
    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'bg-amber-50 text-amber-700 ring-amber-200',
    'bg-rose-50 text-rose-700 ring-rose-200',
    'bg-sky-50 text-sky-700 ring-sky-200',
    'bg-teal-50 text-teal-700 ring-teal-200',
    'bg-orange-50 text-orange-700 ring-orange-200',
    'bg-cyan-50 text-cyan-700 ring-cyan-200',
    'bg-lime-50 text-lime-700 ring-lime-200',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function findEnumLabel(field: NocoBaseField, value: unknown): string {
  if (!field.enum) return String(value);
  const opt = field.enum.find((o) => o.value === value);
  return opt ? opt.label : String(value);
}

export function renderCell(value: unknown, field: NocoBaseField): CellRender {
  const iface = field.interface;

  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return { content: <span className="text-slate-300">—</span>, align: 'left' };
  }

  switch (iface) {
    case 'checkbox':
    case 'boolean':
      return {
        content: value ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Minus className="h-4 w-4 text-slate-300" />
        ),
        align: 'center',
        className: 'justify-center',
      };

    case 'integer':
    case 'bigInt':
    case 'snowflakeId':
      return {
        content: <span className="tabular-nums">{formatNumber(value, true)}</span>,
        align: 'right',
        className: 'justify-end',
      };

    case 'float':
    case 'decimal':
      return {
        content: <span className="tabular-nums">{formatNumber(value, false)}</span>,
        align: 'right',
        className: 'justify-end',
      };

    case 'date':
    case 'dateOnly':
      return { content: formatDate(value), align: 'left' };

    case 'datetime':
    case 'createdAt':
    case 'updatedAt':
      return { content: formatDateTime(value), align: 'left' };

    case 'select':
    case 'radio': {
      const label = findEnumLabel(field, value);
      return {
        content: (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${selectColor(label)}`}>
            {label}
          </span>
        ),
        align: 'left',
      };
    }

    case 'multipleSelect':
    case 'checkboxGroup': {
      const opts = Array.isArray(value) ? value : [value];
      return {
        content: (
          <div className="flex flex-wrap gap-1">
            {opts.map((opt, i) => {
              const label = findEnumLabel(field, opt);
              return (
                <span key={i} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${selectColor(label)}`}>
                  {label}
                </span>
              );
            })}
          </div>
        ),
        align: 'left',
      };
    }

    case 'm2o':
    case 'o2o': {
      if (isObject(value)) {
        const label = extractLabel(value);
        return {
          content: (
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Link2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{label}</span>
            </span>
          ),
          align: 'left',
        };
      }
      return {
        content: (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Link2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular-nums">{String(value)}</span>
          </span>
        ),
        align: 'left',
      };
    }

    case 'o2m':
    case 'm2m': {
      if (Array.isArray(value)) {
        return {
          content: (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Link2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs">{value.length} registo(s)</span>
            </span>
          ),
          align: 'left',
        };
      }
      if (isObject(value)) {
        return {
          content: (
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Link2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{extractLabel(value)}</span>
            </span>
          ),
          align: 'left',
        };
      }
      return { content: <span className="text-slate-400">{String(value)}</span>, align: 'left' };
    }

    case 'attachment': {
      const items = Array.isArray(value) ? value : [value];
      return {
        content: (
          <div className="flex flex-wrap gap-1">
            {items.slice(0, 3).map((item, i) => {
              const obj = isObject(item) ? item : { title: String(item) };
              const title = typeof obj.title === 'string' ? obj.title : typeof obj.filename === 'string' ? obj.filename : `ficheiro-${i + 1}`;
              return (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{title}</span>
                </span>
              );
            })}
            {items.length > 3 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                +{items.length - 3}
              </span>
            )}
          </div>
        ),
        align: 'left',
      };
    }

    case 'email': {
      const s = String(value);
      return {
        content: <a href={`mailto:${s}`} className="text-sky-600 hover:underline">{s}</a>,
        align: 'left',
      };
    }

    case 'url': {
      const s = String(value);
      return {
        content: <a href={s} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">{s}</a>,
        align: 'left',
      };
    }

    case 'textarea':
    case 'richText':
      return {
        content: (
          <span className="block max-w-[280px] truncate whitespace-pre-line" title={String(value)}>
            {String(value)}
          </span>
        ),
        align: 'left',
      };

    case 'json':
      return {
        content: (
          <span className="block max-w-[200px] truncate font-mono text-xs text-slate-500" title={JSON.stringify(value)}>
            {JSON.stringify(value)}
          </span>
        ),
        align: 'left',
      };

    case 'formula':
      return { content: extractLabel(value), align: 'left' };

    case 'id':
      return {
        content: <span className="tabular-nums text-slate-500">{String(value)}</span>,
        align: 'right',
        className: 'justify-end',
      };

    default:
      return { content: extractLabel(value), align: 'left' };
  }
}

export function fieldTypeIcon(iface: string): ReactNode {
  switch (iface) {
    case 'input':
      return <Type className="h-3.5 w-3.5" />;
    case 'textarea':
    case 'richText':
      return <FileText className="h-3.5 w-3.5" />;
    case 'integer':
    case 'bigInt':
    case 'float':
    case 'decimal':
    case 'snowflakeId':
    case 'id':
      return <Hash className="h-3.5 w-3.5" />;
    case 'checkbox':
    case 'boolean':
      return <Check className="h-3.5 w-3.5" />;
    case 'date':
    case 'dateOnly':
    case 'datetime':
    case 'createdAt':
    case 'updatedAt':
      return <Calendar className="h-3.5 w-3.5" />;
    case 'm2o':
    case 'o2m':
    case 'm2m':
    case 'o2o':
      return <Link2 className="h-3.5 w-3.5" />;
    case 'attachment':
      return <Paperclip className="h-3.5 w-3.5" />;
    default:
      return <Type className="h-3.5 w-3.5" />;
  }
}
