import { supabase } from '@/services/supabase';
import { isGlobalTable } from '@/config/projectConfig';
import type {
  TableCollection,
  FieldDef,
  RecordList,
} from '@/types/database';

export type { TableCollection, FieldDef, RecordList };

// ─── Error class ───────────────────────────────────────────────────────────

export class DatabaseError extends Error {
  status: number;
  isCors: boolean;
  constructor(message: string, status = 0, isCors = false) {
    super(message);
    this.name = 'DatabaseError';
    this.status = status;
    this.isCors = isCors;
  }
}

// ─── Config ────────────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return true;
}

function getConfigStatus(): { configured: boolean; missing: string[] } {
  return { configured: true, missing: [] };
}

// ─── Table registry: maps logical names to Supabase table names ────────────

const TABLE_MAP: Record<string, string> = {
  'projetos': 'projetos',
  'goals': 'ol_goals',
  'despesas': 'ol_despesas',
  'diario_de_bordo': 'ol_diario_de_bordo',
  'tarefas': 'ol_tarefas',
  'report_settings': 'ol_report_settings',
  'Outcomes1': 'ol_outcomes',
  'Project_Objectives': 'ol_project_objectives',
  'Outputs': 'ol_outputs',
  'Indicator_Catalog': 'ol_indicator_catalog',
  'indicator_measurements': 'ol_indicator_measurements',
  'screenings': 'ol_screenings',
  'pspark_casos_de_lepra': 'ol_pspark_casos_de_lepra',
  'members': 'ol_members',
  'liderancas': 'ol_liderancas',
  'groups': 'ol_groups',
  'food_security_support': 'ol_food_security_support',
  'activity_attendance': 'ol_activity_attendance',
  'group_activities': 'ol_group_activities',
  'districts': 'ol_districts',
  'villages': 'ol_villages',
  'health_posts': 'ol_health_posts',
  'health_workers': 'ol_health_workers',
  'training_courses': 'ol_training_courses',
  'health_training_attendees': 'ol_health_training_attendees',
  'livelihood_training_attendees': 'ol_livelihood_training_attendees',
  'communication_campaigns': 'ol_communication_campaigns',
  'safeguarding_events': 'ol_safeguarding_events',
  'climate_actions': 'ol_climate_actions',
  'conexao_sync': 'ol_conexao_sync',
  'monthly_screening': 'ol_monthly_screening',
  'usuarios_projetos': 'usuarios_projetos',
  'branding_settings': 'branding_settings',
  'visibility_settings': 'visibility_settings',
  'project_table_visibility': 'project_table_visibility',
  'project_visibility': 'project_visibility',
  'table_permissions': 'table_permissions',
  'profiles': 'profiles',
  // Module 1: Governance, Partners, Staffing
  'partner_registry': 'ol_partner_registry',
  'staff_master': 'ol_staff_master',
  'staff_hierarchy': 'ol_staff_hierarchy',
  // Module 2: LogFrame and Performance
  'logframe_hierarchy': 'ol_logframe_hierarchy',
  'indicator_catalog_v2': 'ol_indicator_catalog_v2',
  'target_baseline_registry': 'ol_target_baseline_registry',
  // Module 3: Operations and Activity
  'activity_log': 'ol_activity_log',
  'training_registry_v2': 'ol_training_registry_v2',
  'asset_inventory': 'ol_asset_inventory',
  // Module 4: Beneficiary and Impact
  'beneficiary_registry': 'ol_beneficiary_registry',
  'clinical_observations': 'ol_clinical_observations',
  'screening_event_log': 'ol_screening_event_log',
  'groups_registry_v2': 'ol_groups_registry_v2',
  'livelihood_activity_tracker': 'ol_livelihood_activity_tracker',
  'financial_inclusion_log': 'ol_financial_inclusion_log',
  'socio_economic_tracker': 'ol_socio_economic_tracker',
  // Module 5: Accountability and Learning
  'feedback_log': 'ol_feedback_log',
  'safeguarding_log': 'ol_safeguarding_log',
  'risk_management_matrix': 'ol_risk_management_matrix',
  'training_capacity_registry': 'ol_training_capacity_registry',
  // Geographical and Infrastructure
  'spatial_hierarchy': 'ol_spatial_hierarchy',
  'infrastructure_inventory': 'ol_infrastructure_inventory',
};

