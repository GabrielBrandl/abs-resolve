import type { Role, User } from '../types';

export function normalizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const role = u.role;
  if (typeof role !== 'string' || !role) return null;
  if (typeof u.id !== 'string' || typeof u.email !== 'string') return null;

  return {
    id: u.id,
    nome: typeof u.nome === 'string' ? u.nome : '',
    email: u.email,
    role: role as Role,
    createdAt: typeof u.createdAt === 'string' ? u.createdAt : new Date().toISOString(),
    clienteId: typeof u.clienteId === 'string' ? u.clienteId : undefined,
    cliente:
      u.cliente && typeof u.cliente === 'object'
        ? (u.cliente as User['cliente'])
        : undefined,
  };
}
