import type {
  NocoBaseCollection,
  NocoBaseField,
  NocoBaseListResponse,
  NocoBaseRecordList,
} from '@/types/nocodb';
import { isGlobalTable } from '@/config/projectConfig';

const NOCOBASE_URL = import.meta.env.VITE_NOCODB_URL as string | undefined;
const NOCOBASE_TOKEN = import.meta.env.VITE_NOCODB_TOKEN as string | undefined;

export class NocoDBError extends Error {
  status: number;
  isCors: boolean;
  constructor(message: string, status = 0, isCors = false) {
    super(message);
    this.name = 'NocoDBError';
    this.status = status;
    this.isCors = isCors;
  }
}

function isConfigured(): boolean {
  return Boolean(NOCOBASE_TOKEN);
}

function getConfigStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!NOCOBASE_TOKEN) missing.push('VITE_NOCODB_TOKEN');
  return { configured: missing.length === 0, missing };
}

function authHeaders(userToken?: string | null): Record<string, string> {
  return {
    Authorization: `Bearer ${userToken ?? NOCOBASE_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  token?: string | null;
}

async function request<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers: authHeaders(opts.token),
    signal: opts.signal,
  };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
  }

  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NocoDBError(
      'Não foi possível conectar ao servidor. Verifique a URL, a ligação de rede e as definições de CORS.',
      0,
      true,
    );
  }

  if (!resp.ok) {
    let detail = '';
    try {
      const body = await resp.json();
      detail = body?.message || body?.msg || body?.error || JSON.stringify(body);
    } catch {
      try {
        detail = await resp.text();
      } catch {
        detail = '';
      }
    }
    throw new NocoDBError(
      `Erro ${resp.status} ao contactar o servidor${detail ? `: ${detail}` : ''}`,
      resp.status,
    );
  }

  if (resp.status === 204) return undefined as T;
  try {
    return (await resp.json()) as T;
  } catch {
    return undefined as T;
  }
}

function cleanUrl(): string {
  // Always use relative /api paths. In dev, the Vite proxy forwards to NocoBase.
  // In production (Vercel), vercel.json rewrites /api/* to the NocoBase server.
  // This avoids CORS issues in both environments.
  return '';
}

export async function fetchCollections(signal?: AbortSignal): Promise<NocoBaseCollection[]> {
  if (!isConfigured()) {
    const { missing } = getConfigStatus();
    throw new NocoDBError(
      `Configuração incompleta. Variáveis em falta no .env: ${missing.join(', ')}. Copie .env.example para .env e preencha os valores.`,
    );
  }
  const all: NocoBaseCollection[] = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const url = `${cleanUrl()}/api/collections:list?pageSize=${pageSize}&page=${page}`;
    const data = await request<NocoBaseListResponse<NocoBaseCollection>>(url, { signal });
    all.push(...data.data);
    if (page >= data.meta.totalPage) break;
    page++;
  }
  return all.filter((c) => !c.hidden && c.template !== 'sql');
}

export async function fetchCollectionsByPrefix(prefix: string, signal?: AbortSignal): Promise<NocoBaseCollection[]> {
  if (!isConfigured()) {
    const { missing } = getConfigStatus();
    throw new NocoDBError(
      `Configuração incompleta. Variáveis em falta no .env: ${missing.join(', ')}.`,
    );
  }
  const filter = { name: { $startsWith: prefix } };
  const search = new URLSearchParams({
    pageSize: '100',
    page: '1',
    filter: JSON.stringify(filter),
  });
  const url = `${cleanUrl()}/api/collections:list?${search.toString()}`;
  const data = await request<NocoBaseListResponse<NocoBaseCollection>>(url, { signal });
  return (data.data ?? []).filter((c) => !c.hidden && c.template !== 'sql');
}

export async function fetchOlikanassaCollections(signal?: AbortSignal): Promise<NocoBaseCollection[]> {
  const all = await fetchCollections(signal);
  const olikanassaNames = new Set<string>([
    'projetos', 'usuarios_projetos', 'goals', 'liderancas', 'screenings',
    'members', 'groups', 'Outcomes1', 'Project_Objectives', 'Outputs',
    'Indicator_Catalog', 'indicator_measurements', 'districts', 'villages', 'health_posts',
    'health_workers', 'food_security_support', 'activity_attendance', 'group_activities',
    'training_courses', 'health_training_attendees', 'livelihood_training_attendees',
    'communication_campaigns', 'safeguarding_events', 'climate_actions',
    'despesas', 'diario_de_bordo', 'tarefas', 'report_settings',
    'pspark_casos_de_lepra', 'conexao_sync', 'monthly_screening',
  ]);
  return all.filter((c) => olikanassaNames.has(c.name));
}

export async function fetchCollectionsForProject(
  prefixes: string[],
  opts: { includeMaster?: boolean; signal?: AbortSignal } = {},
): Promise<NocoBaseCollection[]> {
  const { includeMaster = false, signal } = opts;

  if (prefixes.length === 0) {
    return fetchOlikanassaCollections(signal);
  }

  const results: NocoBaseCollection[] = [];
  for (const prefix of prefixes) {
    try {
      const cols = await fetchCollectionsByPrefix(prefix, signal);
      results.push(...cols);
    } catch {
      // prefix may not match any collections — skip
    }
  }

  // Always include global/shared tables (projetos, usuarios_projetos, branding, etc.)
  try {
    const all = await fetchCollections(signal);
    const existing = new Set(results.map((c) => c.name));
    for (const c of all) {
      if (!existing.has(c.name) && isGlobalTable(c.name)) {
        results.push(c);
      }
    }
  } catch {
    // ignore — return what we have
  }

  // For super_admin / admin: also include all other project tables for management
  if (includeMaster) {
    try {
      const all = await fetchCollections(signal);
      const existing = new Set(results.map((c) => c.name));
      for (const c of all) {
        if (!existing.has(c.name)) {
          results.push(c);
        }
      }
    } catch {
      // ignore — return what we have
    }
  }

  return results;
}

export async function createCollection(
  tableName: string,
  title: string,
  signal?: AbortSignal,
): Promise<NocoBaseCollection> {
  const url = `${cleanUrl()}/api/collections:create`;
  const result = await request<{ data: NocoBaseCollection }>(url, {
    method: 'POST',
    body: { name: tableName, title, inherits: false },
    signal,
  });
  return result.data;
}

export async function createField(
  collectionName: string,
  field: { name: string; interface: string; type: string; uiSchema?: Record<string, unknown> },
  signal?: AbortSignal,
): Promise<void> {
  const url = `${cleanUrl()}/api/collections/${collectionName}/fields:create`;
  await request(url, { method: 'POST', body: field, signal });
}

export async function deleteCollection(collectionName: string, signal?: AbortSignal): Promise<void> {
  const url = `${cleanUrl()}/api/collections:destroy?filterByTk=${encodeURIComponent(collectionName)}`;
  await request(url, { method: 'DELETE', signal });
}

export async function fetchFields(
  collectionName: string,
  signal?: AbortSignal,
): Promise<NocoBaseField[]> {
  const url = `${cleanUrl()}/api/collections/${collectionName}/fields:list`;
  const data = await request<{ data: NocoBaseField[] }>(url, { signal });
  return data.data ?? [];
}

export async function fetchRecords(
  collectionName: string,
  params: {
    page: number;
    pageSize: number;
    appends?: string[];
    filter?: Record<string, unknown>;
    signal?: AbortSignal;
  },
): Promise<NocoBaseRecordList> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.appends && params.appends.length > 0) {
    search.set('appends', params.appends.join(','));
  }
  if (params.filter && Object.keys(params.filter).length > 0) {
    search.set('filter', JSON.stringify(params.filter));
  }
  const url = `${cleanUrl()}/api/${collectionName}:list?${search.toString()}`;
  return request<NocoBaseRecordList>(url, { signal: params.signal });
}

export async function createRecord(
  collectionName: string,
  values: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const url = `${cleanUrl()}/api/${collectionName}:create`;
  const result = await request<{ data: Record<string, unknown> }>(url, {
    method: 'POST',
    body: values,
    signal,
  });
  return result.data ?? {};
}

export async function updateRecord(
  collectionName: string,
  recordId: string | number,
  values: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const url = `${cleanUrl()}/api/${collectionName}:update?filterByTk=${encodeURIComponent(String(recordId))}`;
  const result = await request<{ data: unknown }>(url, {
    method: 'PATCH',
    body: values,
    signal,
  });
  return (Array.isArray(result.data) ? result.data[0] : result.data) as Record<string, unknown>;
}

export async function deleteRecord(
  collectionName: string,
  recordId: string | number,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${cleanUrl()}/api/${collectionName}:destroy?filterByTk=${encodeURIComponent(String(recordId))}`;
  await request<unknown>(url, { method: 'DELETE', signal });
}

export interface NocoBaseRole {
  name: string;
  title: string | null;
  hidden?: boolean;
}

export interface NocoBaseUser {
  id: string | number;
  email: string;
  nickname: string | null;
  username: string | null;
  roles: NocoBaseRole[];
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: NocoBaseUser; token: string }> {
  const url = `${cleanUrl()}/api/auth:signIn`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new NocoDBError(
      'Não foi possível conectar ao servidor NocoBase. Verifique a URL e a ligação de rede.',
      0,
      true,
    );
  }
  if (!resp.ok) {
    let detail = '';
    try {
      const body = await resp.json();
      detail = body?.errors?.[0]?.message || body?.message || JSON.stringify(body);
    } catch {
      try { detail = await resp.text(); } catch { detail = ''; }
    }
    throw new NocoDBError(
      `Erro da API do NocoBase (${resp.status}): ${detail || 'Email ou palavra-passe incorretos.'}`,
      resp.status,
    );
  }
  const data = await resp.json();
  const token: string = data.data.token;
  const userId: string | number = data.data.user.id;

  // NocoBase signIn response does not include roles. Try multiple strategies:
  // 1. auth:check with the user's own token (works for most users)
  // 2. Direct user lookup with the user's token
  // 3. Direct user lookup with the admin token
  let roles: NocoBaseRole[] = [];
  try {
    const checked = await checkAuth(token);
    roles = checked.roles;
  } catch {
    // auth:check failed — try direct user lookup below
  }
  if (roles.length === 0) {
    try {
      roles = await fetchUserRoles(userId, token);
    } catch {
      // user token may lack permission — try admin token below
    }
  }
  if (roles.length === 0 && NOCOBASE_TOKEN) {
    try {
      roles = await fetchUserRoles(userId, NOCOBASE_TOKEN);
    } catch {
      // admin token also failed — proceed with empty
    }
  }

  // Also pull the project-level role from usuarios_projetos so we can map
  // admin_projeto / editor_projeto / leitor_projeto.
  try {
    const projectRole = await fetchProjectRole(userId);
    if (projectRole && !roles.some((r) => r.name === projectRole.name)) {
      roles = [...roles, projectRole];
    }
  } catch {
    // table may not exist or be empty — ignore
  }

  const user: NocoBaseUser = {
    id: userId,
    email: data.data.user.email,
    nickname: data.data.user.nickname,
    username: data.data.user.username,
    roles,
  };
  return { user, token };
}