function resolveTableName(collectionName: string): string {
  return TABLE_MAP[collectionName] ?? collectionName;
}

// ─── Collections (table metadata) ──────────────────────────────────────────

export async function fetchCollections(signal?: AbortSignal): Promise<TableCollection[]> {
  const tableNames = Object.keys(TABLE_MAP);
  return tableNames.map((name) => ({
    key: name,
    name,
    title: null,
    template: 'general',
    hidden: false,
    description: null,
  }));
}

export async function fetchCollectionsByPrefix(prefix: string, signal?: AbortSignal): Promise<TableCollection[]> {
  const all = await fetchCollections(signal);
  if (!prefix) return all;
  return all.filter((c) => c.name.startsWith(prefix));
}

export async function fetchOlikanassaCollections(signal?: AbortSignal): Promise<TableCollection[]> {
  return fetchCollections(signal);
}

export async function fetchCollectionsForProject(
  prefixes: string[],
  opts: { includeMaster?: boolean; signal?: AbortSignal } = {},
): Promise<TableCollection[]> {
  const { includeMaster = false, signal } = opts;

  if (prefixes.length === 0) {
    return fetchOlikanassaCollections(signal);
  }

  const results: TableCollection[] = [];
  for (const prefix of prefixes) {
    try {
      const cols = await fetchCollectionsByPrefix(prefix, signal);
      results.push(...cols);
    } catch {
      // skip
    }
  }

  try {
    const all = await fetchCollections(signal);
    const existing = new Set(results.map((c) => c.name));
    for (const c of all) {
      if (!existing.has(c.name) && isGlobalTable(c.name)) {
        results.push(c);
      }
    }
  } catch {
    // ignore
  }

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
      // ignore
    }
  }

  return results;
}

// ─── Table schema (fields) ─────────────────────────────────────────────────

export async function fetchFields(
  collectionName: string,
  signal?: AbortSignal,
): Promise<FieldDef[]> {
  const tableName = resolveTableName(collectionName);
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
  if (error) {
    return [];
  }
  return (data ?? []).map((col: Record<string, string>) => ({
    key: col.column_name,
    name: col.column_name,
    type: col.data_type,
    interface: col.data_type,
    title: col.column_name,
    description: null,
    collectionName,
    allowNull: col.is_nullable === 'YES',
  }));
}

export async function createCollection(
  tableName: string,
  title: string,
  signal?: AbortSignal,
): Promise<TableCollection> {
  throw new DatabaseError('Criacao de tabelas nao suportada no Supabase. Use uma migracao.', 403);
}

export async function createField(
  collectionName: string,
  field: { name: string; interface: string; type: string; uiSchema?: Record<string, unknown> },
  signal?: AbortSignal,
): Promise<void> {
  throw new DatabaseError('Criacao de campos nao suportada no Supabase. Use uma migracao.', 403);
}

export async function deleteCollection(collectionName: string, signal?: AbortSignal): Promise<void> {
  throw new DatabaseError('Remocao de tabelas nao suportada no Supabase. Use uma migracao.', 403);
}

// ─── Records CRUD ──────────────────────────────────────────────────────────

export async function fetchRecords(
  collectionName: string,
  params: {
    page: number;
    pageSize: number;
    appends?: string[];
    filter?: Record<string, unknown>;
    signal?: AbortSignal;
  },
): Promise<RecordList> {
  const tableName = resolveTableName(collectionName);
  const offset = (params.page - 1) * params.pageSize;

  let query = supabase.from(tableName).select('*', { count: 'exact' });

  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (key === '$or' && Array.isArray(value)) {
        const orParts = value.map((f: Record<string, unknown>) => {
          return Object.entries(f).map(([k, v]) => `${k}.eq.${v}`).join(',');
        }).join(',');
        query = query.or(orParts);
      } else if (key === '$and' && Array.isArray(value)) {
        for (const cond of value as Record<string, unknown>[]) {
          for (const [k, v] of Object.entries(cond)) {
            if (k === '$or' && Array.isArray(v)) {
              const orParts = v.map((f: Record<string, unknown>) =>
                Object.entries(f).map(([fk, fv]) => `${fk}.eq.${fv}`).join(',')
              ).join(',');
              query = query.or(orParts);
            } else {
              query = query.eq(k, v);
            }
          }
        }
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        query = query.eq(key, value);
      }
    }
  }

  query = query.range(offset, offset + params.pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw new DatabaseError(`Erro ao ler registos: ${error.message}`, 0);

  const total = count ?? 0;
  const totalPage = Math.ceil(total / params.pageSize) || 1;

  return {
    data: (data ?? []) as Record<string, unknown>[],
    meta: {
      count: total,
      page: params.page,
      pageSize: params.pageSize,
      totalPage,
    },
  };
}

