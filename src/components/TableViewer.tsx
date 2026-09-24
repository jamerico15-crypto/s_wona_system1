import { useEffect, useState, useCallback, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Table2, Columns3, Plus } from 'lucide-react';
import DataGrid from '@/components/DataGrid';
import Pagination from '@/components/Pagination';
import RecordFormModal from '@/components/RecordFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { fetchFields, fetchRecords, createRecord, updateRecord, deleteRecord, NocoDBError } from '@/services/nocodb';
import type { NocoBaseField, NocoBaseCollection } from '@/types/nocodb';
import { useAuth } from '@/hooks/useAuth';
import { useVisibility } from '@/hooks/useVisibility';
import { useLanguage } from '@/hooks/useLanguage';
import { useProject } from '@/hooks/useProject';
import { displayTitle } from '@/components/Sidebar';

interface CollectionViewerProps {
  collection: NocoBaseCollection;
}

export default function CollectionViewer({ collection }: CollectionViewerProps) {
  const { notify } = useToast();
  const { role } = useAuth();
  const { projectRole } = useProject();
  const { fieldVisible } = useVisibility();
  const { t } = useLanguage();
  const [fields, setFields] = useState<NocoBaseField[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [loadingFields, setLoadingFields] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const title = useMemo(() => displayTitle(collection), [collection]);

  const appends = useMemo(() => {
    return fields
      .filter((f) => f.interface === 'm2o' || f.interface === 'o2o')
      .map((f) => f.name);
  }, [fields]);

  const visibleFields = useMemo(
    () => fields.filter((f) => fieldVisible(collection.name, f.name)),
    [fields, fieldVisible, collection.name],
  );

  const loadFields = useCallback(async (signal?: AbortSignal) => {
    setLoadingFields(true);
    try {
      const data = await fetchFields(collection.name, signal);
      setFields(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao carregar os campos da tabela.';
      setError(msg);
    } finally {
      setLoadingFields(false);
    }
  }, [collection.name]);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await fetchRecords(collection.name, { page, pageSize, appends, signal });
      setRecords(data.data ?? []);
      setTotalRows(data.meta?.count ?? 0);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof NocoDBError ? err.message : t('table.noData');
      setError(msg);
      setRecords([]);
    } finally {
      setLoadingData(false);
    }
  }, [collection.name, page, pageSize, appends]);

  useEffect(() => {
    const controller = new AbortController();
    setFields([]);
    setRecords([]);
    setTotalRows(0);
    setPage(1);
    setError(null);
    loadFields(controller.signal);
    return () => controller.abort();
  }, [collection.name, loadFields]);

  useEffect(() => {
    const controller = new AbortController();
    if (fields.length > 0 || !loadingFields) {
      loadData(controller.signal);
    }
    return () => controller.abort();
  }, [loadData, fields.length, loadingFields]);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, newPage));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleAdd = () => {
    setFormMode('create');
    setEditingRecord(null);
    setFormOpen(true);
  };

  const handleEdit = (record: Record<string, unknown>) => {
    setFormMode('edit');
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleDeleteRequest = (record: Record<string, unknown>) => {
    setDeleteTarget(record);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const recordId = deleteTarget.id as string | number;
    if (recordId == null) return;
    setDeleting(true);
    try {
      await deleteRecord(collection.name, recordId);
      notify('success', t('table.recordDeleted'));
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao eliminar o registo.';
      notify('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    if (formMode === 'create') {
      await createRecord(collection.name, values);
      notify('success', t('table.recordCreated'));
    } else {
      const recordId = editingRecord?.id as string | number;
      if (recordId == null) throw new Error('ID do registo em falta.');
      await updateRecord(collection.name, recordId, values);
      notify('success', t('table.recordUpdated'));
    }
    setFormOpen(false);
    setEditingRecord(null);
    loadData();
  };

  const canCreate = (role !== 'leitor' && projectRole !== 'leitor' && projectRole !== 'none') && !collection.unavailableActions?.includes('create');
  const canEdit = (role !== 'leitor' && projectRole !== 'leitor' && projectRole !== 'none') && !collection.unavailableActions?.includes('update');
  const canDelete = (role === 'admin' || role === 'super_admin' || projectRole === 'admin_projeto' || projectRole === 'super_admin') && !collection.unavailableActions?.includes('destroy');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 md:h-10 md:w-10">
            <Table2 className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 md:text-lg">{title}</h2>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Columns3 className="h-3.5 w-3.5" />
              {visibleFields.length} campo{visibleFields.length === 1 ? '' : 's'}
              {fields.length !== visibleFields.length && (
                <span className="ml-1 text-amber-500">· {fields.length - visibleFields.length} oculto{fields.length - visibleFields.length === 1 ? '' : 's'}</span>
              )}
              {totalRows > 0 && <span className="ml-1">· {totalRows.toLocaleString()} registos</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('table.addRecord')}</span>
              <span className="sm:hidden">{t('table.addRecordShort')}</span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loadingData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('table.refresh')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 md:mx-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-900">{t('visibility.errorLoadingFields')}</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
          >
            {t('visibility.tryAgain')}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="min-w-full overflow-x-auto">
        <DataGrid
          collection={collection}
          fields={visibleFields}
          records={records}
          loading={loadingData || loadingFields}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDeleteRequest : undefined}
        />
        </div>
      </div>

      {!error && records.length > 0 && (
        <Pagination
          page={page}
          limit={pageSize}
          totalRows={totalRows}
          onPageChange={handlePageChange}
          onLimitChange={handlePageSizeChange}
        />
      )}

      <RecordFormModal
        open={formOpen}
        mode={formMode}
        fields={visibleFields}
        initialValues={editingRecord ?? undefined}
        collectionTitle={title}
        readOnly={projectRole === 'leitor' || role === 'leitor'}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setFormOpen(false);
          setEditingRecord(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('table.deleteRecord')}
        message={t('table.confirmDelete')}
        confirmLabel={t('table.delete')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