async function fetchUserRoles(
  userId: string | number,
  token: string,
): Promise<NocoBaseRole[]> {
  const url = `${cleanUrl()}/api/users/${encodeURIComponent(String(userId))}?appends=roles`;
  const resp = await fetch(url, { headers: authHeaders(token) });
  if (!resp.ok) throw new NocoDBError(`Erro ao obter roles (${resp.status})`, resp.status);
  const data = await resp.json();
  const userRoles = data.data?.roles ?? [];
  return userRoles.map((r: Record<string, unknown>) => ({
    name: r.name as string,
    title: r.title as string | null,
  }));
}

async function fetchProjectRole(userId: string | number): Promise<NocoBaseRole | null> {
  // Try filtering by multiple possible field names for the user foreign key
  const filter = {
    $or: [
      { usuario_fkey: userId },
      { user_id: userId },
      { usuario_id: userId },
    ],
  };
  let data;
  try {
    data = await fetchRecords('usuarios_projetos', {
      page: 1,
      pageSize: 1,
      filter,
    });
  } catch {
    // If the $or filter fails, try without filter and search client-side
    data = await fetchRecords('usuarios_projetos', { page: 1, pageSize: 100 });
  }
  const rows = data.data ?? [];
  const row = rows.find((r) =>
    r.usuario_fkey === userId || r.user_id === userId || r.usuario_id === userId
  ) ?? rows[0];
  if (!row) return null;
  // Try multiple possible field names for the role column
  const roleName = (row.role_no_projeto ?? row.role ?? row.tipo_role ?? row.role_projeto) as string | null;
  if (!roleName) return null;
  return { name: roleName, title: null };
}

