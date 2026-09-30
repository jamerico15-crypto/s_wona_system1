import { useEffect, useState, useCallback, type ReactNode, type FormEvent } from 'react';
import {
  FolderKanban, Plus, ArrowRight, Loader2, AlertTriangle,
  RefreshCw, ShieldCheck, X, UserCircle, ChevronDown, Palette,
  Pencil, Trash2, BarChart3, CheckCircle2, Clock, PauseCircle, Activity,
  Settings as SettingsIcon, Link2, Table2, Eye,
} from 'lucide-react';
import {
  fetchRecords, createRecord, updateRecord, deleteRecord,
  NocoDBError,
} from '@/services/nocodb';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import type { Project } from '@/contexts/ProjectContext';
import { getProjectPrefix } from '@/config/projectConfig';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';
import { useBranding } from '@/hooks/useBranding';
import { useLanguage } from '@/hooks/useLanguage';
import LanguageSelector from '@/components/LanguageSelector';
import BrandingSettingsModal from '@/components/BrandingSettingsModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AccessMatrix from '@/components/AccessMatrix';
import UserProjectManager from '@/components/UserProjectManager';
import ProjectTableVisibility from '@/components/ProjectTableVisibility';
import ProjectVisibility from '@/components/ProjectVisibility';
import VisibilityPanel from '@/components/VisibilityPanel';
import { fetchCollections } from '@/services/nocodb';
import type { NocoBaseCollection } from '@/types/nocodb';


interface MainAdminPageProps {
  onEnterProject: (project: Project) => void;
}

type AdminTab = 'projects' | 'users' | 'tables' | 'projectVisibility' | 'visibility' | 'settings';

