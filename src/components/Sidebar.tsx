import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Database, Search, Table2, LogOut, ShieldCheck, Eye, Pencil, ChevronDown, BarChart3, Settings, ArrowLeft, Crown, PanelLeftClose, PanelLeftOpen, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { NocoBaseCollection } from '@/types/nocodb';
import type { AppRole } from '@/contexts/AuthContext';
import type { Project } from '@/contexts/ProjectContext';
import { useBranding } from '@/hooks/useBranding';
import { useVisibility } from '@/hooks/useVisibility';
import { CATEGORIES, getDisplayName, isCategorized } from '@/config/projectConfig';
import { TLM_PRIMARY, TLM_SECONDARY } from '@/config/theme';
import ProjectSwitcher from '@/components/ProjectSwitcher';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/hooks/useLanguage';

export type SidebarView = 'dashboard' | 'table' | 'builder' | 'reports';

const COLLAPSE_KEY = 'mcl-sidebar-collapsed';

interface SidebarProps {
  collections: NocoBaseCollection[];
  activeCollectionName: string | null;
  onSelect: (collection: NocoBaseCollection) => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  user: { name: string; email: string; role: AppRole } | null;
  onLogout: () => void;
  projects: Project[];
  activeProject: Project | null;
  onProjectSelect: (project: Project) => void;
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isOlikanassa: boolean;
  showTableBuilder: boolean;
  isSuperAdmin: boolean;
  tablePrefix: string;
  onBackToAdmin: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  collections,
  activeCollectionName,
  onSelect,
  search,
  onSearchChange,
  loading,
  user,
  onLogout,
  projects,
  activeProject,
  onProjectSelect,
  view,
  onViewChange,
  isOlikanassa,
  showTableBuilder,
  isSuperAdmin,
  tablePrefix,
  onBackToAdmin,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const { branding } = useBranding();
  const { collectionVisible, setActiveRole } = useVisibility();
  const { t } = useLanguage();

  // Sync the visibility context's active role to the current user's role
  // so that role-specific visibility settings are applied in the sidebar.
  useEffect(() => {
    setActiveRole(user?.role ?? null);
  }, [user?.role, setActiveRole]);

  // Dynamic prefix-based filtering:
  // - super_admin / admin: see ALL collections (no prefix filter)
  // - regular users: see only collections whose name starts with the project's table_prefix
  // - if no table_prefix and not admin: show no operational tables (fallback warning)
  const isAdminRole = user?.role === 'super_admin' || user?.role === 'admin';
  const hasPrefix = !!tablePrefix;

  const prefixFilteredCollections = useMemo(() => {
    if (isAdminRole) return collections ?? [];
    if (!hasPrefix) return [];
    return (collections ?? []).filter((c) => c.name.startsWith(tablePrefix));
  }, [collections, isAdminRole, hasPrefix, tablePrefix]);

