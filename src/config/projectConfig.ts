import type { LucideIcon } from 'lucide-react';
import { FolderKanban, BarChart3, Stethoscope, Users, MapPin, GraduationCap, Megaphone, Shield, Sprout, Receipt } from 'lucide-react';

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
    collections: ['projetos', 'goals', 'despesas', 'diario_de_bordo', 'tarefas', 'report_settings'],
    displayNames: {
      despesas: 'Despesas',
      diario_de_bordo: 'Diário de Bordo',
      tarefas: 'Tarefas',
      report_settings: 'Configurações de Relatórios',
    },
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
    collections: ['screenings', 'pspark_casos_de_lepra'],
    displayNames: {
      screenings: 'Dados Clínicos / Lepra',
      pspark_casos_de_lepra: 'Casos de Lepra (PSpark)',
    },
  },
  {
    id: 'comunidade',
    label: 'Comunidade e Beneficiários',
    icon: Users,
    collections: ['members', 'liderancas', 'groups', 'food_security_support', 'activity_attendance', 'group_activities'],
    displayNames: {
      members: 'Beneficiários',
      liderancas: 'Lideranças Comunitárias',
      groups: 'Grupos de Poupança/Auto-Cuidado',
      food_security_support: 'Apoio à Segurança Alimentar',
      activity_attendance: 'Presença em Atividades',
      group_activities: 'Atividades de Grupo',
    },
  },
  {
    id: 'logistica',
    label: 'Logística e Locais',
    icon: MapPin,
    collections: ['districts', 'villages', 'health_posts', 'health_workers'],
    displayNames: {
      health_workers: 'Profissionais de Saúde',
    },
  },
  {
    id: 'formacao',
    label: 'Formação e Capacitação',
    icon: GraduationCap,
    collections: ['training_courses', 'health_training_attendees', 'livelihood_training_attendees'],
    displayNames: {
      training_courses: 'Cursos de Formação',
      health_training_attendees: 'Formandos (Saúde)',
      livelihood_training_attendees: 'Formandos (Sustento)',
    },
  },
  {
    id: 'comunicacao',
    label: 'Comunicação e Campanhas',
    icon: Megaphone,
    collections: ['communication_campaigns'],
    displayNames: {
      communication_campaigns: 'Campanhas de Comunicação',
    },
  },
  {
    id: 'protecao',
    label: 'Proteção e Salvaguarda',
    icon: Shield,
    collections: ['safeguarding_events'],
    displayNames: {
      safeguarding_events: 'Eventos de Proteção',
    },
  },
  {
    id: 'clima',
    label: 'Ações Climáticas',
    icon: Sprout,
    collections: ['climate_actions'],
    displayNames: {
      climate_actions: 'Ações de Adaptação Climática',
    },
  },
  {
    id: 'sync',
    label: 'Sincronização Externa',
    icon: Receipt,
    collections: ['conexao_sync', 'monthly_screening'],
    displayNames: {
      conexao_sync: 'Sincronização Kobo (Conexao)',
      monthly_screening: 'Rastreios Mensais (Kobo)',
    },
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
  if (isOlikanassa(projectId)) return 'ol_';
  const slug = (projectName || `p${projectId}`)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `p${slug}_`;
}