export default function MainAdminPage({ onEnterProject }: MainAdminPageProps) {
  const { user, logout, role, assignedProjects } = useAuth();
  const { setProjects } = useProject();
  const { notify } = useToast();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [allCollections, setAllCollections] = useState<NocoBaseCollection[]>([]);
  const { branding } = useBranding();
  const { t } = useLanguage();

  const canManage = role === 'super_admin' || role === 'admin';
  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin && activeTab !== 'projects') {
      setActiveTab('projects');
    }
  }, [isSuperAdmin, activeTab]);

  useEffect(() => {
    if (!isSuperAdmin || allCollections.length > 0) return;
    let cancelled = false;
    fetchCollections()
      .then((cols) => { if (!cancelled) setAllCollections(cols); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSuperAdmin, allCollections.length]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (canManage) {
        const data = await fetchRecords('projetos', { page: 1, pageSize: 100 });
        const list: Project[] = (data.data ?? []).map((r) => ({
          id: r.id as string | number,
          nome: r.nome as string,
          descricao: r.descricao as string | null,
          status: r.status as string | null,
          table_prefix: (r.table_prefix as string | null) ?? null,
        }));
        setAllProjects(list);
        setProjects(list);
      } else {
        setAllProjects(assignedProjects);
        setProjects(assignedProjects);
      }
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao carregar projetos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [setProjects, canManage, assignedProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = async () => {
    if (!deletingProject) return;
    setDeleteLoading(true);
    try {
      await deleteRecord('projetos', deletingProject.id);
      notify('success', `Projeto "${deletingProject.nome}" eliminado com sucesso.`);
      setDeletingProject(null);
      loadProjects();
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao eliminar projeto.';
      notify('error', msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter projects based on user role: managers see all, others see only authorized ones
  const projects = canManage ? allProjects : assignedProjects;

  // Dashboard stats — computed from the filtered (authorized) projects list
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => {
    const s = (p.status ?? '').toLowerCase();
    return s === 'ativo' || s === 'active';
  }).length;
  const pausedProjects = projects.filter((p) => {
    const s = (p.status ?? '').toLowerCase();
    return s === 'pausado' || s === 'paused';
  }).length;
  const completedProjects = projects.filter((p) => {
    const s = (p.status ?? '').toLowerCase();
    return s === 'concluido' || s === 'completed' || s === 'concluído';
  }).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8 md:py-4">
        <div className="flex items-center gap-3">
          {branding.logo ? (
            <img
              src={branding.logo}
              alt="Logótipo"
              className="h-9 w-9 rounded-xl object-contain md:h-10 md:w-10"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white md:h-10 md:w-10" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
              <ShieldCheck className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 md:text-lg">{t('admin.title')}</h1>
            <p className="text-xs text-slate-400">{t('admin.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSelector compact />
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: TLM_PRIMARY }}>
              {user?.nickname?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? 'S'}
            </div>
            <span className="hidden text-sm font-medium text-slate-600 sm:inline">{user?.nickname || user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <span>{t('admin.logout')}</span>
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 md:px-8">
        <TabButton
          active={activeTab === 'projects'}
          onClick={() => setActiveTab('projects')}
          icon={<FolderKanban className="h-4 w-4" />}
          label={t('admin.tabProjects')}
        />
        {isSuperAdmin && (
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon={<Link2 className="h-4 w-4" />}
            label="Utilizadores"
          />
        )}
        {isSuperAdmin && (
          <TabButton
            active={activeTab === 'tables'}
            onClick={() => setActiveTab('tables')}
            icon={<Table2 className="h-4 w-4" />}
            label="Tabelas por Projeto"
          />
        )}
        {isSuperAdmin && (
          <TabButton
            active={activeTab === 'projectVisibility'}
            onClick={() => setActiveTab('projectVisibility')}
            icon={<FolderKanban className="h-4 w-4" />}
            label="Projetos por Utilizador"
          />
        )}

        {isSuperAdmin && (
          <TabButton
            active={activeTab === 'visibility'}
            onClick={() => setActiveTab('visibility')}
            icon={<Eye className="h-4 w-4" />}
            label="Visibilidade Global"
          />
        )}

        {isSuperAdmin && (
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon className="h-4 w-4" />}
            label={t('admin.tabSettings')}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {activeTab === 'projects' && (
          <ProjectsTab
            projects={projects}
            allProjects={allProjects}
            loading={loading}
            error={error}
            isSuperAdmin={isSuperAdmin}
            canManage={canManage}
            onRefresh={loadProjects}
            onEnter={onEnterProject}
            onEdit={setEditingProject}
            onDelete={setDeletingProject}
            onCreate={() => setShowCreateModal(true)}
            totalProjects={totalProjects}
            activeProjects={activeProjects}
            pausedProjects={pausedProjects}
            completedProjects={completedProjects}
          />
        )}

        {activeTab === 'users' && isSuperAdmin && (
          <UserProjectManager />
        )}

        {activeTab === 'tables' && isSuperAdmin && (
          <ProjectTableVisibility />
        )}

        {activeTab === 'projectVisibility' && isSuperAdmin && (
          <ProjectVisibility />
        )}

        {activeTab === 'visibility' && isSuperAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
            <VisibilityPanel collections={allCollections} />
          </div>
        )}

        {activeTab === 'settings' && isSuperAdmin && (
          <SettingsTab
            onOpenBranding={() => setShowBrandingModal(true)}
          />
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadProjects();
          }}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdated={() => {
            setEditingProject(null);
            loadProjects();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletingProject}
        title={t('table.deleteRecord')}
        message={t('table.confirmDelete')}
        confirmLabel={t('table.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeletingProject(null)}
        loading={deleteLoading}
      />

      {showBrandingModal && (
        <BrandingSettingsModal onClose={() => setShowBrandingModal(false)} />
      )}
    </div>
  );
}

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
        active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ProjectsTab({
  projects, allProjects, loading, error, isSuperAdmin, canManage, onRefresh, onEnter, onEdit, onDelete, onCreate,
  totalProjects, activeProjects, pausedProjects, completedProjects,
}: {
  projects: Project[];
  allProjects: Project[];
  loading: boolean;
  error: string | null;
  isSuperAdmin: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onEnter: (p: Project) => void;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onCreate: () => void;
  totalProjects: number;
  activeProjects: number;
  pausedProjects: number;
  completedProjects: number;
}) {
  const { t } = useLanguage();
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 md:text-xl">{t('admin.projectsTitle')}</h2>
          <p className="text-sm text-slate-500">{t('admin.projectsDesc')}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('admin.refresh')}</span>
            </button>
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: TLM_PRIMARY }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.createProject')}</span>
              <span className="sm:hidden">{t('admin.createProjectShort')}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-900">{t('visibility.errorLoadingFields')}</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">{t('table.loading')}</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <FolderKanban className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">{t('admin.projectsTitle')}</h3>
            <p className="mt-2 text-sm text-slate-500">{t('admin.projectsDesc')}</p>
            {canManage && (
              <button
                onClick={onCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: TLM_PRIMARY }}
              >
                <Plus className="h-4 w-4" />
                {t('admin.createProject')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEnter={() => onEnter(project)}
                onEdit={() => onEdit(project)}
                onDelete={() => onDelete(project)}
                isSuperAdmin={isSuperAdmin}
              />
            ))}
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              <h3 className="text-base font-bold text-slate-800">Resumo Geral</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<FolderKanban className="h-5 w-5" />} label={t('admin.totalProjects')} value={totalProjects} color={TLM_PRIMARY} />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label={t('admin.activeProjects')} value={activeProjects} color="#16a34a" />
              <StatCard icon={<PauseCircle className="h-5 w-5" />} label={t('admin.pausedProjects')} value={pausedProjects} color="#d97706" />
              <StatCard icon={<Clock className="h-5 w-5" />} label={t('admin.completedProjects')} value={completedProjects} color="#64748b" />
            </div>

            {totalProjects > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Distribuição por Estado</span>
                  <Activity className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {activeProjects > 0 && (
                    <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(activeProjects / totalProjects) * 100}%` }} title={`${activeProjects} ativos`} />
                  )}
                  {pausedProjects > 0 && (
                    <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(pausedProjects / totalProjects) * 100}%` }} title={`${pausedProjects} pausados`} />
                  )}
                  {completedProjects > 0 && (
                    <div className="bg-slate-400 transition-all duration-500" style={{ width: `${(completedProjects / totalProjects) * 100}%` }} title={`${completedProjects} concluídos`} />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    {activeProjects} Ativos
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    {pausedProjects} Pausados
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    {completedProjects} Concluídos
                  </span>
                </div>
              </div>
            )}
          </div>

            {isSuperAdmin && (
              <div className="mt-8">
                <AccessMatrix />
              </div>
            )}
          </>
        )}
      </>
    );
  }

function SettingsTab({
  onOpenBranding,
}: {
  onOpenBranding: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 md:text-xl">{t('admin.settingsTitle')}</h2>
        <p className="text-sm text-slate-500">{t('admin.settingsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Branding card */}
        <button
          onClick={onOpenBranding}
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-lg"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: TLM_SECONDARY }}>
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{t('admin.brandingTitle')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('admin.brandingDesc')}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white md:h-10 md:w-10" style={{ background: color }}>
          {icon}
        </div>
        <span className="text-xl font-bold text-slate-800 md:text-2xl">{value}</span>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

function ProjectCard({
  project, onEnter, onEdit, onDelete, isSuperAdmin,
}: {
  project: Project;
  onEnter: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSuperAdmin: boolean;
}) {
  const { t } = useLanguage();
  const prefix = getProjectPrefix(project.id, project.nome);
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-lg md:p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white md:h-12 md:w-12">
          <FolderKanban className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2">
          {project.status && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              project.status === 'ativo' || project.status === 'Ativo'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
            }`}>
              {project.status}
            </span>
          )}
          {isSuperAdmin && (
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
              <button onClick={onEdit} title={t('table.edit')} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={onDelete} title={t('table.delete')} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800">{project.nome}</h3>
      {project.descricao && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.descricao}</p>}
      {prefix && <p className="mt-2 text-xs text-slate-400">Prefixo: <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-600">{prefix}</code></p>}
      <button
        onClick={onEnter}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 group-hover:opacity-90"
        style={{ background: TLM_PRIMARY }}
      >
        {t('admin.enterProject')}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { notify } = useToast();
  const { t } = useLanguage();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('ativo');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSubmitting(true);
    try {
      await createRecord('projetos', { nome: nome.trim(), descricao: descricao.trim() || null, status });
      notify('success', `Projeto "${nome}" criado com sucesso.`);
      onCreated();
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao criar projeto.';
      notify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={t('admin.createProjectTitle')} icon={<Plus className="h-5 w-5" />}>
      <ProjectForm
        nome={nome} setNome={setNome}
        descricao={descricao} setDescricao={setDescricao}
        status={status} setStatus={setStatus}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel={t('admin.createProjectLabel')}
      />
    </ModalShell>
  );
}

function EditProjectModal({ project, onClose, onUpdated }: { project: Project; onClose: () => void; onUpdated: () => void }) {
  const { notify } = useToast();
  const { t } = useLanguage();
  const [nome, setNome] = useState(project.nome);
  const [descricao, setDescricao] = useState(project.descricao ?? '');
  const [status, setStatus] = useState(project.status ?? 'ativo');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSubmitting(true);
    try {
      await updateRecord('projetos', project.id, { nome: nome.trim(), descricao: descricao.trim() || null, status });
      notify('success', `Projeto "${nome}" atualizado com sucesso.`);
      onUpdated();
    } catch (err) {
      const msg = err instanceof NocoDBError ? err.message : 'Falha ao atualizar projeto.';
      notify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={t('table.editRecord')} icon={<Pencil className="h-5 w-5" />}>
      <ProjectForm
        nome={nome} setNome={setNome}
        descricao={descricao} setDescricao={setDescricao}
        status={status} setStatus={setStatus}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel={t('admin.save')}
      />
    </ModalShell>
  );
}

function ProjectForm({
  nome, setNome, descricao, setDescricao, status, setStatus,
  submitting, onSubmit, onCancel, submitLabel,
}: {
  nome: string; setNome: (v: string) => void;
  descricao: string; setDescricao: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { t } = useLanguage();
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.projectName')}</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Olikanassa" autoFocus className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.projectDescription')}</label>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição do projeto..." rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.projectStatus')}</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none">
          <option value="ativo">{t('admin.statusActive')}</option>
          <option value="pausado">{t('admin.statusPaused')}</option>
          <option value="concluido">{t('admin.statusCompleted')}</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          {t('table.cancel')}
        </button>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50" style={{ background: TLM_PRIMARY }}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function ModalShell({
  onClose, title, icon, wide, children,
}: {
  onClose: () => void;
  title: string;
  icon: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-sm sm:p-4">
      <div className={`max-h-[95vh] overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh] ${wide ? 'w-full max-w-3xl' : 'w-full max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: TLM_PRIMARY }}>
              {icon}
            </div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
