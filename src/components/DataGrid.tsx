import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import { Table2, Pencil, Trash2 } from 'lucide-react';
import { renderCell, fieldTypeIcon } from '@/components/cellRenderer';
import type { NocoBaseField, NocoBaseCollection } from '@/types/nocodb';

const MIN_COL_WIDTH = 80;
const STORAGE_PREFIX = 'app_col_widths_';

function loadWidths(collectionName: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + collectionName);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveWidths(collectionName: string, widths: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(widths));
  } catch {
    // ignore quota errors
  }
}

interface DataGridProps {
  collection: NocoBaseCollection;
  fields: NocoBaseField[];
  records: Record<string, unknown>[];
  loading: boolean;
  onEdit?: (record: Record<string, unknown>) => void;
  onDelete?: (record: Record<string, unknown>) => void;
}

export default function DataGrid({ collection, fields, records, loading, onEdit, onDelete }: DataGridProps) {
  const [widths, setWidths] = useState<Record<string, number>>(() => loadWidths(collection.name));
  const draggingRef = useRef<{ fieldName: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    setWidths(loadWidths(collection.name));
  }, [collection.name]);

  useEffect(() => {
    saveWidths(collection.name, widths);
  }, [collection.name, widths]);

  const handleMouseDown = useCallback((e: MouseEvent, field: NocoBaseField) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = widths[field.name] ?? tableRef.current?.querySelector<HTMLElement>(`th[data-field="${field.name}"]`)?.offsetWidth ?? 150;
    draggingRef.current = { fieldName: field.name, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [widths]);

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!draggingRef.current) return;
      const { fieldName, startX, startWidth } = draggingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth + delta);
      setWidths((prev) => ({ ...prev, [fieldName]: newWidth }));
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getColWidth = (fieldName: string): number | undefined => widths[fieldName];

  if (loading) {
    const colCount = Math.min(fields.length || 6, 8);
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {Array.from({ length: colCount }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-slate-100">
                {Array.from({ length: colCount }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${60 + ((colIdx * 13) % 60)}px` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (records.length === 0) {
    const title = collection.title || collection.name;
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Table2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">Sem registos</p>
          <p className="mt-1 text-xs text-slate-400">A tabela "{title}" não tem dados para mostrar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table ref={tableRef} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {fields.map((field) => {
              const w = getColWidth(field.name);
              return (
                <th
                  key={field.key}
                  data-field={field.name}
                  className="relative whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  style={w ? { width: w, minWidth: MIN_COL_WIDTH } : { minWidth: MIN_COL_WIDTH }}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="shrink-0 text-slate-400">{fieldTypeIcon(field.interface)}</span>
                    <span className="truncate">{fieldLabel(field)}</span>
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(e, field)}
                    className="group/resizer absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none hover:bg-blue-500"
                    title="Arraste para redimensionar"
                  >
                    <div className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-transparent transition-colors group-hover/resizer:bg-blue-400" />
                  </div>
                </th>
              );
            })}
            {(onEdit || onDelete) && (
              <th className="sticky right-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record, rowIdx) => (
            <tr
              key={(record.id as string | number) ?? rowIdx}
              className="border-b border-slate-100 transition hover:bg-slate-50/70"
            >
              {fields.map((field) => {
                const cell = renderCell(record[field.name], field);
                const w = getColWidth(field.name);
                return (
                  <td
                    key={field.key}
                    className="px-4 py-3 text-sm text-slate-700"
                    style={w ? { width: w, minWidth: MIN_COL_WIDTH, maxWidth: w } : { minWidth: MIN_COL_WIDTH }}
                  >
                    <div className={`flex overflow-hidden ${cell.className ?? (cell.align === 'right' ? 'justify-end' : cell.align === 'center' ? 'justify-center' : 'justify-start')}`}>
                      <span className="truncate">{cell.content}</span>
                    </div>
                  </td>
                );
              })}
              {(onEdit || onDelete) && (
                <td className="sticky right-0 z-10 bg-white px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        title="Editar"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(record)}
                        title="Eliminar"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fieldLabel(field: NocoBaseField): string {
  if (field.title) return field.title;
  return field.name;
}