export async function createRecord(
  collectionName: string,
  values: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const tableName = resolveTableName(collectionName);
  const { data, error } = await supabase.from(tableName).insert(values).select().single();
  if (error) throw new DatabaseError(`Erro ao criar registo: ${error.message}`, 0);
  return data as Record<string, unknown>;
}

export async function updateRecord(
  collectionName: string,
  recordId: string | number,
  values: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const tableName = resolveTableName(collectionName);
  const { data, error } = await supabase
    .from(tableName)
    .update(values)
    .eq('id', recordId)
    .select()
    .single();
  if (error) throw new DatabaseError(`Erro ao atualizar registo: ${error.message}`, 0);
  return data as Record<string, unknown>;
}

export async function deleteRecord(
  collectionName: string,
  recordId: string | number,
  signal?: AbortSignal,
): Promise<void> {
  const tableName = resolveTableName(collectionName);
  const { error } = await supabase.from(tableName).delete().eq('id', recordId);
  if (error) throw new DatabaseError(`Erro ao eliminar registo: ${error.message}`, 0);
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface RoleDef {
  name: string;
  title: string | null;
  hidden?: boolean;
}

export interface AppUser {
  id: string | number;
  email: string;
  nickname: string | null;
  username: string | null;
  roles: RoleDef[];
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ user: AppUser; token: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new DatabaseError(
      `Erro de autenticacao: ${error.message}`,
      error.status ?? 401,
    );
  }

  const session = data.session!;
  const authUser = data.user!;

  let roles: RoleDef[] = [];
  try {
    const projectRole = await fetchProjectRole(authUser.id);
    if (projectRole) {
      roles = [projectRole];
    }
  } catch {
    // ignore
  }

  const userRole = (authUser.user_metadata?.role as string) ?? null;
  if (userRole && !roles.some((r) => r.name === userRole)) {
    roles = [...roles, { name: userRole, title: null }];
  }
  if (roles.length === 0) {
    roles = [{ name: 'editor', title: null }];
  }

  const user: AppUser = {
    id: authUser.id,
    email: authUser.email ?? email,
    nickname: (authUser.user_metadata?.nickname as string) ?? null,
    username: (authUser.user_metadata?.username as string) ?? null,
    roles,
  };

  return { user, token: session.access_token };
}

async function fetchProjectRole(userId: string | number): Promise<RoleDef | null> {
  const { data, error } = await supabase
    .from('usuarios_projetos')
    .select('role_no_projeto')
    .eq('usuario_fkey', String(userId))
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const roleName = data[0].role_no_projeto as string | null;
  if (!roleName) return null;
  return { name: roleName, title: null };
}

export async function checkAuth(token: string): Promise<AppUser> {
  const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
  if (error || !authUser) throw new DatabaseError('Sessao expirada.', 401);

  let roles: RoleDef[] = [];
  try {
    const projectRole = await fetchProjectRole(authUser.id);
    if (projectRole) roles = [projectRole];
  } catch {
    // ignore
  }

  const userRole = (authUser.user_metadata?.role as string) ?? null;
  if (userRole && !roles.some((r) => r.name === userRole)) {
    roles = [...roles, { name: userRole, title: null }];
  }
  if (roles.length === 0) {
    roles = [{ name: 'editor', title: null }];
  }

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    nickname: (authUser.user_metadata?.nickname as string) ?? null,
    username: (authUser.user_metadata?.username as string) ?? null,
    roles,
  };
}

export async function fetchUsers(signal?: AbortSignal): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, nickname, role');
  if (error) throw new DatabaseError(`Erro ao listar utilizadores: ${error.message}`, 0);

  return (data ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    nickname: u.nickname ?? null,
    username: null,
    roles: [{ name: u.role ?? 'editor', title: null }],
  }));
}

