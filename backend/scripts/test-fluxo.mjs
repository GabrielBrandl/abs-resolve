/**
 * Teste E2E: carrinho → pagamento → agendamento
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const ts = Date.now();

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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

async function main() {
  const registro = await req('POST', '/auth/registrar', {
    tipo: 'PF',
    nome: 'Cliente Teste Carrinho',
    cpf: gerarCpfValido(),
    email: `teste.carrinho.${ts}@absresolve.test`,
    telefone: '11999997777',
    senha: 'teste123456',
    consentimentoLgpd: true,
    endereco: { rua: 'Rua Teste', numero: '1', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01310100' },
  });
  const token = registro.accessToken;

  const catalogo = await req('GET', '/solicitacao/catalogo', null, token);
  if (!catalogo.categorias?.length) throw new Error('Catálogo vazio');

  const sol = await req(
    'POST',
    '/solicitacao/carrinho',
    { itens: [{ slug: 'troca-tomada', quantidade: 1 }, { slug: 'troca-interruptor', quantidade: 1 }], express: false },
    token
  );

  const pagamento = await req('POST', `/solicitacao/${sol.id}/pagar`, { metodo: 'PIX' }, token);
  const horarios = await req('GET', `/solicitacao/${sol.id}/horarios`, null, token);
  const slot = horarios?.slots?.[0];
  if (!slot) throw new Error('Sem horários');

  await req(
    'POST',
    `/solicitacao/${sol.id}/agendar`,
    { data: slot.data, horarioInicio: slot.horarioInicio, horarioFim: slot.horarioFim },
    token
  );

  console.log('\n✅ FLUXO CARRINHO OK');
  console.log('  Pedido:', pagamento.pedido?.numero);
  console.log('  Total serviços catálogo:', catalogo.total);
}

main().catch((err) => {
  console.error('\n❌ FALHA:', err.message);
  process.exit(1);
});
