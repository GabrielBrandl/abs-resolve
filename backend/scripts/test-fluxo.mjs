/**
 * Teste E2E: questionário → carrinho → pagamento (mock confirma) → agendamento
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const ts = Date.now();

const RESPOSTAS_TOMADA = {
  tipoTomada: 'simples',
  quantidade: '1',
  fornecimentoTomada: 'cliente',
  estadoAtual: 'funcionando',
  localInstalacao: 'sala',
  alturaInstalacao: 'ate-2-5m',
  acabamentoParede: 'pintura',
};

const RESPOSTAS_INTERRUPTOR = {
  tipoInterruptor: 'simples',
  quantidade: '1',
  fornecimentoInterruptor: 'cliente',
  estadoInterruptor: 'funciona',
  localInstalacao: 'sala',
  alturaInstalacao: 'ate-2-5m',
  acabamentoParede: 'pintura',
};

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

async function aguardarPagamento(token, solId, maxTentativas = 15) {
  for (let i = 0; i < maxTentativas; i++) {
    const st = await req('GET', `/solicitacao/${solId}/status`, null, token);
    if (st.podeAgendar || st.status === 'pago') return st;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Pagamento não confirmado a tempo');
}

async function main() {
  const fluxoTomada = await req('GET', '/solicitacao/fluxo/troca-tomada', null, null);
  if (!fluxoTomada.perguntas?.length) throw new Error('Fluxo tomada vazio');

  const precoTomada = await req('POST', '/solicitacao/calcular-preco', {
    slug: 'troca-tomada',
    respostas: RESPOSTAS_TOMADA,
    quantidade: 1,
  });
  if (!precoTomada.preco || precoTomada.preco < 149) throw new Error('Preço tomada inválido');

  const registro = await req('POST', '/auth/registrar', {
    tipo: 'PF',
    nome: 'Cliente Teste Completo',
    cpf: gerarCpfValido(),
    email: `teste.full.${ts}@absresolve.test`,
    telefone: '11999997777',
    senha: 'teste123456',
    consentimentoLgpd: true,
    endereco: { rua: 'Rua Teste', numero: '1', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01310100' },
  });
  const token = registro.accessToken;

  const catalogo = await req('GET', '/solicitacao/catalogo', null, token);
  if (!catalogo.categorias?.length) throw new Error('Catálogo vazio');

  const config = await req('GET', '/solicitacao/config', null, token);
  if (!config.expressValor) throw new Error('Config pública indisponível');

  const sol = await req(
    'POST',
    '/solicitacao/carrinho',
    {
      itens: [
        { slug: 'troca-tomada', quantidade: 1, respostas: RESPOSTAS_TOMADA },
        { slug: 'troca-interruptor', quantidade: 1, respostas: RESPOSTAS_INTERRUPTOR },
      ],
      express: false,
    },
    token
  );

  if (Number(sol.precoFinal) < 298) throw new Error('Preço carrinho abaixo do esperado');

  const pagamentoRes = await req('POST', `/solicitacao/${sol.id}/pagar`, { metodo: 'PIX' }, token);
  await aguardarPagamento(token, sol.id);

  const horarios = await req('GET', `/solicitacao/${sol.id}/horarios`, null, token);
  const slot = horarios?.slots?.[0];
  if (!slot) throw new Error('Sem horários');

  await req(
    'POST',
    `/solicitacao/${sol.id}/agendar`,
    { data: slot.data, horarioInicio: slot.horarioInicio, horarioFim: slot.horarioFim },
    token
  );

  const pedidos = await req('GET', '/cliente/pedidos', null, token);
  if (!pedidos.length) throw new Error('Pedidos timeline vazio');

  console.log('\n✅ FLUXO COMPLETO OK');
  console.log('  Pedido:', pagamentoRes.pedido?.numero);
  console.log('  Preço tomada:', precoTomada.preco);
  console.log('  Carrinho R$:', sol.precoFinal);
  console.log('  Catálogo:', catalogo.total, 'serviços');
  console.log('  Express R$:', config.expressValor);
  console.log('  Timeline steps:', pedidos[0]?.timeline?.length || 0);
}

main().catch((err) => {
  console.error('\n❌ FALHA:', err.message);
  process.exit(1);
});
