import { useState } from 'react';
import { Plus, Trash2, Loader2, Table2, X, GripVertical } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useProject } from '@/hooks/useProject';
import { useLanguage } from '@/hooks/useLanguage';
import { createCollection, createField, deleteCollection, NocoDBError } from '@/services/nocodb';
import type { NocoBaseCollection } from '@/types/nocodb';

interface TableBuilderProps {
  collections: NocoBaseCollection[];
  onTableCreated: () => void;
  onTableDeleted: (collectionName: string) => void;
}

interface FieldDraft {
  id: string;
  name: string;
  label: string;
  type: 'input' | 'textarea' | 'integer' | 'float' | 'boolean' | 'date' | 'select';
}

const FIELD_TYPES: { value: FieldDraft['type']; label: string }[] = [
  { value: 'input', label: 'Texto Curto' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'integer', label: 'Número Inteiro' },
  { value: 'float', label: 'Número Decimal' },
  { value: 'boolean', label: 'Sim/Não (Checkbox)' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção' },
];

const TYPE_MAP: Record<FieldDraft['type'], string> = {
  input: 'string',
  textarea: 'text',
  integer: 'integer',
  float: 'float',
  boolean: 'boolean',
  date: 'date',
  select: 'string',
};

let fieldIdCounter = 0;
function nextFieldId(): string {
  fieldIdCounter++;
  return `field-${fieldIdCounter}`;
}

export default function TableBuilder({ collections, onTableCreated, onTableDeleted }: TableBuilderProps) {
  const { notify } = useToast();
  const { tablePrefix, activeProject } = useProject();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [tableName, setTableName] = useState('');
  const [tableTitle, setTableTitle] = useState('');
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTable, setDeletingTable] = useState<string | null>(null);

  const prefixedCollections = collections.filter((c) => c.name.startsWith(tablePrefix));

  const resetForm = () => {
    setTableName('');
    setTableTitle('');
    setFields([]);
    setShowForm(false);
  };

  const addField = () => {
    setFields((prev) => [...prev, { id: nextFieldId(), name: '', label: '', type: 'input' }]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateField = (id: string, key: keyof FieldDraft, value: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const handleCreate = async () => {
    if (!tableName.trim() || !tableTitle.trim()) {
      notify('error', 'Indique o nome e o título da tabela.');
      return;
    }
    const cleanName = tableName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const fullName = `${tablePrefix}${cleanName}`;

    setSubmitting(true);
    try {
      await createCollection(fullName, tableTitle.trim());
      for (const f of fields) {
        if (!f.name.trim() || !f.label.trim()) continue;
        await createField(fullName, {
          name: f.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, ''),
          interface: f.type,
          type: TYPE_MAP[f.type],
          uiSchema: { title: f.label.trim(), 'x-component': f.type === 'textarea' ? 'Input.TextArea' : 'Input' },
        });
      }
      notify('success', `Tabela "${tableTitle}" criada com sucesso.`);
      resetForm();
      onTableCreated();
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao criar a tabela.';
      notify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (collectionName: string, collectionTitle: string) => {
    setDeletingTable(collectionName);
    try {
      await deleteCollection(collectionName);
      notify('success', `Tabela "${collectionTitle}" eliminada.`);
      onTableDeleted(collectionName);
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao eliminar a tabela.';
      notify('error', msg);
    } finally {
      setDeletingTable(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 md:h-10 md:w-10">
            <Table2 className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 md:text-lg">{t('sidebar.tableConfig')}</h2>
            <p className="text-xs text-slate-400">
              {activeProject?.nome} · Prefixo: <code className="rounded bg-slate-100 px-1 text-slate-600">{tablePrefix || '(nativo)'}</code>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('admin.createProject')}</span>
          <span className="sm:hidden">{t('admin.createProjectShort')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {showForm && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Nova Tabela</h3>
              <button onClick={resetForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Nome da tabela (sem prefixo)</label>
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                  {tablePrefix && (
                    <span className="pl-3 pr-1 text-sm text-slate-400">{tablePrefix}</span>
                  )}
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="pacientes_malaria"
                    className="flex-1 rounded-lg border-0 bg-transparent py-2 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Título de exibição</label>
                <input
                  type="text"
                  value={tableTitle}
                  onChange={(e) => setTableTitle(e.target.value)}
                  placeholder="Pacientes de Malária"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">Campos da tabela</label>
                <button
                  onClick={addField}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar campo
                </button>
              </div>

              {fields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                  Sem campos adicionais. A tabela será criada com os campos base do sistema (id, createdAt, updatedAt).
                </p>
              ) : (
                <div className="space-y-2">
                  {fields.map((f) => (
                    <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:flex-row sm:items-center">
                      <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => updateField(f.id, 'name', e.target.value)}
                        placeholder="nome_campo"
                        className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:w-32"
                      />
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => updateField(f.id, 'label', e.target.value)}
                        placeholder="Rótulo do campo"
                        className="w-full flex-1 rounded border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:flex-1"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => updateField(f.id, 'type', e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 focus:outline-none sm:w-auto"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeField(f.id)}
                        className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={resetForm}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {t('table.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t('admin.createProjectLabel')}
              </button>
            </div>
          </div>
        )}

        {prefixedCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Table2 className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">Nenhuma tabela criada</h3>
            <p className="mt-1 text-sm text-slate-400">
              Este projeto ainda não tem tabelas. Crie a primeira tabela para começar a registar dados.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {t('admin.createProject')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {prefixedCollections.map((c) => (
              <div
                key={c.key}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Table2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {c.title || c.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      <code className="rounded bg-slate-50 px-1">{c.name}</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.name, c.title || c.name)}
                  disabled={deletingTable === c.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {deletingTable === c.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
