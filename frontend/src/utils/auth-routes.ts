import type { Role } from '../types';

const STAFF_ROLES: Role[] = ['admin', 'comercial', 'operacional'];
const EQUIPE_LOGIN_ROLES: Role[] = ['admin', 'comercial', 'operacional', 'parceiro'];

export function isStaffRole(role: string | undefined): role is Role {
  return !!role && STAFF_ROLES.includes(role as Role);
}

/** Roles que entram pela aba Equipe / Parceiro (e-mail + senha) */
export function canLoginEquipe(role: string | undefined): boolean {
  return !!role && EQUIPE_LOGIN_ROLES.includes(role as Role);
}

export function isClienteRole(role: string | undefined): boolean {
  return role === 'cliente';
}

/** Rota inicial após login conforme perfil */
export function getHomeForRole(role: string | undefined): string {
  if (role === 'cliente') return '/cliente/agendar';
  if (role === 'operacional') return '/tecnico';
  if (role === 'parceiro') return '/parceiro';
  if (role === 'admin' || role === 'comercial') return '/';
  return '/login';
}

export function roleLabel(role: string | undefined): string {
  const map: Record<string, string> = {
    admin: 'Administrador',
    comercial: 'Comercial',
    operacional: 'Técnico',
    cliente: 'Cliente',
    parceiro: 'Parceiro',
  };
  return map[role || ''] || role || 'Usuário';
}