export interface UserWithProject {
  id: string | number;
  nickname: string | null;
  email: string;
  roles: string | null;
  active_project_id: string | number | null;
  active_project: { id: string | number; nome: string } | null;
}

export async function fetchUsersWithProjects(signal?: AbortSignal): Promise<UserWithProject[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, nickname, role, active_project_id');
  if (error) throw new DatabaseError(`Erro ao listar utilizadores: ${error.message}`, 0);

  return (data ?? []).map((u) => ({
    id: u.id,
    nickname: u.nickname ?? null,
    email: u.email ?? '',
    roles: u.role ?? null,
    active_project_id: u.active_project_id ?? null,
    active_project: null,
  }));
}

export async function fetchRoles(signal?: AbortSignal): Promise<RoleDef[]> {
  return [
    { name: 'super_admin', title: 'Super Administrador' },
    { name: 'admin', title: 'Administrador' },
    { name: 'editor', title: 'Editor' },
    { name: 'leitor', title: 'Leitor' },
    { name: 'admin_projeto', title: 'Admin de Projeto' },
    { name: 'editor_projeto', title: 'Editor de Projeto' },
    { name: 'leitor_projeto', title: 'Leitor de Projeto' },
  ];
}

export async function setUserRole(
  userId: string | number,
  roleName: string,
  token?: string | null,
): Promise<void> {
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ role: roleName })
    .eq('id', String(userId));
  if (profileErr) throw new DatabaseError(`Erro ao definir role: ${profileErr.message}`, 0);

  const { error: authErr } = await supabase.auth.admin.updateUserById(String(userId), {
    user_metadata: { role: roleName },
  });
  if (authErr) throw new DatabaseError(`Erro ao atualizar utilizador: ${authErr.message}`, 0);
}

// ─── Role permissions ──────────────────────────────────────────────────────

export interface RolePermission {
  role_name: string;
  resources: Record<string, { actions: string[]; scope?: string }>;
}

export async function fetchRolePermissions(
  roleName?: string,
  signal?: AbortSignal,
): Promise<RolePermission[]> {
  return [];
}

export async function fetchRoleWithPermissions(
  roleName: string,
  signal?: AbortSignal,
): Promise<RoleDef & { permissions?: RolePermission }> {
  const role = (await fetchRoles(signal)).find((r) => r.name === roleName);
  if (!role) throw new DatabaseError(`Role "${roleName}" nao encontrada.`, 404);
  return { ...role, permissions: undefined };
}

// ─── Branding ──────────────────────────────────────────────────────────────

export interface Attachment {
  id: string | number;
  url: string;
  filename: string | null;
  mimetype: string | null;
  size: number | null;
}

export interface BrandingRecord {
  id: string | number;
  logo: Attachment[] | null;
  login_title: string;
  login_subtitle: string;
  login_button_text: string;
}

export async function fetchBrandingSettings(signal?: AbortSignal): Promise<BrandingRecord | null> {
  try {
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      logo: data.logo ? [{ id: '', url: data.logo, filename: null, mimetype: null, size: null }] : null,
      login_title: data.login_title ?? '',
      login_subtitle: data.login_subtitle ?? '',
      login_button_text: data.login_button_text ?? '',
    };
  } catch {
    return null;
  }
}

