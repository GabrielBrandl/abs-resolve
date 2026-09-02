/**
 * Testa endpoints de estoque em produção (ou API_URL).
 * Uso: node scripts/test-estoque-prod.mjs
 */
const API = process.env.API_URL || 'https://absresolve.com.br/api';
const EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@absresolve.com.br';
const SENHA = process.env.TEST_ADMIN_SENHA || 'admin123';

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  console.log('API:', API);
  const health = await req('/health');
  console.log('health', health.status, health.json?.data?.database);

  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, senha: SENHA }),
  });
  console.log('login', login.status, login.json?.success ? 'ok' : login.json?.error);

  const token = login.json?.data?.accessToken;
  if (!token) {
    console.error('Sem accessToken — abortando');
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  const paths = [
    '/admin/estoque/dashboard',
    '/admin/estoque',
    '/admin/estoque/alertas',
    '/admin/catalogo/estoque',
  ];

  let newApi = false;
  for (const p of paths) {
    const r = await req(p, { headers });
    console.log(p, r.status, p.includes('catalogo') ? `produtos: ${r.json?.data?.length ?? 0}` : JSON.stringify(r.json?.data)?.slice(0, 80));
    if (p.startsWith('/admin/estoque') && r.status === 200) newApi = true;
  }

  if (newApi) {
    const sync = await req('/admin/estoque/sincronizar', { method: 'POST', headers });
    console.log('sincronizar', sync.status, sync.json?.data);
  }

  const ok = newApi || (await req('/admin/catalogo/estoque', { headers })).status === 200;
  console.log(ok ? '✅ Estoque API OK' : '❌ Falha — backend antigo ou indisponível');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