export async function checkAuth(token: string): Promise<NocoBaseUser> {
  const url = `${cleanUrl()}/api/auth:check`;
  const resp = await fetch(url, { headers: authHeaders(token) });
  if (!resp.ok) throw new NocoDBError('Sessão expirada.', resp.status);
  const data = await resp.json();
  const userId: string | number = data.data.id;

  // auth:check returns roles for admin users but not always for non-admin ones,
  // so fetch them explicitly with a fallback to the admin token.
  let roles: NocoBaseRole[] = (data.data.roles ?? []).map((r: Record<string, unknown>) => ({
    name: r.name as string,
    title: r.title as string | null,
  }));

  if (roles.length === 0) {
    try {
      roles = await fetchUserRoles(userId, token);
    } catch {
      // ignore
    }
  }
  if (roles.length === 0 && NOCOBASE_TOKEN) {
    try {
      roles = await fetchUserRoles(userId, NOCOBASE_TOKEN);
    } catch {
      // ignore
    }
  }

  try {
    const projectRole = await fetchProjectRole(userId);
    if (projectRole && !roles.some((r) => r.name === projectRole.name)) {
      roles = [...roles, projectRole];
    }
  } catch {
    // ignore
  }

  return {
    id: userId,
    email: data.data.email,
    nickname: data.data.nickname,
    username: data.data.username,
    roles,
  };
}

