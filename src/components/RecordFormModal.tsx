import { useEffect, useState, useCallback, useRef, type ReactNode, type FormEvent } from 'react';
import { X, Save, Loader2, Plus, Search, ChevronDown, Check, AlertCircle } from 'lucide-react';
import type { NocoBaseField } from '@/types/nocodb';
import { useLanguage } from '@/hooks/useLanguage';
import { fetchRecords, NocoDBError } from '@/services/nocodb';

interface RecordFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  fields: NocoBaseField[];
  initialValues?: Record<string, unknown>;
  collectionTitle: string;
  readOnly?: boolean;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const SYSTEM_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'seq']);

function isEditable(field: NocoBaseField): boolean {
  if (SYSTEM_FIELDS.has(field.name)) return false;
  if (field.interface === 'createdAt' || field.interface === 'updatedAt') return false;
  if (field.interface === 'createdBy' || field.interface === 'updatedBy') return false;
  if (field.interface === 'snowflakeId') return false;
  if (field.interface === 'sequence') return false;
  if (field.interface === 'formula') return false;
  if (field.isForeignKey) return false;
  return true;
}

function isRequired(field: NocoBaseField): boolean {
  if (field.required) return true;
  if (field.allowNull === false) return true;
  const uiSchema = field.uiSchema;
  if (uiSchema && typeof uiSchema === 'object') {
    const required = (uiSchema as Record<string, unknown>).required;
    if (required === true) return true;
    const xVal = (uiSchema as Record<string, unknown>)['x-validator-required'];
    if (xVal === true) return true;
  }
  return false;
}

function fieldLabel(field: NocoBaseField): string {
  return field.title || field.name;
}

function emptyValueFor(field: NocoBaseField): unknown {
  switch (field.interface) {
    case 'checkbox':
    case 'boolean':
      return false;
    case 'integer':
    case 'bigInt':
    case 'float':
    case 'decimal':
      return '';
    case 'select':
    case 'radio':
      return '';
    case 'multipleSelect':
    case 'checkboxGroup':
      return [];
    case 'm2o':
    case 'o2o':
      return '';
    default:
      return '';
  }
}

