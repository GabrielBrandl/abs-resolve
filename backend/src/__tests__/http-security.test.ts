import { afterAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { prisma } from '../utils/prisma.js';

const app = createApp();
const server = app.listen(0);
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, headers: res.headers, json };
}

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  await prisma.$disconnect().catch(() => undefined);
});

describe('HTTP segurança', () => {
  it('raiz responde sem vazar stack', async () => {
    const res = await call('/');
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ success: true });
  });

  it('não expõe X-Powered-By', async () => {
    const res = await call('/');
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rota inexistente devolve JSON 404', async () => {
    const res = await call('/api-nao-existe');
    expect(res.status).toBe(404);
    expect(res.json).toMatchObject({ success: false });
  });

  it('dashboard exige autenticação', async () => {
    const res = await call('/dashboard/kpis');
    expect([401, 404]).toContain(res.status);
  });

  it('admin exige autenticação', async () => {
    const res = await call('/admin/usuarios');
    expect([401, 403, 404]).toContain(res.status);
  });

  it('login sem corpo é rejeitado', async () => {
    const res = await call('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('login com e-mail enorme é rejeitado', async () => {
    const res = await call('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${'a'.repeat(200)}@x.com`, senha: '12345678a' }),
    });
    expect(res.status).toBe(401);
  });

  it('token lixo não autentica', async () => {
    const res = await call('/auth/me', {
      headers: { Authorization: 'Bearer not-a-jwt' },
    });
    expect(res.status).toBe(401);
  });
});
