import type { User, Voter } from '@/db/schema';

export const PERMISSIONS = [
  'dashboard.view',
  'crm.view',
  'crm.edit',
  'campaigns.view',
  'campaigns.manage',
  'conversations.view',
  'conversations.reply',
  'compliance.view',
  'compliance.manage',
  'reports.view',
  'reports.export',
  'reports.schedule',
  'admin.manage',
  'settings.view',
  'settings.manage',
  'operations.view',
  'operations.manage',
] as const;

export type Permission = typeof PERMISSIONS[number];
export type AppRole = NonNullable<User['role']>;

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [...PERMISSIONS],
  coordenador: [
    'dashboard.view',
    'crm.view',
    'crm.edit',
    'campaigns.view',
    'campaigns.manage',
    'conversations.view',
    'conversations.reply',
    'compliance.view',
    'compliance.manage',
    'reports.view',
    'reports.export',
    'settings.view',
    'operations.view',
  ],
  cabo: [
    'dashboard.view',
    'crm.view',
    'crm.edit',
    'conversations.view',
    'conversations.reply',
  ],
  voluntario: [
    'dashboard.view',
    'conversations.view',
    'conversations.reply',
  ],
};

export interface SessionActor {
  userId: string | null;
  name: string;
  email: string | null;
  role: AppRole;
  regionScope: string | null;
  permissions: Permission[];
  enabled: boolean;
  source: 'user' | 'bootstrap';
}

function normalizeText(value: string | null | undefined) {
  return value
    ?.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim() ?? '';
}

export function resolvePermissions(
  role: AppRole,
  customPermissions: readonly string[] | null | undefined,
): Permission[] {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);
  for (const permission of customPermissions ?? []) {
    if ((PERMISSIONS as readonly string[]).includes(permission)) {
      granted.add(permission as Permission);
    }
  }
  return [...granted];
}

export function can(actor: SessionActor | null, permission: Permission): boolean {
  if (!actor || !actor.enabled) return false;
  return actor.permissions.includes(permission);
}

export function canAny(actor: SessionActor | null, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(actor, permission));
}

export function pagePermission(pageId: string): Permission | null {
  switch (pageId) {
    case 'dashboard':
      return 'dashboard.view';
    case 'crm':
      return 'crm.view';
    case 'campanhas':
    case 'segmentacao':
      return 'campaigns.view';
    case 'conversas':
      return 'conversations.view';
    case 'compliance':
      return 'compliance.view';
    case 'relatorios':
      return 'reports.view';
    case 'admin':
      return 'admin.manage';
    case 'settings':
      return 'settings.view';
    case 'chips':
    case 'contacts':
    case 'clusters':
    case 'history':
    case 'logs':
      return 'operations.view';
    default:
      return null;
  }
}

export function scopeMatches(
  regionScope: string | null | undefined,
  values: Array<string | null | undefined>,
): boolean {
  const scope = normalizeText(regionScope);
  if (!scope) return true;

  return values.some((value) => {
    const normalized = normalizeText(value);
    return normalized.includes(scope) || scope.includes(normalized);
  });
}

export function isVoterInScope(actor: SessionActor | null, voter: Pick<Voter, 'zone' | 'city' | 'neighborhood'>): boolean {
  if (!actor || actor.role === 'admin') return true;
  return scopeMatches(actor.regionScope, [voter.zone, voter.city, voter.neighborhood]);
}

export function actorLabel(actor: SessionActor | null): string {
  if (!actor) return 'Sessão ativa';

  const roleLabel = actor.role === 'admin'
    ? 'Admin'
    : actor.role === 'coordenador'
      ? 'Coordenador'
      : actor.role === 'cabo'
        ? 'Cabo'
        : 'Voluntário';

  if (!actor.regionScope) {
    return `${actor.name} · ${roleLabel}`;
  }

  return `${actor.name} · ${roleLabel} · ${actor.regionScope}`;
}

