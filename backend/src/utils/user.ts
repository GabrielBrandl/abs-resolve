import type { User } from '@prisma/client';

export type SafeUser = Omit<User, 'senhaHash'>;

export function sanitizeUser(user: User): SafeUser {
  const { senhaHash: _, ...safeUser } = user;
  return safeUser;
}
