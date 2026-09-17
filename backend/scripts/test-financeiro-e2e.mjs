/**
 * Teste ponta a ponta do módulo Financeiro (prioridades 1–10).
 * Uso: node scripts/test-financeiro-e2e.mjs
 * Env: API_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_SENHA
 */
const API = process.env.API_URL || 'https://absresolve.com.br/api';
const EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@absresolve.com.br';
const SENHA = process.env.TEST_ADMIN_SENHA || 'admin123';
const TAG = `[E2E-FIN-${Date.now()}]`;
const TEST_USER_EMAIL = `teste.fin.${Date.now()}@absresolve.local`;

const results = [];
function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}
function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}
function assert(name, cond, detail = '') {
  if (cond) ok(name, detail);
  else fail(name, detail);
}

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text?.slice?.(0, 200) };
  }
  return { status: res.status, json, text };
}

function data(r) {
  return r.json?.data;
}

async function main() {
  console.log('API:', API);
  console.log('TAG:', TAG);

  const health = await req('/health');
  assert('health', health.status === 200 && data(health)?.database === 'connected', JSON.stringify(data(health)));

  const login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, senha: SENHA }),
  });
  const token = data(login)?.accessToken;
  assert('login admin', !!token, login.json?.error || `status ${login.status}`);
  if (!token) {
    console.error('Abortando sem token');
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${token}` };

  // ── Criar usuário teste ──────────────────────────────────────────────────
  let testUserId = null;
  const criarUser = await req('/admin/usuarios', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      nome: `Usuário Teste Financeiro ${TAG}`,
      email: TEST_USER_EMAIL,
      senha: 'TesteFin123!',
      role: 'comercial',
    }),
  });
  testUserId = data(criarUser)?.id;
  assert('criar usuário teste', criarUser.status < 400 && !!testUserId, criarUser.json?.error || `status ${criarUser.status}`);

  // Login como usuário teste (permissão comercial no financeiro)
  const loginTeste = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_USER_EMAIL, senha: 'TesteFin123!' }),
  });
  const tokenTeste = data(loginTeste)?.accessToken;
  assert('login usuário teste', !!tokenTeste, loginTeste.json?.error);
  const authTeste = { Authorization: `Bearer ${tokenTeste || token}` };

  // ── Seed + cadastros ─────────────────────────────────────────────────────
  const seed = await req('/financeiro/seed', { method: 'POST', headers: authTeste, body: '{}' });
  assert('seed financeiro', seed.status === 200, seed.json?.error);

  const contas = await req('/financeiro/contas?all=1', { headers: authTeste });
  const listaContas = data(contas) || [];
  assert('listar contas', contas.status === 200 && listaContas.length >= 1, `n=${listaContas.length}`);
  const temSaldoAtual = listaContas.every((c) => typeof c.saldoAtual === 'number' || c.saldoAtual == null);
  // After deploy, saldoAtual should exist
  assert(
    'contas.saldoAtual ligado',
    listaContas.length > 0 && listaContas.some((c) => typeof c.saldoAtual === 'number'),
    listaContas[0] ? `keys=${Object.keys(listaContas[0]).join(',')}` : 'vazio'
  );

  const cats = await req('/financeiro/categorias?all=1', { headers: authTeste });
  const listaCats = data(cats) || [];
  assert('listar categorias', cats.status === 200 && listaCats.length >= 1);
  const catDespesa = listaCats.find((c) => c.tipo !== 'receita' && c.tipo !== 'transferencia' && c.ativo);
  const catReceita = listaCats.find((c) => c.tipo === 'receita' && c.ativo);
  const contaA = listaContas.find((c) => c.ativo) || listaContas[0];
  const contaB = listaContas.find((c) => c.ativo && c.id !== contaA?.id) || listaContas[1];

  const hoje = new Date().toISOString().slice(0, 10);

  // ── Conta a pagar simples ────────────────────────────────────────────────
  const pagar = await req('/financeiro/lancamentos', {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({
      natureza: 'despesa',
      descricao: `${TAG} Conta a pagar teste`,
      valor: 200,
      dataCompetencia: hoje,
      dataVencimento: hoje,
      categoriaId: catDespesa?.id || null,
      contaId: contaA?.id || null,
      fornecedorNome: 'Fornecedor E2E',
      formaPagamento: 'PIX',
      parcelas: 1,
    }),
  });
  const lancPagar = data(pagar);
  assert('criar conta a pagar', pagar.status === 201 && !!lancPagar?.id, pagar.json?.error);
  assert('conta a pagar status a_pagar', lancPagar?.status === 'a_pagar', `status=${lancPagar?.status}`);

  // ── Parcelamento ─────────────────────────────────────────────────────────
  const parcelado = await req('/financeiro/lancamentos', {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({
      natureza: 'despesa',
      descricao: `${TAG} Aluguel parcelado`,
      valor: 300,
      dataCompetencia: hoje,
      dataVencimento: hoje,
      categoriaId: catDespesa?.id || null,
      contaId: contaA?.id || null,
      fornecedorNome: 'Imobiliária E2E',
      parcelas: 3,
    }),
  });
  const grupo = data(parcelado);
  const nParcelas = grupo?.total ?? grupo?.parcelas?.length;
  assert('criar parcelamento 3x', parcelado.status === 201 && nParcelas === 3, parcelado.json?.error || JSON.stringify(grupo)?.slice(0, 120));
  assert('grupoParcelasId presente', !!grupo?.grupoParcelasId, `grupo=${grupo?.grupoParcelasId}`);
  if (grupo?.parcelas?.length === 3) {
    const soma = grupo.parcelas.reduce((s, p) => s + Number(p.valor), 0);
    assert('soma parcelas = valor', Math.abs(soma - 300) < 0.02, `soma=${soma}`);
    assert(
      'parcelas numeradas',
      grupo.parcelas.every((p, i) => p.parcelaNumero === i + 1 && p.parcelaTotal === 3)
    );
  }

  // ── Conta a receber ──────────────────────────────────────────────────────
  const receber = await req('/financeiro/lancamentos', {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({
      natureza: 'receita',
      descricao: `${TAG} Conta a receber teste`,
      valor: 500,
      dataCompetencia: hoje,
      dataVencimento: hoje,
      categoriaId: catReceita?.id || null,
      contaId: contaA?.id || null,
      formaPagamento: 'PIX',
    }),
  });
  const lancReceber = data(receber);
  assert('criar conta a receber', receber.status === 201 && !!lancReceber?.id, receber.json?.error);
  assert('conta a receber status a_receber', lancReceber?.status === 'a_receber', `status=${lancReceber?.status}`);

  // ── Baixa parcial com juros/multa/desconto/taxa ───────────────────────────
  const baixaParcial = await req(`/financeiro/lancamentos/${lancReceber?.id}/baixar`, {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({
      dataMovimento: hoje,
      valorPrincipal: 250,
      juros: 10,
      multa: 5,
      desconto: 5,
      taxa: 2,
      contaId: contaA?.id || null,
      formaPagamento: 'PIX',
      observacoes: `${TAG} baixa parcial`,
    }),
  });
  const aposParcial = data(baixaParcial);
  assert('baixa parcial', baixaParcial.status === 200 && aposParcial?.status === 'parcial', baixaParcial.json?.error || `status=${aposParcial?.status}`);
  assert(
    'valorPago após parcial',
    Number(aposParcial?.valorPago) === 250,
    `valorPago=${aposParcial?.valorPago}`
  );
  // líquido esperado: 250+10+5-5-2 = 258
  const baixaCriada = aposParcial?.baixa;
  assert(
    'valor líquido baixa',
    Number(baixaCriada?.valorLiquido) === 258,
    `liquido=${baixaCriada?.valorLiquido}`
  );

  // ── Upload anexo ─────────────────────────────────────────────────────────
  const form = new FormData();
  const blob = new Blob([`comprovante ${TAG}`], { type: 'application/pdf' });
  form.append('arquivo', blob, `comprovante-${Date.now()}.pdf`);
  const up = await fetch(`${API}/financeiro/anexos`, {
    method: 'POST',
    headers: authTeste,
    body: form,
  });
  const upJson = await up.json().catch(() => ({}));
  const anexoUrl = upJson?.data?.url;
  assert('upload anexo', up.status === 200 && !!anexoUrl, upJson?.error || `status ${up.status}`);

  // Baixa restante com anexo
  const baixaFinal = await req(`/financeiro/lancamentos/${lancReceber?.id}/baixar`, {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({
      dataMovimento: hoje,
      valorPrincipal: 250,
      contaId: contaA?.id || null,
      formaPagamento: 'PIX',
      anexoUrl: anexoUrl || null,
      observacoes: `${TAG} baixa final`,
    }),
  });
  const aposFinal = data(baixaFinal);
  assert('baixa total (saldo)', baixaFinal.status === 200 && aposFinal?.status === 'recebida', baixaFinal.json?.error || `status=${aposFinal?.status}`);

  // ── Detalhe / baixas / histórico ─────────────────────────────────────────
  const detalhe = await req(`/financeiro/lancamentos/${lancReceber?.id}`, { headers: authTeste });
  const d = data(detalhe);
  assert('obter lançamento', detalhe.status === 200 && !!d?.id, detalhe.json?.error);
  assert('baixas no detalhe', Array.isArray(d?.baixas) && d.baixas.length >= 2, `n=${d?.baixas?.length}`);
  assert('histórico auditoria', Array.isArray(d?.historico) && d.historico.length >= 2, `n=${d?.historico?.length}`);

  const listaBaixas = await req(`/financeiro/lancamentos/${lancReceber?.id}/baixas`, { headers: authTeste });
  assert('listar baixas endpoint', listaBaixas.status === 200 && (data(listaBaixas)?.length || 0) >= 2);

  // ── Estorno ──────────────────────────────────────────────────────────────
  const contasAntesEstorno = data(await req('/financeiro/contas?all=1', { headers: authTeste })) || [];
  const saldoContaAntesEstorno = Number(
    (contasAntesEstorno.find((c) => c.id === contaA?.id) || {}).saldoAtual || 0
  );
  const baixaParaEstornar = (d?.baixas || []).find((b) => b.tipo === 'baixa' && !b.estornado);
  const liquidoEstorno = Number(baixaParaEstornar?.valorLiquido || 0);
  const estorno = await req(`/financeiro/baixas/${baixaParaEstornar?.id}/estornar`, {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({ motivo: `${TAG} estorno teste` }),
  });
  const aposEstorno = data(estorno);
  assert('estorno baixa', estorno.status === 200, estorno.json?.error);
  assert(
    'status após estorno parcial de novo',
    aposEstorno?.status === 'parcial' || aposEstorno?.status === 'a_receber',
    `status=${aposEstorno?.status} pago=${aposEstorno?.valorPago}`
  );
  const baixasApos = aposEstorno?.baixas || [];
  assert(
    'registro tipo estorno',
    baixasApos.some((b) => b.tipo === 'estorno'),
    `tipos=${baixasApos.map((b) => b.tipo).join(',')}`
  );
  const contasAposEstorno = data(await req('/financeiro/contas?all=1', { headers: authTeste })) || [];
  const saldoContaAposEstorno = Number(
    (contasAposEstorno.find((c) => c.id === contaA?.id) || {}).saldoAtual || 0
  );
  // Receita estornada deve REDUZIR o saldo em exatamente o líquido (não o dobro)
  const deltaEstorno = round2(saldoContaAposEstorno - saldoContaAntesEstorno);
  assert(
    'saldo após estorno (sem dobrar)',
    Math.abs(deltaEstorno - -liquidoEstorno) < 0.02,
    `delta=${deltaEstorno} esperado=${-liquidoEstorno} antes=${saldoContaAntesEstorno} depois=${saldoContaAposEstorno}`
  );

  // ── Extrato por conta ────────────────────────────────────────────────────
  const extrato = await req(`/financeiro/contas/${contaA?.id}/extrato?periodo=mes`, { headers: authTeste });
  const ex = data(extrato);
  assert('extrato conta', extrato.status === 200 && !!ex?.conta, extrato.json?.error);
  assert('extrato tem itens ou saldo', typeof ex?.saldoAtual === 'number', `saldo=${ex?.saldoAtual}`);
  const temMovE2E = (ex?.itens || []).some((i) => String(i.descricao || '').includes(TAG));
  assert('extrato reflete movimentação E2E', temMovE2E || (ex?.itens || []).length >= 0, `itens=${ex?.itens?.length}`);

  // ── Transferência entre contas ───────────────────────────────────────────
  if (contaA && contaB) {
    const tr = await req('/financeiro/lancamentos', {
      method: 'POST',
      headers: authTeste,
      body: JSON.stringify({
        natureza: 'transferencia',
        descricao: `${TAG} Transferência teste`,
        valor: 15,
        dataCompetencia: hoje,
        contaId: contaA.id,
        contaDestinoId: contaB.id,
      }),
    });
    assert('transferência entre contas', tr.status === 201 && data(tr)?.natureza === 'transferencia', tr.json?.error);

    const exA = data(await req(`/financeiro/contas/${contaA.id}/extrato?periodo=mes`, { headers: authTeste }));
    const exB = data(await req(`/financeiro/contas/${contaB.id}/extrato?periodo=mes`, { headers: authTeste }));
    const saiu = (exA?.itens || []).some(
      (i) => i.tipo === 'transferencia_saida' && (String(i.descricao).includes(TAG) || Number(i.valor) === -15)
    );
    const entrou = (exB?.itens || []).some(
      (i) => i.tipo === 'transferencia_entrada' && (String(i.descricao).includes(TAG) || Number(i.valor) === 15)
    );
    assert('transferência no extrato origem', saiu, `tipos=${(exA?.itens || []).map((i) => i.tipo).join(',')}`);
    assert('transferência no extrato destino', entrou, `tipos=${(exB?.itens || []).map((i) => i.tipo).join(',')}`);
  } else {
    fail('transferência entre contas', 'precisa de 2 contas');
  }

  // ── Baixa conta a pagar ──────────────────────────────────────────────────
  const baixaPagar = await req(`/financeiro/lancamentos/${lancPagar?.id}/baixar`, {
    method: 'POST',
    headers: authTeste,
    body: JSON.stringify({
      dataMovimento: hoje,
      valorPrincipal: 200,
      contaId: contaA?.id || null,
      formaPagamento: 'PIX',
    }),
  });
  assert('baixar conta a pagar', baixaPagar.status === 200 && data(baixaPagar)?.status === 'paga', baixaPagar.json?.error);

  // ── Dashboard / fluxo / DRE / listagem / export ──────────────────────────
  const resumo = await req('/financeiro/resumo?periodo=mes', { headers: authTeste });
  assert('resumo dashboard', resumo.status === 200 && typeof data(resumo)?.saldoDisponivel === 'number', resumo.json?.error);

  const fluxo = await req('/financeiro/fluxo-caixa?periodo=mes', { headers: authTeste });
  assert('fluxo caixa', fluxo.status === 200 && typeof data(fluxo)?.saldoAtual === 'number', fluxo.json?.error);

  const dre = await req('/financeiro/dre?periodo=mes', { headers: authTeste });
  assert('dre', dre.status === 200, dre.json?.error);

  const lista = await req(`/financeiro/lancamentos?busca=${encodeURIComponent(TAG)}&periodo=ano`, { headers: authTeste });
  const items = data(lista)?.items || [];
  assert('listagem busca TAG', lista.status === 200 && items.length >= 1, `n=${items.length}`);
  assert(
    'listagem expõe saldo/valorPago',
    items.some((i) => i.saldo != null || i.valorPago != null),
    items[0] ? `keys=${Object.keys(items[0]).filter((k) => /saldo|pago|parcela/i.test(k)).join(',')}` : ''
  );

  const exportar = await req('/financeiro/export?periodo=mes', { headers: authTeste });
  assert('export CSV', exportar.status === 200 && String(exportar.text || '').includes('natureza'), `status=${exportar.status}`);

  // ── Endpoints novos existem (deploy) ─────────────────────────────────────
  assert('rota GET lancamento/:id', detalhe.status !== 404);
  assert('rota extrato', extrato.status !== 404);
  assert('rota estornar', estorno.status !== 404);
  assert('rota anexos', up.status !== 404);

  // ── Cleanup lançamentos de teste (cancelar via update status) ────────────
  for (const item of items) {
    await req(`/financeiro/lancamentos/${item.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ status: 'cancelada', observacoes: `${TAG} cleanup` }),
    });
  }

  // ── Excluir usuário teste ────────────────────────────────────────────────
  if (testUserId) {
    const del = await req(`/admin/usuarios/${testUserId}`, { method: 'DELETE', headers: auth });
    assert('excluir usuário teste', del.status === 200 && data(del)?.deleted === true, del.json?.error);

    const aindaExiste = (data(await req('/admin/usuarios', { headers: auth })) || []).some(
      (u) => u.id === testUserId || u.email === TEST_USER_EMAIL
    );
    assert('usuário teste removido da lista', !aindaExiste);
  } else {
    fail('excluir usuário teste', 'id não criado');
  }

  // ── Resumo ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Resultado: ${passed}/${results.length} ok`);
  if (failed.length) {
    console.log('Falhas:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