export async function uploadAttachment(file: File, signal?: AbortSignal): Promise<Attachment> {
  const fileName = `logos/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from('attachments')
    .upload(fileName, file);
  if (uploadErr) throw new DatabaseError(`Erro ao enviar ficheiro: ${uploadErr.message}`, 0);

  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);

  return {
    id: fileName,
    url: urlData.publicUrl,
    filename: file.name,
    mimetype: file.type,
    size: file.size,
  };
}

export async function saveBrandingSettings(
  values: { logo: Attachment[] | null; login_title: string; login_subtitle: string; login_button_text: string },
  signal?: AbortSignal,
): Promise<void> {
  const logoUrl = values.logo?.[0]?.url ?? null;
  const { error } = await supabase
    .from('branding_settings')
    .upsert({
      id: 1,
      logo: logoUrl,
      login_title: values.login_title,
      login_subtitle: values.login_subtitle,
      login_button_text: values.login_button_text,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new DatabaseError(`Erro ao guardar branding: ${error.message}`, 0);
}

export async function resetBrandingSettings(signal?: AbortSignal): Promise<void> {
  try {
    await supabase
      .from('branding_settings')
      .update({
        logo: null,
        login_title: '',
        login_subtitle: '',
        login_button_text: '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
  } catch {
    // ignore
  }
}

// ─── Visibility settings ───────────────────────────────────────────────────

export interface VisibilitySettingRow {
  id?: string | number;
  collection_name: string;
  field_name: string | null;
  visible: boolean;
  role: string | null;
}

export async function fetchVisibilitySettings(
  role?: string | null,
  signal?: AbortSignal,
): Promise<VisibilitySettingRow[]> {
  try {
    let query = supabase.from('visibility_settings').select('*');
    if (role) {
      query = query.or(`role.eq.${role},role.is.null`);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id,
      collection_name: r.collection_name as string,
      field_name: (r.field_name as string | null) ?? null,
      visible: r.visible as boolean,
      role: (r.role as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function upsertVisibilitySetting(
  collectionName: string,
  fieldName: string | null,
  visible: boolean,
  role?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  try {
    let query = supabase
      .from('visibility_settings')
      .select('id')
      .eq('collection_name', collectionName);
    if (fieldName) {
      query = query.eq('field_name', fieldName);
    } else {
      query = query.is('field_name', null);
    }
    if (role) {
      query = query.eq('role', role);
    } else {
      query = query.is('role', null);
    }
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase
        .from('visibility_settings')
        .update({ visible, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('visibility_settings').insert({
        collection_name: collectionName,
        field_name: fieldName,
        visible,
        role: role ?? null,
      });
    }
  } catch {
    // ignore
  }
}

export { isConfigured, getConfigStatus };

// ─── Table permissions (stored in Supabase) ────────────────────────────────

export type TablePermission = 'view' | 'create' | 'edit' | 'delete';

export const ALL_PERMISSIONS: TablePermission[] = ['view', 'create', 'edit', 'delete'];

export interface TablePermissionRow {
  id?: string | number;
  role_name: string;
  collection_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export async function fetchTablePermissions(
  roleName?: string | null,
): Promise<TablePermissionRow[]> {
  let query = supabase.from('table_permissions').select('*');
  if (roleName) query = query.eq('role_name', roleName);
  const { data, error } = await query;
  if (error) throw new DatabaseError(`Erro ao ler permissoes: ${error.message}`, 0);
  return (data ?? []).map((r) => ({
    id: r.id,
    role_name: r.role_name,
    collection_name: r.collection_name,
    can_view: r.can_view,
    can_create: r.can_create,
    can_edit: r.can_edit,
    can_delete: r.can_delete,
  }));
}

export async function upsertTablePermission(
  roleName: string,
  collectionName: string,
  permission: TablePermission,
  value: boolean,
): Promise<void> {
  const fieldMap: Record<TablePermission, string> = {
    view: 'can_view',
    create: 'can_create',
    edit: 'can_edit',
    delete: 'can_delete',
  };
  const col = fieldMap[permission];

  const { data: existing, error: fetchErr } = await supabase
    .from('table_permissions')
    .select('id')
    .eq('role_name', roleName)
    .eq('collection_name', collectionName)
    .maybeSingle();

  if (fetchErr) throw new DatabaseError(`Erro ao procurar permissao: ${fetchErr.message}`, 0);

  if (existing) {
    const { error: updateErr } = await supabase
      .from('table_permissions')
      .update({ [col]: value, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateErr) throw new DatabaseError(`Erro ao atualizar permissao: ${updateErr.message}`, 0);
  } else {
    const row: Record<string, unknown> = {
      role_name: roleName,
      collection_name: collectionName,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
    row[col] = value;
    const { error: insertErr } = await supabase
      .from('table_permissions')
      .insert(row);
    if (insertErr) throw new DatabaseError(`Erro ao criar permissao: ${insertErr.message}`, 0);
  }
}

export async function deleteTablePermission(
  roleName: string,
  collectionName: string,
): Promise<void> {
  const { error } = await supabase
    .from('table_permissions')
    .delete()
    .eq('role_name', roleName)
    .eq('collection_name', collectionName);
  if (error) throw new DatabaseError(`Erro ao remover permissao: ${error.message}`, 0);
}

export async function fetchPermissionsForRole(
  roleName: string,
  collectionName: string,
): Promise<TablePermissionRow | null> {
  const { data, error } = await supabase
    .from('table_permissions')
    .select('*')
    .eq('role_name', roleName)
    .eq('collection_name', collectionName)
    .maybeSingle();
  if (error) throw new DatabaseError(`Erro ao ler permissao: ${error.message}`, 0);
  if (!data) return null;
  return {
    id: data.id,
    role_name: data.role_name,
    collection_name: data.collection_name,
    can_view: data.can_view,
    can_create: data.can_create,
    can_edit: data.can_edit,
    can_delete: data.can_delete,
  };
}

// ─── Per-project credential loading & access validation ────────────────────

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
  const { data, error } = await supabase
    .from('projetos')
    .select('base_id, api_token')
    .eq('id', String(projectId))
    .maybeSingle();
  if (error || !data) return { baseId: null, apiToken: null, projectRole: null };
  return {
    baseId: data.base_id ?? null,
    apiToken: data.api_token ?? null,
    projectRole: null,
  };
}

export async function fetchUserWithProjects(
  userId: string | number,
  token?: string | null,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('usuarios_projetos')
    .select(`
      *,
      projeto_id:projetos(*)
    `)
    .eq('usuario_fkey', String(userId));
  if (error) return null;
  if (!data || data.length === 0) return { usuarios_projetos: [] };
  return { usuarios_projetos: data };
}

export async function validateProjectAccess(
  userId: string | number,
  projectId: string | number,
  signal?: AbortSignal,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('usuarios_projetos')
    .select('role_no_projeto')
    .eq('usuario_fkey', String(userId))
    .eq('projeto_id', String(projectId))
    .maybeSingle();
  if (error || !data) return null;
  return (data.role_no_projeto as string) ?? null;
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
  const { data, error } = await supabase.from('projetos').select('*');
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    nome: r.nome as string,
    status: (r.status as string) ?? null,
    table_prefix: (r.table_prefix as string) ?? null,
  }));
}

export async function fetchAllUserProjectAssignments(signal?: AbortSignal): Promise<UserProjectAssignment[]> {
  const { data, error } = await supabase
    .from('usuarios_projetos')
    .select(`
      id,
      usuario_fkey,
      role_no_projeto,
      projetos:projeto_id(id, nome)
    `);
  if (error) return [];

  const userIds = [...new Set((data ?? []).map((r) => String(r.usuario_fkey)))];

  const profileMap = new Map<string, { email: string; nickname: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, nickname')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { email: p.email ?? '', nickname: p.nickname ?? null });
    }
  }

  return (data ?? []).map((r) => {
    const proj = r.projetos as unknown as Record<string, unknown> | null;
    const profile = profileMap.get(String(r.usuario_fkey));
    return {
      id: r.id as string,
      userId: r.usuario_fkey as string,
      userEmail: profile?.email ?? '',
      userNickname: profile?.nickname ?? null,
      projectId: (proj?.id ?? '') as string,
      projectName: (proj?.nome as string) ?? 'Projeto',
      role: (r.role_no_projeto as string) ?? null,
    };
  });
}

export async function createUserProjectAssignment(
  userId: string | number,
  projectId: string | number,
  role: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('usuarios_projetos')
    .insert({
      usuario_fkey: String(userId),
      projeto_id: String(projectId),
      role_no_projeto: role,
    })
    .select()
    .single();
  if (error) throw new DatabaseError(`Erro ao criar atribuicao: ${error.message}`, 0);
  return data as Record<string, unknown>;
}

export async function updateUserProjectAssignmentRole(
  assignmentId: string | number,
  role: string,
  signal?: AbortSignal,
): Promise<void> {
  const { error } = await supabase
    .from('usuarios_projetos')
    .update({ role_no_projeto: role, updated_at: new Date().toISOString() })
    .eq('id', String(assignmentId));
  if (error) throw new DatabaseError(`Erro ao atualizar atribuicao: ${error.message}`, 0);
}

export async function deleteUserProjectAssignment(
  assignmentId: string | number,
  signal?: AbortSignal,
): Promise<void> {
  const { error } = await supabase
    .from('usuarios_projetos')
    .delete()
    .eq('id', String(assignmentId));
  if (error) throw new DatabaseError(`Erro ao eliminar atribuicao: ${error.message}`, 0);
}

// ─── Project table visibility (stored in Supabase) ─────────────────────────

export type VisibilityTarget = 'user' | 'role';

export interface ProjectTableVisibilityRow {
  id?: string | number;
  user_id: string | number | null;
  role_name: string | null;
  project_id: string | number;
  collection_name: string;
  visible: boolean;
}

export async function ensureProjectTableVisibilityTable(signal?: AbortSignal): Promise<void> {
  // Table already exists in Supabase — no-op
}

export async function fetchProjectTableVisibility(
  projectId: string | number,
  userId?: string | number | null,
  roleName?: string | null,
  signal?: AbortSignal,
): Promise<ProjectTableVisibilityRow[]> {
  try {
    let query = supabase
      .from('project_table_visibility')
      .select('*')
      .eq('project_id', String(projectId));
    if (userId != null) query = query.eq('user_id', String(userId));
    if (roleName != null && roleName !== '') query = query.eq('role_name', roleName);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      user_id: (r.user_id as string | null) ?? null,
      role_name: (r.role_name as string | null) ?? null,
      project_id: r.project_id as string,
      collection_name: r.collection_name as string,
      visible: r.visible as boolean,
    }));
  } catch {
    return [];
  }
}

export async function upsertProjectTableVisibility(
  projectId: string | number,
  collectionName: string,
  visible: boolean,
  userId?: string | number | null,
  roleName?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  try {
    let query = supabase
      .from('project_table_visibility')
      .select('id')
      .eq('project_id', String(projectId))
      .eq('collection_name', collectionName);
    if (userId != null) {
      query = query.eq('user_id', String(userId));
    } else {
      query = query.is('user_id', null);
    }
    if (roleName != null && roleName !== '') {
      query = query.eq('role_name', roleName);
    } else {
      query = query.is('role_name', null);
    }
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase
        .from('project_table_visibility')
        .update({ visible })
        .eq('id', existing.id);
    } else {
      await supabase.from('project_table_visibility').insert({
        user_id: userId != null ? String(userId) : null,
        role_name: roleName ?? null,
        project_id: String(projectId),
        collection_name: collectionName,
        visible,
      });
    }
  } catch {
    // ignore
  }
}

export async function fetchAllProjectTableVisibility(
  signal?: AbortSignal,
): Promise<ProjectTableVisibilityRow[]> {
  try {
    const { data, error } = await supabase
      .from('project_table_visibility')
      .select('*');
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      user_id: (r.user_id as string | null) ?? null,
      role_name: (r.role_name as string | null) ?? null,
      project_id: r.project_id as string,
      collection_name: r.collection_name as string,
      visible: r.visible as boolean,
    }));
  } catch {
    return [];
  }
}

// ─── Project visibility per user (stored in Supabase) ──────────────────────

export interface ProjectVisibilityRow {
  id?: string | number;
  user_id: string | number;
  project_id: string | number;
  visible: boolean;
}

export async function ensureProjectVisibilityTable(signal?: AbortSignal): Promise<void> {
  // Table already exists — no-op
}

export async function fetchProjectVisibilityForUser(
  userId: string | number,
  signal?: AbortSignal,
): Promise<ProjectVisibilityRow[]> {
  try {
    const { data, error } = await supabase
      .from('project_visibility')
      .select('*')
      .eq('user_id', String(userId));
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      project_id: r.project_id as string,
      visible: r.visible as boolean,
    }));
  } catch {
    return [];
  }
}

export async function fetchAllProjectVisibility(
  signal?: AbortSignal,
): Promise<ProjectVisibilityRow[]> {
  try {
    const { data, error } = await supabase
      .from('project_visibility')
      .select('*');
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      project_id: r.project_id as string,
      visible: r.visible as boolean,
    }));
  } catch {
    return [];
  }
}

export async function upsertProjectVisibility(
  userId: string | number,
  projectId: string | number,
  visible: boolean,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('project_visibility')
      .select('id')
      .eq('user_id', String(userId))
      .eq('project_id', String(projectId))
      .maybeSingle();

    if (existing) {
      await supabase
        .from('project_visibility')
        .update({ visible })
        .eq('id', existing.id);
    } else {
      await supabase.from('project_visibility').insert({
        user_id: String(userId),
        project_id: String(projectId),
        visible,
      });
    }
  } catch {
    // ignore
  }
}
