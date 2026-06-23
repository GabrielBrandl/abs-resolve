/**
 * Teste E2E do fluxo cliente: cadastro → serviço Tipo A → agendar → pagar
 * Uso: node scripts/test-fluxo.mjs
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const ts = Date.now();

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
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${json.error || JSON.stringify(json)}`);
  }
  return json.data ?? json;
}

async function main() {
  const steps = [];

  const health = await req('GET', '/health');
  steps.push({ ok: true, step: 'health', database: health.database, storage: health.storage });

  const registro = await req('POST', '/auth/registrar', {
    tipo: 'PF',
    nome: 'Cliente Teste Fluxo',
    cpf: gerarCpfValido(),
    email: `teste.fluxo.${ts}@absresolve.test`,
    telefone: '11999998888',
    senha: 'teste123456',
    consentimentoLgpd: true,
    endereco: {
      rua: 'Rua Teste',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
    },
  });
  const token = registro.accessToken;
  steps.push({ ok: true, step: 'cadastro', userId: registro.user?.id });

  const catalogo = await req('GET', '/solicitacao/catalogo', null, token);
  const tomada = catalogo.find((s) => s.slug === 'tomada');
  if (!tomada) throw new Error('Serviço tomada não encontrado no catálogo');
  steps.push({ ok: true, step: 'catalogo', servicos: catalogo.length });

  const solicitacao = await req(
    'POST',
    '/solicitacao',
    { servicoSlug: 'tomada', opcoes: { tipo: 'simples', amperagem: '10a' } },
    token
  );
  steps.push({
    ok: true,
    step: 'criar_solicitacao',
    id: solicitacao.id,
    status: solicitacao.status,
    precoFinal: solicitacao.precoFinal,
  });

  const horarios = await req('GET', `/solicitacao/${solicitacao.id}/horarios`, null, token);
  const slot = horarios?.slots?.[0];
  if (!slot) throw new Error(`Nenhum horário disponível (${JSON.stringify(horarios)})`);
  steps.push({ ok: true, step: 'horarios', total: horarios.slots.length, slot: slot.label });

  const agendamento = await req(
    'POST',
    `/solicitacao/${solicitacao.id}/agendar`,
    {
      data: slot.data,
      horarioInicio: slot.horarioInicio,
      horarioFim: slot.horarioFim,
    },
    token
  );
  steps.push({ ok: true, step: 'agendar', agendamentoId: agendamento.id });

  const pagamento = await req(
    'POST',
    `/solicitacao/${solicitacao.id}/pagar`,
    { metodo: 'PIX' },
    token
  );
  steps.push({
    ok: true,
    step: 'pagar',
    pedido: pagamento.pedido?.numero,
    pagamentoId: pagamento.pagamento?.id,
  });

  const minhas = await req('GET', '/solicitacao/minhas', null, token);
  const ultima = minhas[0];
  steps.push({ ok: true, step: 'minhas_solicitacoes', status: ultima?.status, total: minhas.length });

  console.log('\n✅ FLUXO COMPLETO OK\n');
  for (const s of steps) {
    console.log(`  • ${s.step}:`, JSON.stringify(s));
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ FALHA NO FLUXO:', err.message);
  process.exit(1);
});