export async function fetchUsers(signal?: AbortSignal): Promise<NocoBaseUser[]> {
  const url = `${cleanUrl()}/api/users:list?pageSize=100&page=1&appends=roles`;
  const data = await request<NocoBaseListResponse<NocoBaseUser>>(url, { signal });
  return (data.data ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    username: u.username,
    roles: u.roles ?? [],
  }));
}

export interface NocoBaseUserWithProject {
  id: string | number;
  nickname: string | null;
  email: string;
  roles: string | null;
  active_project_id: string | number | null;
  active_project: { id: string | number; nome: string } | null;
}

export async function fetchUsersWithProjects(signal?: AbortSignal): Promise<NocoBaseUserWithProject[]> {
  const fields = 'id,nickname,email,roles,active_project_id';
  const url = `${cleanUrl()}/api/users?fields=${encodeURIComponent(fields)}&appends=${encodeURIComponent('active_project')}&pageSize=200&page=1`;
  const data = await request<NocoBaseListResponse<Record<string, unknown>>>(url, { signal });
  return (data.data ?? []).map((row) => {
    const proj = row.active_project as Record<string, unknown> | undefined;
    return {
      id: row.id as string | number,
      nickname: (row.nickname as string | null) ?? null,
      email: (row.email as string) ?? '',
      roles: (row.roles as string | null) ?? null,
      active_project_id: (row.active_project_id as string | number | null) ?? null,
      active_project: proj && typeof proj === 'object'
        ? { id: proj.id as string | number, nome: (proj.nome as string) ?? 'Projeto' }
        : null,
    };
  });
}

export async function fetchRoles(signal?: AbortSignal): Promise<NocoBaseRole[]> {
  const url = `${cleanUrl()}/api/roles:list?pageSize=100&page=1`;
  const data = await request<NocoBaseListResponse<NocoBaseRole>>(url, { signal });
  return (data.data ?? []).filter((r) => !r.hidden);
}

export async function setUserRole(
  userId: string | number,
  roleName: string,
  token?: string | null,
): Promise<void> {
  const url = `${cleanUrl()}/api/users/${encodeURIComponent(String(userId))}/roles:set`;
  await request(url, { method: 'POST', body: { roleName }, token, });
}

export interface NocoBaseRolePermission {
  role_name: string;
  resources: Record<string, {
    actions: string[];
    scope?: string;
  }>;
}

export async function fetchRolePermissions(
  roleName?: string,
  signal?: AbortSignal,
): Promise<NocoBaseRolePermission[]> {
  const search = new URLSearchParams({ pageSize: '100', page: '1' });
  if (roleName) search.set('filter', JSON.stringify({ role_name: roleName }));
  const url = `${cleanUrl()}/api/rolePermissions:list?${search.toString()}`;
  const data = await request<NocoBaseListResponse<NocoBaseRolePermission>>(url, { signal });
  return data.data ?? [];
}

