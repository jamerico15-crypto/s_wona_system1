import type { LucideIcon } from 'lucide-react';
import { FolderKanban, BarChart3, Stethoscope, Users, MapPin } from 'lucide-react';

export const OLIKANASSA_ID = '382993897816064';

export interface CategoryConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  collections: string[];
  displayNames: Record<string, string>;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'gestao',
    label: 'Gestão',
    icon: FolderKanban,
    collections: ['projetos', 'goals'],
    displayNames: {},
  },
  {
    id: 'ma',
    label: 'Monitorização e Avaliação (M&A)',
    icon: BarChart3,
    collections: ['Outcomes1', 'Project_Objectives', 'Outputs', 'Indicator_Catalog', 'indicator_measurements'],
    displayNames: {},
  },
  {
    id: 'core',
    label: 'Core Clínico (Lepra)',
    icon: Stethoscope,
    collections: ['screenings'],
    displayNames: { screenings: 'Dados Clínicos / Lepra' },
  },
  {
    id: 'comunidade',
    label: 'Comunidade e Beneficiários',
    icon: Users,
    collections: ['members', 'liderancas', 'groups'],
    displayNames: {
      members: 'Beneficiários',
      liderancas: 'Lideranças Comunitárias',
      groups: 'Grupos de Poupança/Auto-Cuidado',
    },
  },
  {
    id: 'logistica',
    label: 'Logística e Locais',
    icon: MapPin,
    collections: ['districts', 'villages', 'health_posts'],
    displayNames: {},
  },
];

const ALL_CATEGORIZED = new Set(CATEGORIES.flatMap((c) => c.collections));

export const GLOBAL_TABLES = new Set<string>([
  'projetos', 'usuarios_projetos', 'project_assignments',
  'branding_settings', 'visibility_settings',
  'users', 'roles',
]);

export function isGlobalTable(name: string): boolean {
  return GLOBAL_TABLES.has(name);
}

export function isCategorized(name: string): boolean {
  return ALL_CATEGORIZED.has(name);
}

export function getDisplayName(name: string): string | null {
  for (const cat of CATEGORIES) {
    if (cat.displayNames[name]) return cat.displayNames[name];
  }
  return null;
}

export function isOlikanassa(projectId: string | number | null | undefined): boolean {
  return projectId != null && String(projectId) === OLIKANASSA_ID;
}

export function getProjectPrefix(projectId: string | number, projectName?: string): string {
  if (isOlikanassa(projectId)) return '';
  const slug = (projectName || `p${projectId}`)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `p${slug}_`;
}
