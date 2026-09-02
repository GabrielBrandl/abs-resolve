/**
 * Teste: checkout convidado repetido com mesmo CPF/e-mail deve retomar sessão.
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const ts = Date.now();

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${json.error || JSON.stringify(json)}`);
  return json.data ?? json;
}

function gerarCpfValido() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const calc = (base) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += base[i] * (base.length + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(n);
  const d2 = calc([...n, d1]);
  const digits = [...n, d1, d2].join('');
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

async function checkout(email, cpf) {
  return req('POST', '/auth/checkout-convidado', {
    nome: 'Cliente Retry',
    cpf,
    email,
    telefone: '92999887766',
    consentimentoLgpd: true,
    endereco: {
      rua: 'Rua Padre Geraldo',
      numero: '4105',
      bairro: 'Tarumã',
      cidade: 'Manaus',
      uf: 'AM',
      cep: '69021-035',
    },
  });
}

async function main() {
  const cpf = gerarCpfValido();
  const email = `retry.${ts}@absresolve.test`;

  const first = await checkout(email, cpf);
  if (!first.accessToken) throw new Error('Primeiro checkout sem token');

  const second = await checkout(email, cpf);
  if (!second.accessToken) throw new Error('Segundo checkout sem token');

  console.log('\n✅ CHECKOUT CONVIDADO RETRY OK');
}

main().catch((err) => {
  console.error('\n❌ FALHA:', err.message);
  process.exit(1);
});