export async function fetchRoleWithPermissions(
  roleName: string,
  signal?: AbortSignal,
): Promise<NocoBaseRole & { permissions?: NocoBaseRolePermission }> {
  const search = new URLSearchParams({ pageSize: '1', page: '1', filter: JSON.stringify({ name: roleName }) });
  const url = `${cleanUrl()}/api/roles:list?${search.toString()}`;
  const data = await request<NocoBaseListResponse<NocoBaseRole>>(url, { signal });
  const role = (data.data ?? [])[0];
  if (!role) throw new NocoDBError(`Role "${roleName}" not found.`, 404);
  let permissions: NocoBaseRolePermission | undefined;
  try {
    const perms = await fetchRolePermissions(roleName, signal);
    permissions = perms[0];
  } catch { /* non-critical */ }
  return { ...role, permissions };
}

export interface NocoBaseAttachment {
  id: string | number;
  url: string;
  filename: string | null;
  mimetype: string | null;
  size: number | null;
}

export interface BrandingRecord {
  id: string | number;
  logo: NocoBaseAttachment[] | null;
  login_title: string;
  login_subtitle: string;
  login_button_text: string;
}

export async function fetchBrandingSettings(signal?: AbortSignal): Promise<BrandingRecord | null> {
  if (!isConfigured()) return null;
  try {
    const url = `${cleanUrl()}/api/branding_settings:list?pageSize=1&page=1&appends=logo`;
    const data = await request<NocoBaseRecordList>(url, { signal });
    const row = data.data?.[0];
    if (!row) return null;
    return {
      id: row.id as string | number,
      logo: (row.logo as NocoBaseAttachment[] | null) ?? null,
      login_title: (row.login_title as string) ?? '',
      login_subtitle: (row.login_subtitle as string) ?? '',
      login_button_text: (row.login_button_text as string) ?? '',
    };
  } catch {
    return null;
  }
}

export async function uploadAttachment(file: File, signal?: AbortSignal): Promise<NocoBaseAttachment> {
  if (!isConfigured()) throw new NocoDBError('NocoBase não configurado.', 0);
  const formData = new FormData();
  formData.append('file', file);
  const url = `${cleanUrl()}/api/attachments:create`;
  const init: RequestInit = {
    method: 'POST',
    headers: { Authorization: `Bearer ${NOCOBASE_TOKEN}` },
    body: formData,
    signal,
  };
  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new NocoDBError('Não foi possível enviar o ficheiro. Verifique a ligação.', 0, true);
  }
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json())?.message ?? ''; } catch { try { detail = await resp.text(); } catch { detail = ''; } }
    throw new NocoDBError(`Erro ao enviar ficheiro${detail ? `: ${detail}` : ''}`, resp.status);
  }
  const data = await resp.json();
  return data.data as NocoBaseAttachment;
}

export async function saveBrandingSettings(
  values: { logo: NocoBaseAttachment[] | null; login_title: string; login_subtitle: string; login_button_text: string },
  signal?: AbortSignal,
): Promise<void> {
  if (!isConfigured()) throw new NocoDBError('NocoBase não configurado.', 0);
  const existing = await fetchBrandingSettings(signal);
  if (existing) {
    const updateUrl = `${cleanUrl()}/api/branding_settings:update?filterByTk=${encodeURIComponent(String(existing.id))}`;
    await request(updateUrl, { method: 'PATCH', body: values, signal });
  } else {
    await createRecord('branding_settings', values, signal);
  }
}

export async function resetBrandingSettings(signal?: AbortSignal): Promise<void> {
  if (!isConfigured()) return;
  try {
    const existing = await fetchBrandingSettings(signal);
    if (!existing) return;
    const url = `${cleanUrl()}/api/branding_settings:update?filterByTk=${encodeURIComponent(String(existing.id))}`;
    await request(url, {
      method: 'PATCH',
      body: { logo: null, login_title: '', login_subtitle: '', login_button_text: '' },
      signal,
    });
  } catch {
    // ignore — reset is best-effort
  }
}

export interface VisibilitySettingRow {
  id?: string | number;
  collection_name: string;
  field_name: string | null;
  visible: boolean;
}

export async function fetchVisibilitySettings(signal?: AbortSignal): Promise<VisibilitySettingRow[]> {
  if (!isConfigured()) return [];
  try {
    const data = await fetchRecords('visibility_settings', {
      page: 1,
      pageSize: 500,
      signal,
    });
    return (data.data ?? []).map((r) => ({
      id: r.id as string | number,
      collection_name: r.collection_name as string,
      field_name: (r.field_name as string | null) ?? null,
      visible: r.visible as boolean,
    }));
  } catch {
    return [];
  }
}

