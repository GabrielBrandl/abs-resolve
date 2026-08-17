import { describe, expect, it } from 'vitest';
import {
  assertJwtSecret,
  assertPassword,
  pickFields,
  stripPrivilegeEscape,
} from '../utils/security.js';

describe('senha', () => {
  it('rejeita senha curta', () => {
    expect(() => assertPassword('abc')).toThrow();
  });
  it('rejeita só letras', () => {
    expect(() => assertPassword('abcdefgh')).toThrow();
  });
  it('aceita senha com letras e números', () => {
    expect(assertPassword('admin123')).toBe(true);
  });
});

describe('jwt secret em produção', () => {
  it('bloqueia secret fraco', () => {
    expect(() => assertJwtSecret('change-me', 'production')).toThrow();
  });
  it('aceita secret forte', () => {
    expect(assertJwtSecret('k8s-super-long-random-secret-value-92', 'production')).toContain('k8s');
  });
});

describe('mass assignment', () => {
  it('remove role e senhaHash do payload', () => {
    const clean = stripPrivilegeEscape({
      nome: 'João',
      role: 'admin',
      senhaHash: 'x',
      ativo: true,
    });
    expect(clean.role).toBeUndefined();
    expect(clean.senhaHash).toBeUndefined();
    expect(clean.ativo).toBeUndefined();
    expect(clean.nome).toBe('João');
  });

  it('pickFields só copia chaves permitidas', () => {
    const picked = pickFields({ nome: 'A', role: 'admin', email: 'a@b.com' }, ['nome', 'email']);
    expect(picked).toEqual({ nome: 'A', email: 'a@b.com' });
  });
});