  const visibleCollections = prefixFilteredCollections.filter((c) => collectionVisible(c.name));
  const showNoPrefixWarning = !isAdminRole && !hasPrefix;

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // storage unavailable — keep in-memory state
    }
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const toggleCategory = (id: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectionMap = new Map(visibleCollections.map((c) => [c.name, c]));

  const uncategorizedCollections = visibleCollections.filter((c) => !isCategorized(c.name));

  // For admin users with no prefix, show categorized view using all collections.
  // For regular users, only prefix-matched collections are in visibleCollections.
  const useCategorizedView = isAdminRole || isOlikanassa;

  const filterBySearch = (list: NocoBaseCollection[]) =>
    list.filter((c) => collectionDisplayTitle(c).toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (collection: NocoBaseCollection) => {
    onViewChange('table');
    onSelect(collection);
    onMobileClose();
  };

  const sidebarContent = (
    <>
      {/* Header / Logo */}
      <div className={`flex items-center border-b border-slate-200 ${collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-5 py-4'}`}>
        {branding.logo ? (
          <img
            src={branding.logo}
            alt="Logótipo"
            className="h-9 w-9 shrink-0 rounded-xl object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${TLM_PRIMARY}, ${TLM_SECONDARY})` }}>
            <Database className="h-5 w-5" />
          </div>
        )}
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold text-slate-900">{t('sidebar.appName')}</h1>
              <p className="truncate text-xs text-slate-400">{t('sidebar.appSubtitle')}</p>
            </div>
            <LanguageSelector />
          </div>
        )}
      </div>

      {/* Back to admin */}
      {isSuperAdmin && (
        <div className={collapsed ? 'px-2 pt-3' : 'px-4 pt-3'}>
          <button
            onClick={onBackToAdmin}
            title={collapsed ? t('sidebar.backToAdmin') : undefined}
            className={`flex w-full items-center rounded-lg text-sm font-semibold text-white shadow-sm transition hover:opacity-90 ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-2 px-3 py-2.5'
            }`}
            style={{ background: TLM_PRIMARY }}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t('sidebar.backToAdmin')}</span>}
          </button>
        </div>
      )}

      {/* Project switcher */}
      <div className={collapsed ? 'px-2 py-3' : 'px-4 py-3'}>
        {collapsed ? (
          <div className="flex justify-center" title={activeProject?.nome ?? t('sidebar.selectProject')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <span className="text-xs font-bold">{activeProject?.nome?.charAt(0).toUpperCase() ?? '?'}</span>
            </div>
          </div>
        ) : (
          <ProjectSwitcher
            projects={projects}
            activeProject={activeProject}
            onSelect={onProjectSelect}
          />
        )}
      </div>

      {/* View navigation buttons */}
      <div className={`space-y-1 ${collapsed ? 'px-2' : 'px-4'} pb-2`}>
        <NavButton
          collapsed={collapsed}
          active={view === 'dashboard'}
          onClick={() => { onViewChange('dashboard'); onMobileClose(); }}
          icon={<BarChart3 className={`h-4 w-4 shrink-0 ${view === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />}
          label={t('sidebar.dashboard')}
        />
        {showTableBuilder && (
          <NavButton
            collapsed={collapsed}
            active={view === 'builder'}
            onClick={() => { onViewChange('builder'); onMobileClose(); }}
            icon={<Settings className={`h-4 w-4 shrink-0 ${view === 'builder' ? 'text-white' : 'text-slate-400'}`} />}
            label={t('sidebar.tableConfig')}
          />
        )}
        <NavButton
          collapsed={collapsed}
          active={view === 'reports'}
          onClick={() => { onViewChange('reports'); onMobileClose(); }}
          icon={<FileSpreadsheet className={`h-4 w-4 shrink-0 ${view === 'reports' ? 'text-white' : 'text-slate-400'}`} />}
          label={t('sidebar.reports')}
        />
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('sidebar.searchTables')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            />
          </div>
        </div>
      )}

      {/* Collections nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                {!collapsed && <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" />}
              </div>
            ))}
          </div>
        ) : showNoPrefixWarning ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">{t('sidebar.noProjectAssigned')}</p>
            <p className="text-xs text-slate-400">{t('sidebar.contactAdmin')}</p>
          </div>
        ) : collapsed ? (
          /* Collapsed: icon-only list */
          <div className="space-y-0.5">
            {filterBySearch(visibleCollections).map((collection) => (
              <CollapsedCollectionButton
                key={collection.key}
                collection={collection}
                active={view === 'table' && collection.name === activeCollectionName}
                onClick={() => handleSelect(collection)}
              />
            ))}
          </div>
        ) : (
          <>
            {useCategorizedView ? (
              CATEGORIES.map((category) => {
              const catCollections = filterBySearch(
                category.collections
                  .map((name) => collectionMap.get(name))
                  .filter((c): c is NocoBaseCollection => c !== undefined)
              );
              if (catCollections.length === 0 && search) return null;

              const catCollapsed = collapsedCategories.has(category.id);
              const Icon = category.icon;

              return (
                <div key={category.id} className="mb-1">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {category.label}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition ${catCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  {!catCollapsed && (
                    <div className="space-y-0.5">
                      {catCollections.length === 0 ? (
                        <p className="px-3 py-1.5 text-xs text-slate-300">{t('sidebar.noTables')}</p>
                      ) : (
                        catCollections.map((collection) => (
                          <CollectionButton
                            key={collection.key}
                            collection={collection}
                            active={view === 'table' && collection.name === activeCollectionName}
                            onClick={() => handleSelect(collection)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
            ) : (
              uncategorizedCollections.length > 0 || visibleCollections.length > 0 ? (
                <div className="mb-1">
                  <button
                    onClick={() => toggleCategory('project_tables')}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Table2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {t('sidebar.projectTables')}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition ${collapsedCategories.has('project_tables') ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedCategories.has('project_tables') && (
                    <div className="space-y-0.5">
                      {filterBySearch(visibleCollections).length === 0 ? (
                        <p className="px-3 py-1.5 text-xs text-slate-300">{t('sidebar.noTables')}</p>
                      ) : (
                        filterBySearch(visibleCollections).map((collection) => (
                          <CollectionButton
                            key={collection.key}
                            collection={collection}
                            active={view === 'table' && collection.name === activeCollectionName}
                            onClick={() => handleSelect(collection)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : null
            )}

            {useCategorizedView && uncategorizedCollections.length > 0 && (
              <div className="mb-1">
                <button
                  onClick={() => toggleCategory('other')}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('sidebar.otherTables')}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-300 transition ${collapsedCategories.has('other') ? '-rotate-90' : ''}`} />
                </button>
                {!collapsedCategories.has('other') && (
                  <div className="space-y-0.5">
                    {filterBySearch(uncategorizedCollections).map((collection) => (
                      <CollectionButton
                        key={collection.key}
                        collection={collection}
                        active={view === 'table' && collection.name === activeCollectionName}
                        onClick={() => handleSelect(collection)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {visibleCollections.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-400">{t('sidebar.noTableFound')}</p>
            )}
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className={`border-t border-slate-200 ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: TLM_PRIMARY }}
              title={collapsed ? user.name : undefined}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{user.name}</p>
                <div className="flex items-center gap-1">
                  {user.role === 'super_admin' && <Crown className="h-3 w-3 text-amber-500" />}
                  {user.role === 'admin' && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
                  {user.role === 'editor' && <Pencil className="h-3 w-3 text-sky-500" />}
                  {user.role === 'leitor' && <Eye className="h-3 w-3 text-slate-400" />}
                  <span className="text-xs capitalize text-slate-400">{user.role === 'super_admin' ? t('sidebar.role.superAdmin') : t(`sidebar.role.${user.role}` as const)}</span>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              title={t('sidebar.logout')}
              className={`rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 ${collapsed ? 'mt-1' : ''}`}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar (lg and up) */}
      <aside
        className={`relative hidden h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 lg:flex ${
          collapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Toggle button — floats on the divider */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
          aria-label={collapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
          className="absolute -right-3 top-20 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
        {sidebarContent}
      </aside>

      {/* Mobile drawer (below lg) */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onMobileClose}
      />
      {/* Drawer panel */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onMobileClose}
          aria-label={t('sidebar.closeMenu')}
          className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}

function NavButton({
  collapsed,
  active,
  onClick,
  icon,
  label,
}: {
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center rounded-lg text-left text-sm transition ${
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
      } ${
        active
          ? 'text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
      style={active ? { background: TLM_PRIMARY } : undefined}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );
}

function CollectionButton({
  collection,
  active,
  onClick,
}: {
  collection: NocoBaseCollection;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? 'text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
      style={active ? { background: TLM_PRIMARY } : undefined}
    >
      <Table2 className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className="truncate font-medium">{collectionDisplayTitle(collection)}</span>
    </button>
  );
}

function CollapsedCollectionButton({
  collection,
  active,
  onClick,
}: {
  collection: NocoBaseCollection;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collectionDisplayTitle(collection)}
      className={`flex w-full items-center justify-center rounded-lg py-2.5 text-sm transition ${
        active
          ? 'text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
      style={active ? { background: TLM_PRIMARY } : undefined}
    >
      <Table2 className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
    </button>
  );
}

export function collectionDisplayTitle(c: NocoBaseCollection): string {
  const custom = getDisplayName(c.name);
  if (custom) return custom;
  if (c.title) {
    return c.title.replace(/\{\{t\(["'](.+?)["']\)\}\}/g, (_, s) => s);
  }
  return c.name;
}

export function displayTitle(c: NocoBaseCollection): string {
  return collectionDisplayTitle(c);
}