export async function upsertVisibilitySetting(
  collectionName: string,
  fieldName: string | null,
  visible: boolean,
  signal?: AbortSignal,
): Promise<void> {
  if (!isConfigured()) return;
  const filter = {
    collection_name: collectionName,
    field_name: fieldName,
  };
  const existing = await fetchRecords('visibility_settings', {
    page: 1,
    pageSize: 1,
    filter,
    signal,
  });
  const row = existing.data?.[0];
  if (row) {
    const updateUrl = `${cleanUrl()}/api/visibility_settings:update?filterByTk=${encodeURIComponent(String(row.id))}`;
    await request(updateUrl, { method: 'PATCH', body: { visible }, signal });
  } else {
    await createRecord('visibility_settings', {
      collection_name: collectionName,
      field_name: fieldName,
      visible,
    }, signal);
  }
}

export { isConfigured, getConfigStatus };

// ─── Per-project credential loading & access validation ──────────────────

export interface ProjectCredentials {
  baseId: string | null;
  apiToken: string | null;
  projectRole: string | null;
}

export async function fetchProjectCredentials(
  projectId: string | number,
  userToken?: string | null,
  signal?: AbortSignal,
): Promise<ProjectCredentials> {
  const search = new URLSearchParams({
    pageSize: '1',
    page: '1',
    filter: JSON.stringify({ id: projectId }),
  });
  const url = `${cleanUrl()}/api/projetos:list?${search.toString()}`;
  const data = await request<NocoBaseRecordList>(url, { signal, token: userToken });
  const row = data.data?.[0];
  if (!row) return { baseId: null, apiToken: null, projectRole: null };
  return {
    baseId: (row.base_id ?? row.baseId ?? row.project_id ?? row.nocoBaseId) as string | null ?? null,
    apiToken: (row.api_token ?? row.apiToken ?? row.token) as string | null ?? null,
    projectRole: null,
  };
}

export async function fetchUserWithProjects(
  userId: string | number,
  token?: string | null,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const url = `${cleanUrl()}/api/users/${encodeURIComponent(String(userId))}?appends=${encodeURIComponent('usuarios_projetos.projeto_id')}`;
  const data = await request<{ data: Record<string, unknown> }>(url, { token, signal });
  return data.data ?? null;
}

export async function validateProjectAccess(
  userId: string | number,
  projectId: string | number,
  signal?: AbortSignal,
): Promise<string | null> {
  const filter = {
    $and: [
      {
        $or: [
          { usuario_fkey: userId },
          { user_id: userId },
          { usuario_id: userId },
        ],
      },
      {
        $or: [
          { projeto_id: projectId },
          { project_id: projectId },
          { projeto_fkey: projectId },
        ],
      },
    ],
  };
  let data;
  try {
    data = await fetchRecords('usuarios_projetos', {
      page: 1,
      pageSize: 1,
      filter,
      signal,
    });
  } catch {
    data = await fetchRecords('usuarios_projetos', { page: 1, pageSize: 100, signal });
  }
  const rows = data.data ?? [];
  const row = rows.find((r) =>
    (r.usuario_fkey === userId || r.user_id === userId || r.usuario_id === userId) &&
    (r.projeto_id === projectId || r.project_id === projectId || r.projeto_fkey === projectId)
  ) ?? rows.find((r) =>
    r.usuario_fkey === userId || r.user_id === userId || r.usuario_id === userId
  );
  if (!row) return null;
  const role = (row.role_no_projeto ?? row.role ?? row.tipo_role ?? row.role_projeto) as string | null;
  return role;
}

export function canCreate(role: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === 'super_admin' || r === 'admin_projeto' || r === 'editor_projeto' || r === 'admin' || r === 'editor';
}

export function canEdit(role: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === 'super_admin' || r === 'admin_projeto' || r === 'editor_projeto' || r === 'admin' || r === 'editor';
}

export function canDelete(role: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === 'super_admin' || r === 'admin_projeto' || r === 'admin';
}

// ─── usuarios_projetos management ──────────────────────────────────────────

export interface UserProjectAssignment {
  id: string | number;
  userId: string | number;
  userEmail: string;
  userNickname: string | null;
  projectId: string | number;
  projectName: string;
  role: string | null;
}

export interface ProjectInfo {
  id: string | number;
  nome: string;
  status: string | null;
  table_prefix: string | null;
}

