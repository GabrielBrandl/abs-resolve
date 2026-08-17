const WEAK_SECRETS = new Set([
  '',
  'change-me',
  'secret',
  'jwt-secret',
  'abs-dev-secret-change-me',
]);

export function assertJwtSecret(secret: string | undefined, env = process.env.NODE_ENV) {
  const value = secret || '';
  if (env === 'production' && (WEAK_SECRETS.has(value) || value.length < 24)) {
    throw new Error('JWT_SECRET inseguro. Defina uma chave forte em produção.');
  }
  return value || 'abs-dev-secret-change-me';
}

export function assertPassword(password: string) {
  if (!password || password.length < 8) {
    throw new Error('A senha deve ter no mínimo 8 caracteres');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('A senha deve conter letras e números');
  }
  return true;
}

export function clipQuery(value: unknown, max = 80) {
  return String(value || '').slice(0, max);
}

export function pickFields<T extends Record<string, unknown>>(body: T, allowed: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export function stripPrivilegeEscape(body: Record<string, unknown>) {
  const clone = { ...body };
  delete clone.role;
  delete clone.senhaHash;
  delete clone.id;
  delete clone.ativo;
  return clone;
}
