import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Database, RefreshCw, AlertTriangle, Search, Loader2, FolderKanban, Menu, ShieldAlert, AlertCircle } from 'lucide-react';
import Sidebar, { displayTitle, type SidebarView } from '@/components/Sidebar';
import LanguageSelector from '@/components/LanguageSelector';
import CollectionViewer from '@/components/TableViewer';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import TableBuilder from '@/components/TableBuilder';
import ReportCenter from '@/components/ReportCenter';
import ConfigBanner from '@/components/ConfigBanner';
import LoginPage from '@/components/LoginPage';
import MainAdminPage from '@/components/MainAdminPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { useProject } from '@/hooks/useProject';
import type { Project } from '@/contexts/ProjectContext';
import type { ProjectRole } from '@/contexts/ProjectContext';

import {
  fetchCollectionsForProject,
  fetchCollectionsByPrefix,
  fetchRecords,
  fetchProjectTableVisibility,
  getConfigStatus,
  DatabaseError,
} from '@/services/database';
import type { TableCollection } from '@/types/database';
import { TLM_PRIMARY } from '@/config/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/components/Toast';

type Route = 'main' | 'project';

function getProjectIdFromUrl(): string | null {
  const m = window.location.pathname.match(/^\/projeto\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function setProjectUrl(projectId: string) {
  const url = `/projeto/${encodeURIComponent(projectId)}`;
  if (window.location.pathname !== url) {
    window.history.pushState({ projectId }, '', url);
  }
}

function clearProjectUrl() {
  if (window.location.pathname.startsWith('/projeto/')) {
    window.history.pushState({}, '', '/');
  }
}

export default function App() {
  const { user, role, token, loading: authLoading, assignedProjects, login, logout, validateProjectRole, serverActiveProjectId, serverActiveProject, refreshActiveProject } = useAuth();
  const { loading: brandingLoading } = useBranding();
  const {
    activeProject, projects, setProjects, setActiveProject,
    projectRole, setProjectRole, accessDenied, setAccessDenied,
    resetProjectState, tablePrefix,
  } = useProject();
  const [collections, setCollections] = useState<TableCollection[]>([]);
  const [projectHiddenTables, setProjectHiddenTables] = useState<Set<string>>(new Set());
  const [activeCollection, setActiveCollection] = useState<TableCollection | null>(null);
  const [search, setSearch] = useState('');
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [view, setView] = useState<SidebarView>('dashboard');
  const [route, setRoute] = useState<Route>('project');
  const [routeReady, setRouteReady] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [validatingAccess, setValidatingAccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { t } = useLanguage();
  const { notify } = useToast();
  const lastProjectId = useRef<string | null>(null);

  const { configured, missing } = getConfigStatus();

  useEffect(() => {
    if (authLoading || !user) return;
    const urlProjectId = getProjectIdFromUrl();
    if (urlProjectId) {
      setRoute('project');
      setRouteReady(true);
      return;
    }
    if (serverActiveProjectId) {
      setRoute('project');
      setRouteReady(true);
      return;
    }
    setRoute('main');
    resetProjectState();
    setRouteReady(true);
  }, [user, authLoading, serverActiveProjectId, resetProjectState]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      if (document.visibilityState === 'visible') {
        refreshActiveProject();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user, refreshActiveProject]);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      if (role === 'super_admin' || role === 'admin') {
        const data = await fetchRecords('projetos', { page: 1, pageSize: 100 });
        const projectList: Project[] = (data.data ?? []).map((r) => ({
          id: String(r.id),
          nome: r.nome as string,
          descricao: r.descricao as string | null,
          status: r.status as string | null,
          table_prefix: (r.table_prefix as string | null) ?? null,
        }));
        setProjects(projectList);
      } else {
        setProjects(assignedProjects);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [setProjects, role, assignedProjects, token]);

  useEffect(() => {
    if (!user || !activeProject || route !== 'project') return;
    const currentId = String(activeProject.id);
    if (lastProjectId.current === currentId) return;
    lastProjectId.current = currentId;

    if (!currentId || currentId === 'undefined' || currentId === 'null') {
      setValidationError(t('security.invalidProjectDesc'));
      setValidatingAccess(false);
      setAccessDenied(true);
      setProjectRole('none');
      return;
    }

    let cancelled = false;
    setValidatingAccess(true);
    setAccessDenied(false);
    setValidationError(null);

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setValidatingAccess(false);
      setValidationError(t('security.validationFailedDesc'));
      setAccessDenied(true);
      setProjectRole('none');
      notify('error', t('security.validationFailedDesc'));
    }, 10000);

    validateProjectRole(activeProject.id)
      .then((validatedRole: ProjectRole) => {
        if (cancelled) return;
        if (validatedRole === 'none') {
          setAccessDenied(true);
          setProjectRole('none');
          setCollections([]);
          setActiveCollection(null);
        } else {
          setAccessDenied(false);
          setProjectRole(validatedRole);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAccessDenied(true);
        setProjectRole('none');
        setValidationError(t('security.validationFailedDesc'));
        notify('error', t('security.validationFailedDesc'));
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setValidatingAccess(false);
      });

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [user, activeProject, route, validateProjectRole, setAccessDenied, setProjectRole, notify, t]);

  const loadCollections = useCallback(async (signal?: AbortSignal) => {
    if (!activeProject || !activeProject.id || String(activeProject.id) === 'undefined') {
      setCollections([]);
      setActiveCollection(null);
      setLoadingCollections(false);
      return;
    }
    setLoadingCollections(true);
    setCollectionsError(null);
    try {
      const prefixes = tablePrefix ? [tablePrefix] : [];
      const isSuperAdmin = role === 'super_admin';
      const data = await fetchCollectionsForProject(prefixes, {
        includeMaster: isSuperAdmin,
        signal,
      });
      setCollections(data);
      if (data.length > 0) {
        const sorted = [...data].sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
        setActiveCollection((prev) => (prev && data.find((c) => c.name === prev.name) ? prev : sorted[0]));
      } else {
        setActiveCollection(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof DatabaseError ? err.message : 'Falha ao carregar as tabelas.';
      setCollectionsError(msg);
      setCollections([]);
    } finally {
      setLoadingCollections(false);
    }
  }, [activeProject, tablePrefix, role]);

  useEffect(() => {
    if (!configured || !user) {
      setLoadingCollections(false);
      return;
    }
    loadProjects();
  }, [configured, user, loadProjects]);

  useEffect(() => {
    if (!user || route !== 'project' || activeProject) return;
    const urlProjectId = getProjectIdFromUrl();
    const projectIdToRestore = urlProjectId ?? serverActiveProjectId;
    if (!projectIdToRestore) return;

    if (projects.length > 0) {
      const found = projects.find((p) => String(p.id) === String(projectIdToRestore));
      if (found) {
        setActiveProject(found);
        if (!urlProjectId) setProjectUrl(String(found.id));
        return;
      }
    }

    if (!urlProjectId && serverActiveProject && String(serverActiveProject.id) === String(projectIdToRestore)) {
      const proj: Project = {
        id: serverActiveProject.id,
        nome: serverActiveProject.nome ?? 'Projeto',
        table_prefix: serverActiveProject.table_prefix,
      };
      setActiveProject(proj);
      setProjectUrl(String(proj.id));
      return;
    }

    if (!urlProjectId && serverActiveProjectId) {
      notify('info', 'O projeto ativo foi removido ou desatribuido. Selecione outro projeto.');
    }
    setRoute('main');
    resetProjectState();
    clearProjectUrl();
  }, [user, route, projects, activeProject, serverActiveProjectId, serverActiveProject, setActiveProject, resetProjectState, notify]);

  useEffect(() => {
    const handler = () => {
      const urlProjectId = getProjectIdFromUrl();
      if (urlProjectId && projects.length > 0) {
        const found = projects.find((p) => String(p.id) === urlProjectId);
        if (found) {
          setActiveProject(found);
          setRoute('project');
          return;
        }
      }
      setRoute('main');
      resetProjectState();
      clearProjectUrl();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [projects, setActiveProject, resetProjectState]);

  useEffect(() => {
    if (!configured || !user || !activeProject || route !== 'project' || accessDenied || validatingAccess) {
      if (!activeProject || accessDenied) setLoadingCollections(false);
      return;
    }
    const controller = new AbortController();
    loadCollections(controller.signal);
    return () => controller.abort();
  }, [configured, user, activeProject, route, accessDenied, validatingAccess, loadCollections]);

  useEffect(() => {
    if (!activeProject || role === 'super_admin') {
      setProjectHiddenTables(new Set());
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchProjectTableVisibility(activeProject.id, user?.id ?? null),
      fetchProjectTableVisibility(activeProject.id, undefined, role),
    ])
      .then(([userRows, roleRows]) => {
        if (cancelled) return;
        const hidden = new Set<string>();
        for (const row of userRows) {
          if (!row.visible) hidden.add(row.collection_name);
        }
        for (const row of roleRows) {
          if (!row.visible) hidden.add(row.collection_name);
        }
        setProjectHiddenTables(hidden);
      })
      .catch(() => {
        if (!cancelled) setProjectHiddenTables(new Set());
      });
    return () => { cancelled = true; };
  }, [activeProject, role, user]);

  const visibleCollections = useMemo(
    () => collections.filter((c) => !projectHiddenTables.has(c.name)),
    [collections, projectHiddenTables],
  );

  const handleSelectCollection = (collection: TableCollection) => {
    setActiveCollection(collection);
  };

  const handleRetry = () => {
    loadCollections();
  };

  const handleTableCreated = () => {
    loadCollections();
    setView('table');
  };

  const handleTableDeleted = (collectionName: string) => {
    if (activeCollection?.name === collectionName) {
      setActiveCollection(null);
    }
    loadCollections();
  };

  const handleEnterProject = (project: Project) => {
    setCollections([]);
    setActiveCollection(null);
    setSearch('');
    setView('dashboard');
    setAccessDenied(false);
    setProjectRole('none');
    setValidationError(null);
    lastProjectId.current = null;
    setActiveProject(project);
    setRoute('project');
    setProjectUrl(String(project.id));
  };

  const handleBackToAdmin = () => {
    setRoute('main');
    resetProjectState();
    setCollections([]);
    setActiveCollection(null);
    setSearch('');
    setView('dashboard');
    setValidationError(null);
    lastProjectId.current = null;
    clearProjectUrl();
  };

  const handleProjectSelect = (p: Project) => {
    setCollections([]);
    setActiveCollection(null);
    setSearch('');
    setView('dashboard');
    setAccessDenied(false);
    setProjectRole('none');
    setValidationError(null);
    lastProjectId.current = null;
    setActiveProject(p);
    setProjectUrl(String(p.id));
  };

  const showTableBuilder = (role === 'super_admin' || role === 'admin' || projectRole === 'admin_projeto');

  if (!configured) {
    return (
      <div className="flex h-screen bg-slate-50">
        <ConfigBanner missing={missing} />
      </div>
    );
  }

  if (authLoading || brandingLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  if (route === 'main') {
    return <MainAdminPage onEnterProject={handleEnterProject} />;
  }

  const sidebarUser = user
    ? { name: user.nickname || user.username || user.email, email: user.email, role }
    : null;

  if (accessDenied && activeProject) {
    const isValidationError = validationError !== null;
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            {isValidationError ? <AlertCircle className="h-8 w-8 text-rose-600" /> : <ShieldAlert className="h-8 w-8 text-rose-600" />}
          </div>
          <h2 className="text-xl font-bold text-rose-900">
            {isValidationError ? t('security.validationFailed') : t('security.accessDenied')}
          </h2>
          <p className="mt-2 text-sm text-rose-700">
            {isValidationError ? validationError : t('security.accessDeniedDesc')}
          </p>
          <button
            onClick={() => {
              setValidationError(null);
              if (role === 'super_admin') {
                handleBackToAdmin();
              } else {
                resetProjectState();
                setRoute('main');
              }
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            <FolderKanban className="h-4 w-4" />
            {t('security.backToProjects')}
          </button>
        </div>
      </div>
    );
  }

  if (validatingAccess && activeProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">A validar acesso ao projeto...</p>
        </div>
      </div>
    );
  }

  if (route === 'project' && !activeProject && !loadingProjects && projects.length === 0 && !serverActiveProject && routeReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FolderKanban className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Nenhum projeto ativo atribuído</h2>
          <p className="mt-2 text-sm text-slate-500">
            Não existe um projeto ativo associado ao seu utilizador. Peça ao administrador para atribuir um projeto na Supabase.
          </p>
          <button
            onClick={handleBackToAdmin}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: TLM_PRIMARY }}
          >
            <FolderKanban className="h-4 w-4" />
            Ver projetos disponíveis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">
      <Sidebar
        collections={visibleCollections}
        activeCollectionName={activeCollection?.name ?? null}
        onSelect={handleSelectCollection}
        search={search}
        onSearchChange={setSearch}
        loading={loadingCollections}
        user={sidebarUser}
        onLogout={() => { logout(); resetProjectState(); setRoute('main'); }}
        projects={projects}
        activeProject={activeProject}
        onProjectSelect={handleProjectSelect}
        view={view}
        onViewChange={setView}
        isOlikanassa={!tablePrefix}
        showTableBuilder={showTableBuilder}
        isSuperAdmin={role === 'super_admin'}
        tablePrefix={tablePrefix}
        onBackToAdmin={handleBackToAdmin}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            aria-label={t('sidebar.openMenu')}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: TLM_PRIMARY }}>
              <Database className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-900">{t('sidebar.appName')}</span>
          </div>
          <LanguageSelector compact />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
        <ErrorBoundary onRetry={handleRetry}>
          {!activeProject && !loadingProjects && projects.length > 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <FolderKanban className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">{t('admin.selectProjectPrompt')}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {t('admin.selectProjectDesc')}
                </p>
              </div>
            </div>
          ) : loadingProjects && !activeProject ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                <p className="text-sm text-slate-500">{t('table.loading')}</p>
              </div>
            </div>
          ) : collectionsError ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-lg font-semibold text-rose-900">Erro ao carregar tabelas</h3>
                <p className="mt-2 text-sm text-rose-700">{collectionsError}</p>
                <button
                  onClick={handleRetry}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : view === 'builder' && showTableBuilder ? (
            <TableBuilder
              collections={visibleCollections}
              onTableCreated={handleTableCreated}
              onTableDeleted={handleTableDeleted}
            />
          ) : view === 'reports' ? (
            <ReportCenter collections={visibleCollections} />
          ) : view === 'dashboard' ? (
            <AnalyticsDashboard collections={visibleCollections} />
          ) : loadingCollections && !activeCollection ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                <p className="text-sm text-slate-500">A carregar tabelas...</p>
              </div>
            </div>
          ) : activeCollection ? (
            <CollectionViewer key={activeCollection.name} collection={activeCollection} />
          ) : !loadingCollections && collections.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Database className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">{t('sidebar.noTableFound')}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {showTableBuilder
                    ? t('sidebar.tableConfig')
                    : t('sidebar.noTableFound')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">{t('sidebar.searchTables')}</p>
              </div>
            </div>
          )}
        </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