export async function fetchAllProjects(signal?: AbortSignal): Promise<ProjectInfo[]> {
  const data = await fetchRecords('projetos', { page: 1, pageSize: 200, signal });
  return (data.data ?? []).map((r) => ({
    id: r.id as string | number,
    nome: r.nome as string,
    status: (r.status as string | null) ?? null,
    table_prefix: (r.table_prefix as string | null) ?? null,
  }));
}

export async function fetchAllUserProjectAssignments(signal?: AbortSignal): Promise<UserProjectAssignment[]> {
  try {
    const data = await fetchRecords('usuarios_projetos', {
      page: 1,
      pageSize: 500,
      appends: ['usuario_fkey', 'projeto_id'],
      signal,
    });
    return (data.data ?? []).map((r) => {
      const user = r.usuario_fkey as Record<string, unknown> | undefined;
      const proj = r.projeto_id as Record<string, unknown> | undefined;
      return {
        id: r.id as string | number,
        userId: (user?.id ?? r.user_id ?? r.usuario_id) as string | number,
        userEmail: (user?.email as string) ?? '',
        userNickname: (user?.nickname as string | null) ?? null,
        projectId: (proj?.id ?? r.project_id ?? r.projeto_fkey) as string | number,
        projectName: (proj?.nome as string) ?? 'Projeto',
        role: (r.role_no_projeto ?? r.role ?? r.tipo_role ?? r.role_projeto) as string | null,
      };
    });
  } catch {
    // Fallback: fetch without appends
    const data = await fetchRecords('usuarios_projetos', { page: 1, pageSize: 500, signal });
    return (data.data ?? []).map((r) => ({
      id: r.id as string | number,
      userId: (r.usuario_fkey ?? r.user_id ?? r.usuario_id) as string | number,
      userEmail: '',
      userNickname: null,
      projectId: (r.projeto_id ?? r.project_id ?? r.projeto_fkey) as string | number,
      projectName: '',
      role: (r.role_no_projeto ?? r.role ?? r.tipo_role ?? r.role_projeto) as string | null,
    }));
  }
}

export async function createUserProjectAssignment(
  userId: string | number,
  projectId: string | number,
  role: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return createRecord('usuarios_projetos', {
    usuario_fkey: userId,
    projeto_id: projectId,
    role_no_projeto: role,
  }, signal);
}

export async function updateUserProjectAssignmentRole(
  assignmentId: string | number,
  role: string,
  signal?: AbortSignal,
): Promise<void> {
  await updateRecord('usuarios_projetos', assignmentId, { role_no_projeto: role }, signal);
}

export async function deleteUserProjectAssignment(
  assignmentId: string | number,
  signal?: AbortSignal,
): Promise<void> {
  await deleteRecord('usuarios_projetos', assignmentId, signal);
}

// ─── Project table visibility (stored in Supabase) ───────────────────────

export interface ProjectTableVisibilityRow {
  id?: string;
  project_id: string;
  collection_name: string;
  visible: boolean;
}

export async function fetchProjectTableVisibility(
  projectId: string | number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _signal?: AbortSignal,
): Promise<ProjectTableVisibilityRow[]> {
  const { supabase } = await import('@/services/supabase');
  const { data, error } = await supabase
    .from('project_table_visibility')
    .select('id, project_id, collection_name, visible')
    .eq('project_id', String(projectId));
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    collection_name: r.collection_name as string,
    visible: r.visible as boolean,
  }));
}

export async function upsertProjectTableVisibility(
  projectId: string | number,
  collectionName: string,
  visible: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _signal?: AbortSignal,
): Promise<void> {
  const { supabase } = await import('@/services/supabase');
  const { error } = await supabase
    .from('project_table_visibility')
    .upsert(
      { project_id: String(projectId), collection_name: collectionName, visible },
      { onConflict: 'project_id,collection_name' },
    );
  if (error) throw new NocoDBError(`Falha ao guardar visibilidade: ${error.message}`);
}

export async function fetchAllProjectTableVisibility(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _signal?: AbortSignal,
): Promise<ProjectTableVisibilityRow[]> {
  const { supabase } = await import('@/services/supabase');
  const { data, error } = await supabase
    .from('project_table_visibility')
    .select('id, project_id, collection_name, visible');
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    collection_name: r.collection_name as string,
    visible: r.visible as boolean,
  }));
}