function extractRecordLabel(record: Record<string, unknown>): string {
  if (record == null) return '';
  for (const key of ['title', 'name', 'nome', 'label', 'DistrictName', 'district_name', 'village_name', 'Nome', 'label_pt']) {
    const v = record[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  for (const key of Object.keys(record)) {
    if (key === 'id' || key.startsWith('_') || key === 'createdAt' || key === 'updatedAt') continue;
    const v = record[key];
    if (typeof v === 'string' && v.length > 0 && v.length < 200) return v;
  }
  return String(record.id ?? '');
}

function RecordFormModal({
  open,
  mode,
  fields,
  initialValues,
  collectionTitle,
  readOnly = false,
  onSubmit,
  onClose,
}: RecordFormModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const editableFields = fields.filter(isEditable);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, unknown> = {};
    for (const field of editableFields) {
      if (initialValues && initialValues[field.name] !== undefined) {
        init[field.name] = initialValues[field.name];
      } else {
        init[field.name] = emptyValueFor(field);
      }
    }
    setValues(init);
    setError(null);
    setValidationErrors(new Set());
  }, [open, mode]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors = new Set<string>();
    for (const field of editableFields) {
      if (isRequired(field)) {
        const v = values[field.name];
        if (v === '' || v == null || (Array.isArray(v) && v.length === 0)) {
          errors.add(field.name);
        }
      }
    }
    if (errors.size > 0) {
      setValidationErrors(errors);
      setError(t('form.validationError'));
      return;
    }
    setValidationErrors(new Set());
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error.');
    } finally {
      setSubmitting(false);
    }
  };

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in sm:max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              {mode === 'create' ? <Plus className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 md:text-lg">
                {mode === 'create' ? t('table.addRecordTitle') : t('table.editRecord')}
              </h2>
              <p className="text-xs text-slate-400">{collectionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {editableFields.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {t('visibility.noFields')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {editableFields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={values[field.name]}
                    onChange={(v) => setValue(field.name, v)}
                    hasError={validationErrors.has(field.name)}
                    readOnly={readOnly}
                    allValues={values}
                    allFields={editableFields}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 md:mx-6">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3 md:px-6 md:py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t('table.cancel')}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={submitting || editableFields.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'create' ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {mode === 'create' ? t('table.create') : t('table.save')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  hasError,
  readOnly = false,
  allValues,
  allFields,
}: {
  field: NocoBaseField;
  value: unknown;
  onChange: (value: unknown) => void;
  hasError: boolean;
  readOnly?: boolean;
  allValues: Record<string, unknown>;
  allFields: NocoBaseField[];
}): ReactNode {
  const { t } = useLanguage();
  const label = fieldLabel(field);
  const required = isRequired(field);
  const isFullWidth = field.interface === 'textarea' || field.interface === 'richText' || field.interface === 'json';

  const inputClass = `w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 md:py-2 ${
    readOnly ? 'cursor-not-allowed opacity-60' : ''
  } ${
    hasError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-slate-400'
  }`;

  const renderInput = (): ReactNode => {
    switch (field.interface) {
      case 'checkbox':
      case 'boolean':
        return (
          <button
            type="button"
            onClick={() => !readOnly && onChange(!value)}
            disabled={readOnly}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        );

      case 'integer':
      case 'bigInt':
      case 'float':
      case 'decimal':
        return (
          <input
            type="number"
            value={value === '' || value == null ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={label}
            disabled={readOnly}
            className={inputClass}
          />
        );

      case 'select':
      case 'radio':
        return (
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className={inputClass}
          >
            <option value="">— {t('form.selectOption')} —</option>
            {field.enum?.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multipleSelect':
      case 'checkboxGroup': {
        const arr = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-2">
            {field.enum?.map((opt) => {
              const selected = arr.includes(opt.value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      onChange(arr.filter((v) => v !== opt.value));
                    } else {
                      onChange([...arr, opt.value]);
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                    selected
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }

      case 'date':
      case 'dateOnly':
        return (
          <input
            type="date"
            value={value ? String(value).split('T')[0] : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className={inputClass}
          />
        );

      case 'datetime':
      case 'createdAt':
      case 'updatedAt':
        return (
          <input
            type="datetime-local"
            value={value ? String(value).slice(0, 16) : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            className={inputClass}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
            disabled={readOnly}
            className={inputClass}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
            disabled={readOnly}
            className={inputClass}
          />
        );

      case 'textarea':
      case 'richText':
        return (
          <textarea
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
            rows={4}
            disabled={readOnly}
            className={`${inputClass} resize-y`}
          />
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                onChange(e.target.value ? JSON.parse(e.target.value) : '');
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder="{}"
            rows={4}
            disabled={readOnly}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
        );

      case 'm2o':
      case 'o2o':
        return (
          <RelationPicker
            field={field}
            value={value}
            onChange={onChange}
            inputClass={inputClass}
            readOnly={readOnly}
            allValues={allValues}
            allFields={allFields}
          />
        );

      default:
        return (
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
            disabled={readOnly}
            className={inputClass}
          />
        );
    }
  };

  return (
    <div className={isFullWidth ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {renderInput()}
      {hasError && (
        <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3 w-3" />
          {t('form.requiredField')}
        </p>
      )}
    </div>
  );
}

function RelationPicker({
  field,
  value,
  onChange,
  inputClass,
  readOnly = false,
  allValues,
  allFields,
}: {
  field: NocoBaseField;
  value: unknown;
  onChange: (value: unknown) => void;
  inputClass: string;
  readOnly?: boolean;
  allValues: Record<string, unknown>;
  allFields: NocoBaseField[];
}): ReactNode {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetCollection = field.target || '';
  const fetchedRef = useRef(false);

  const loadOptions = useCallback(async (searchTerm: string) => {
    if (!targetCollection) return;
    setLoading(true);
    setError(null);
    try {
      const searchFilter = searchTerm
        ? { $or: [
            { name: { $includes: searchTerm } },
            { nome: { $includes: searchTerm } },
            { title: { $includes: searchTerm } },
            { label: { $includes: searchTerm } },
            { DistrictName: { $includes: searchTerm } },
          ]}
        : undefined;

      // Cascading geographic filter: districts by province, villages by district
      let cascadeFilter: Record<string, unknown> | undefined;
      if (targetCollection.endsWith('_districts')) {
        const provinceField = allFields.find((f) => f.target?.endsWith('_provinces'));
        const provinceValue = provinceField ? allValues[provinceField.name] : null;
        if (provinceValue != null && provinceValue !== '') {
          const fk = provinceField?.foreignKey || 'province_id';
          cascadeFilter = { [fk]: provinceValue };
        }
      } else if (targetCollection.endsWith('_villages')) {
        const districtField = allFields.find((f) => f.target?.endsWith('_districts'));
        const districtValue = districtField ? allValues[districtField.name] : null;
        if (districtValue != null && districtValue !== '') {
          const fk = districtField?.foreignKey || 'district_id';
          cascadeFilter = { [fk]: districtValue };
        }
      }

      const filter = searchFilter && cascadeFilter
        ? { $and: [searchFilter, cascadeFilter] }
        : searchFilter ?? cascadeFilter;

      const data = await fetchRecords(targetCollection, {
        page: 1,
        pageSize: 50,
        filter,
      });
      setOptions(data.data ?? []);
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Error loading options';
      setError(msg);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [targetCollection, allFields, allValues]);

  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      loadOptions('');
    }
  }, [open, loadOptions]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      fetchedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const selectedLabel = (() => {
    if (value == null || value === '') return '';
    if (typeof value === 'object') return extractRecordLabel(value as Record<string, unknown>);
    const found = options.find((o) => String(o.id) === String(value));
    return found ? extractRecordLabel(found) : String(value);
  })();

  const filteredOptions = search
    ? options.filter((o) =>
        extractRecordLabel(o).toLowerCase().includes(search.toLowerCase())
      )
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !readOnly && setOpen((v) => !v)}
        disabled={readOnly}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={selectedLabel ? 'text-slate-700' : 'text-slate-400'}>
          {selectedLabel || `— ${t('form.selectOption')} —`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  loadOptions(e.target.value);
                }}
                placeholder={t('form.searchPlaceholder')}
                autoFocus
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('form.loadingOptions')}
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm text-rose-500">{error}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-400">{t('form.noResults')}</div>
            ) : (
              filteredOptions.map((opt) => {
                const optId = opt.id;
                const optLabel = extractRecordLabel(opt);
                const isSelected = String(optId) === String(value ?? '');
                return (
                  <button
                    key={String(optId)}
                    type="button"
                    onClick={() => {
                      onChange(optId);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-slate-900" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordFormModal;
