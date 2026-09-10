import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import {
  fimDiaBrasil,
  inicioDiaBrasil,
  resolverPeriodo,
  round2,
  statusDespesaEfetivo,
  statusReceitaEfetivo,
  ymdBrasil,
} from '../utils/periodo.js';

const SEED_CATEGORIAS: Array<{
  tipo: string;
  nome: string;
  grupoDre: string;
  subs: string[];
}> = [
  { tipo: 'receita', nome: 'Serviços', grupoDre: 'receita_bruta', subs: ['Elétrica', 'Hidráulica', 'Climatização', 'Outros'] },
  { tipo: 'receita', nome: 'Deduções', grupoDre: 'deducoes', subs: ['Estornos', 'Descontos'] },
  { tipo: 'custo_direto', nome: 'Prestadores', grupoDre: 'custo_direto', subs: ['Repasse'] },
  { tipo: 'custo_direto', nome: 'Materiais', grupoDre: 'custo_direto', subs: ['Material de serviço'] },
  { tipo: 'despesa_operacional', nome: 'Marketing', grupoDre: 'despesa_comercial', subs: ['Meta Ads', 'Google Ads', 'Outros'] },
  { tipo: 'despesa_operacional', nome: 'Comissões', grupoDre: 'despesa_comercial', subs: ['Parceiros', 'Equipe'] },
  { tipo: 'despesa_operacional', nome: 'Sistemas', grupoDre: 'despesa_administrativa', subs: ['Softwares'] },
  { tipo: 'despesa_operacional', nome: 'Administrativo', grupoDre: 'despesa_administrativa', subs: ['Contabilidade', 'Equipe', 'Estrutura'] },
  { tipo: 'despesa_financeira', nome: 'Financeiro', grupoDre: 'despesa_financeira', subs: ['Juros', 'Tarifas', 'Outros'] },
  { tipo: 'investimento', nome: 'Investimentos', grupoDre: 'investimento', subs: ['Equipamentos', 'Outros'] },
  { tipo: 'transferencia', nome: 'Transferências', grupoDre: 'transferencia', subs: ['Entre contas'] },
];

const SEED_CONTAS = [
  { nome: 'Conta Corrente', tipo: 'bancaria' },
  { nome: 'Conta Digital', tipo: 'digital' },
  { nome: 'Caixa', tipo: 'caixa' },
  { nome: 'Cartão', tipo: 'cartao' },
];

const SEED_CENTROS = ['Comercial/Marketing', 'Operação', 'Administrativo', 'Tecnologia'];

export async function garantirPlanoFinanceiroPadrao() {
  for (const c of SEED_CATEGORIAS) {
    const cat = await prisma.finCategoria.upsert({
      where: { tipo_nome: { tipo: c.tipo, nome: c.nome } },
      update: { grupoDre: c.grupoDre, ativo: true },
      create: { tipo: c.tipo, nome: c.nome, grupoDre: c.grupoDre },
    });
    for (let i = 0; i < c.subs.length; i++) {
      await prisma.finSubcategoria.upsert({
        where: { categoriaId_nome: { categoriaId: cat.id, nome: c.subs[i] } },
        update: { ativo: true, ordem: i },
        create: { categoriaId: cat.id, nome: c.subs[i], ordem: i },
      });
    }
  }
  for (const conta of SEED_CONTAS) {
    const exists = await prisma.finConta.findFirst({ where: { nome: conta.nome } });
    if (!exists) await prisma.finConta.create({ data: conta });
  }
  for (const nome of SEED_CENTROS) {
    await prisma.finCentroCusto.upsert({
      where: { nome },
      update: { ativo: true },
      create: { nome },
    });
  }
}

async function categoriaServicosPadrao() {
  await garantirPlanoFinanceiroPadrao();
  return prisma.finCategoria.findFirst({
    where: { tipo: 'receita', nome: 'Serviços' },
    include: { subcategorias: true },
  });
}

async function contaPadrao() {
  await garantirPlanoFinanceiroPadrao();
  return prisma.finConta.findFirst({ where: { ativo: true }, orderBy: { createdAt: 'asc' } });
}

export type LancamentoFiltros = {
  natureza?: string;
  status?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  clienteId?: string;
  fornecedor?: string;
  pedidoId?: string;
  ordemServicoId?: string;
  contaId?: string;
  centroCustoId?: string;
  de?: string;
  ate?: string;
  periodo?: string;
  campoData?: 'competencia' | 'vencimento' | 'movimento';
  busca?: string;
  page?: number;
  limit?: number;
};

function whereDatas(filtros: LancamentoFiltros) {
  let de = filtros.de;
  let ate = filtros.ate;
  if (filtros.periodo && !de && !ate) {
    const p = resolverPeriodo({ periodo: filtros.periodo });
    de = p.inicioYmd;
    ate = p.fimYmd;
  }
  const campo =
    filtros.campoData === 'vencimento'
      ? 'dataVencimento'
      : filtros.campoData === 'movimento'
        ? 'dataMovimento'
        : 'dataCompetencia';
  const range: { gte?: Date; lte?: Date } = {};
  if (de) range.gte = inicioDiaBrasil(de.slice(0, 10));
  if (ate) range.lte = fimDiaBrasil(ate.slice(0, 10));
  if (!range.gte && !range.lte) return {};
  return { [campo]: range };
}

export class FinanceiroService {
  async seedPadrao() {
    await garantirPlanoFinanceiroPadrao();
    return { ok: true };
  }

  // ── Categorias ────────────────────────────────────────────────────────────
  async listarCategorias(incluirInativos = false) {
    return prisma.finCategoria.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      include: {
        subcategorias: {
          where: incluirInativos ? undefined : { ativo: true },
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async salvarCategoria(data: {
    id?: string;
    tipo: string;
    nome: string;
    grupoDre?: string;
    ativo?: boolean;
    ordem?: number;
  }) {
    if (data.id) {
      return prisma.finCategoria.update({
        where: { id: data.id },
        data: {
          tipo: data.tipo,
          nome: data.nome,
          grupoDre: data.grupoDre,
          ativo: data.ativo ?? true,
          ordem: data.ordem ?? 0,
        },
      });
    }
    return prisma.finCategoria.create({
      data: {
        tipo: data.tipo,
        nome: data.nome,
        grupoDre: data.grupoDre,
        ativo: data.ativo ?? true,
        ordem: data.ordem ?? 0,
      },
    });
  }

  async salvarSubcategoria(data: {
    id?: string;
    categoriaId: string;
    nome: string;
    ativo?: boolean;
    ordem?: number;
  }) {
    if (data.id) {
      return prisma.finSubcategoria.update({
        where: { id: data.id },
        data: {
          categoriaId: data.categoriaId,
          nome: data.nome,
          ativo: data.ativo ?? true,
          ordem: data.ordem ?? 0,
        },
      });
    }
    return prisma.finSubcategoria.create({
      data: {
        categoriaId: data.categoriaId,
        nome: data.nome,
        ativo: data.ativo ?? true,
        ordem: data.ordem ?? 0,
      },
    });
  }

  // ── Contas / centros ──────────────────────────────────────────────────────
  async listarContas(incluirInativos = false) {
    return prisma.finConta.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async salvarConta(data: {
    id?: string;
    nome: string;
    tipo: string;
    saldoInicial?: number;
    ativo?: boolean;
  }) {
    if (data.id) {
      return prisma.finConta.update({
        where: { id: data.id },
        data: {
          nome: data.nome,
          tipo: data.tipo,
          saldoInicial: data.saldoInicial ?? 0,
          ativo: data.ativo ?? true,
        },
      });
    }
    return prisma.finConta.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        saldoInicial: data.saldoInicial ?? 0,
        ativo: data.ativo ?? true,
      },
    });
  }

  async listarCentrosCusto(incluirInativos = false) {
    return prisma.finCentroCusto.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async salvarCentroCusto(data: { id?: string; nome: string; ativo?: boolean }) {
    if (data.id) {
      return prisma.finCentroCusto.update({
        where: { id: data.id },
        data: { nome: data.nome, ativo: data.ativo ?? true },
      });
    }
    return prisma.finCentroCusto.create({
      data: { nome: data.nome, ativo: data.ativo ?? true },
    });
  }

  // ── Lançamentos ───────────────────────────────────────────────────────────
  async listarLancamentos(filtros: LancamentoFiltros = {}) {
    const page = filtros.page || 1;
    const limit = Math.min(filtros.limit || 50, 200);
    const where: Record<string, unknown> = {
      ...whereDatas(filtros),
    };
    if (filtros.natureza) where.natureza = filtros.natureza;
    if (filtros.status) where.status = filtros.status;
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
    if (filtros.subcategoriaId) where.subcategoriaId = filtros.subcategoriaId;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.pedidoId) where.pedidoId = filtros.pedidoId;
    if (filtros.ordemServicoId) where.ordemServicoId = filtros.ordemServicoId;
    if (filtros.contaId) where.contaId = filtros.contaId;
    if (filtros.centroCustoId) where.centroCustoId = filtros.centroCustoId;
    if (filtros.fornecedor) {
      where.fornecedorNome = { contains: filtros.fornecedor, mode: 'insensitive' };
    }
    if (filtros.busca) {
      where.OR = [
        { descricao: { contains: filtros.busca, mode: 'insensitive' } },
        { fornecedorNome: { contains: filtros.busca, mode: 'insensitive' } },
        { observacoes: { contains: filtros.busca, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.finLancamento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dataCompetencia: 'desc' },
        include: {
          categoria: true,
          subcategoria: true,
          conta: true,
          contaDestino: true,
          centroCusto: true,
          cliente: { select: { id: true, nome: true } },
          pedido: { select: { id: true, numero: true } },
          ordemServico: { select: { id: true, etapa: true } },
        },
      }),
      prisma.finLancamento.count({ where }),
    ]);

    const agora = new Date();
    return {
      items: items.map((l) => ({
        ...l,
        valor: toNumber(l.valor),
        statusEfetivo:
          l.natureza === 'receita'
            ? statusReceitaEfetivo(l.status, l.dataVencimento, agora)
            : l.natureza === 'despesa'
              ? statusDespesaEfetivo(l.status, l.dataVencimento, agora)
              : l.status,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async criarLancamento(data: {
    natureza: 'receita' | 'despesa' | 'transferencia';
    descricao: string;
    valor: number;
    dataCompetencia: string;
    dataVencimento?: string | null;
    dataMovimento?: string | null;
    categoriaId?: string | null;
    subcategoriaId?: string | null;
    centroCustoId?: string | null;
    clienteId?: string | null;
    fornecedorNome?: string | null;
    pedidoId?: string | null;
    ordemServicoId?: string | null;
    formaPagamento?: string | null;
    contaId?: string | null;
    contaDestinoId?: string | null;
    status?: string;
    anexoUrl?: string | null;
    observacoes?: string | null;
    recorrenciaId?: string | null;
    pagamentoId?: string | null;
  }) {
    if (data.natureza === 'transferencia') {
      if (!data.contaId || !data.contaDestinoId) {
        throw new Error('Transferência exige conta origem e destino');
      }
      if (data.contaId === data.contaDestinoId) {
        throw new Error('Contas de origem e destino devem ser diferentes');
      }
    }

    let status = data.status;
    if (!status) {
      if (data.natureza === 'receita') status = data.dataMovimento ? 'recebida' : 'a_receber';
      else if (data.natureza === 'despesa') status = data.dataMovimento ? 'paga' : 'a_pagar';
      else status = 'paga';
    }

    return prisma.finLancamento.create({
      data: {
        natureza: data.natureza,
        descricao: data.descricao,
        valor: data.valor,
        dataCompetencia: inicioDiaBrasil(data.dataCompetencia.slice(0, 10)),
        dataVencimento: data.dataVencimento
          ? inicioDiaBrasil(data.dataVencimento.slice(0, 10))
          : null,
        dataMovimento: data.dataMovimento
          ? inicioDiaBrasil(data.dataMovimento.slice(0, 10))
          : data.natureza === 'transferencia'
            ? inicioDiaBrasil(data.dataCompetencia.slice(0, 10))
            : null,
        categoriaId: data.categoriaId || null,
        subcategoriaId: data.subcategoriaId || null,
        centroCustoId: data.centroCustoId || null,
        clienteId: data.clienteId || null,
        fornecedorNome: data.fornecedorNome || null,
        pedidoId: data.pedidoId || null,
        ordemServicoId: data.ordemServicoId || null,
        formaPagamento: data.formaPagamento || null,
        contaId: data.contaId || null,
        contaDestinoId: data.contaDestinoId || null,
        status,
        anexoUrl: data.anexoUrl || null,
        observacoes: data.observacoes || null,
        recorrenciaId: data.recorrenciaId || null,
        pagamentoId: data.pagamentoId || null,
      },
      include: { categoria: true, subcategoria: true, conta: true, cliente: true },
    });
  }

  async atualizarLancamento(id: string, data: Record<string, unknown>) {
    const patch: Record<string, unknown> = { ...data };
    for (const k of ['dataCompetencia', 'dataVencimento', 'dataMovimento'] as const) {
      if (typeof patch[k] === 'string' && patch[k]) {
        patch[k] = inicioDiaBrasil(String(patch[k]).slice(0, 10));
      }
    }
    return prisma.finLancamento.update({
      where: { id },
      data: patch,
      include: { categoria: true, subcategoria: true, conta: true, cliente: true },
    });
  }

  async baixarLancamento(id: string, dataMovimento?: string, contaId?: string) {
    const l = await prisma.finLancamento.findUnique({ where: { id } });
    if (!l) throw new Error('Lançamento não encontrado');
    const mov = dataMovimento ? inicioDiaBrasil(dataMovimento.slice(0, 10)) : new Date();
    const status = l.natureza === 'receita' ? 'recebida' : l.natureza === 'despesa' ? 'paga' : l.status;
    return prisma.finLancamento.update({
      where: { id },
      data: {
        dataMovimento: mov,
        status,
        ...(contaId ? { contaId } : {}),
      },
    });
  }

  /** Gera receita financeira a partir de pagamento RECEIVED (idempotente via pagamentoId). */
  async gerarReceitaDePagamento(pagamentoId: string) {
    const existente = await prisma.finLancamento.findUnique({ where: { pagamentoId } });
    if (existente) return existente;

    const pag = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        pedido: { include: { ordemServico: true, solicitacao: { include: { servico: true } } } },
        cliente: true,
      },
    });
    if (!pag || pag.status !== 'RECEIVED') return null;

    const cat = await categoriaServicosPadrao();
    const conta = await contaPadrao();
    const servicoNome = pag.pedido?.solicitacao?.servico?.nome || pag.pedido?.descricao || 'Serviço';
    const sub =
      cat?.subcategorias.find((s) =>
        /climatiz|ar.?cond/i.test(servicoNome)
          ? s.nome === 'Climatização'
          : /hidr|torneira|vazamento/i.test(servicoNome)
            ? s.nome === 'Hidráulica'
            : /eletr|tomada/i.test(servicoNome)
              ? s.nome === 'Elétrica'
              : false
      ) || cat?.subcategorias.find((s) => s.nome === 'Outros');

    const dataMov = ymdBrasil(pag.paymentDate ?? pag.createdAt);
    const dataComp = dataMov;
    const dataVenc = ymdBrasil(pag.dueDate);

    return this.criarLancamento({
      natureza: 'receita',
      descricao: `Recebimento ${pag.pedido?.numero || pag.asaasId || pag.id} — ${servicoNome}`,
      valor: toNumber(pag.valor),
      dataCompetencia: dataComp,
      dataVencimento: dataVenc,
      dataMovimento: dataMov,
      categoriaId: cat?.id,
      subcategoriaId: sub?.id,
      clienteId: pag.clienteId,
      pedidoId: pag.pedidoId,
      ordemServicoId: pag.pedido?.ordemServico?.id,
      formaPagamento: pag.metodo,
      contaId: conta?.id,
      status: 'recebida',
      pagamentoId: pag.id,
      observacoes: 'Gerado automaticamente a partir do pagamento',
    });
  }

  // ── Recorrências ──────────────────────────────────────────────────────────
  async listarRecorrencias() {
    return prisma.finRecorrencia.findMany({
      include: { categoria: true, subcategoria: true, conta: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async salvarRecorrencia(data: {
    id?: string;
    descricao: string;
    natureza?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    centroCustoId?: string;
    fornecedorNome?: string;
    valor: number;
    diaDoMes: number;
    contaId?: string;
    formaPagamento?: string;
    ativo?: boolean;
  }) {
    const dia = Math.min(28, Math.max(1, data.diaDoMes));
    const hoje = ymdBrasil();
    const [y, m] = hoje.split('-').map(Number);
    let proxima = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (proxima < hoje) {
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      proxima = `${ny}-${String(nm).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }

    if (data.id) {
      return prisma.finRecorrencia.update({
        where: { id: data.id },
        data: {
          descricao: data.descricao,
          natureza: data.natureza || 'despesa',
          categoriaId: data.categoriaId || null,
          subcategoriaId: data.subcategoriaId || null,
          centroCustoId: data.centroCustoId || null,
          fornecedorNome: data.fornecedorNome || null,
          valor: data.valor,
          diaDoMes: dia,
          contaId: data.contaId || null,
          formaPagamento: data.formaPagamento || null,
          ativo: data.ativo ?? true,
        },
      });
    }

    return prisma.finRecorrencia.create({
      data: {
        descricao: data.descricao,
        natureza: data.natureza || 'despesa',
        categoriaId: data.categoriaId || null,
        subcategoriaId: data.subcategoriaId || null,
        centroCustoId: data.centroCustoId || null,
        fornecedorNome: data.fornecedorNome || null,
        valor: data.valor,
        diaDoMes: dia,
        contaId: data.contaId || null,
        formaPagamento: data.formaPagamento || null,
        ativo: data.ativo ?? true,
        proximaGeracao: inicioDiaBrasil(proxima),
      },
    });
  }

  /** Gera lançamentos pendentes de recorrências ativas até o mês corrente. */
  async processarRecorrencias(ateYmd?: string) {
    const limite = ateYmd || ymdBrasil();
    const recs = await prisma.finRecorrencia.findMany({ where: { ativo: true } });
    const gerados: string[] = [];

    for (const r of recs) {
      let prox = ymdBrasil(r.proximaGeracao);
      while (prox <= limite) {
        const existe = await prisma.finLancamento.findFirst({
          where: {
            recorrenciaId: r.id,
            dataCompetencia: inicioDiaBrasil(prox),
          },
        });
        if (!existe) {
          const created = await this.criarLancamento({
            natureza: (r.natureza as 'despesa' | 'receita') || 'despesa',
            descricao: r.descricao,
            valor: toNumber(r.valor),
            dataCompetencia: prox,
            dataVencimento: prox,
            categoriaId: r.categoriaId,
            subcategoriaId: r.subcategoriaId,
            centroCustoId: r.centroCustoId,
            fornecedorNome: r.fornecedorNome,
            contaId: r.contaId,
            formaPagamento: r.formaPagamento,
            status: r.natureza === 'receita' ? 'a_receber' : 'a_pagar',
            recorrenciaId: r.id,
          });
          gerados.push(created.id);
        }
        const [y, m] = prox.split('-').map(Number);
        const nm = m === 12 ? 1 : m + 1;
        const ny = m === 12 ? y + 1 : y;
        prox = `${ny}-${String(nm).padStart(2, '0')}-${String(r.diaDoMes).padStart(2, '0')}`;
      }
      await prisma.finRecorrencia.update({
        where: { id: r.id },
        data: { proximaGeracao: inicioDiaBrasil(prox) },
      });
    }
    return { gerados: gerados.length, ids: gerados };
  }

  // ── Fluxo de caixa (regime caixa = dataMovimento) ──────────────────────────
  async fluxoCaixa(params: { periodo?: string; de?: string; ate?: string }) {
    const { inicio, fim, inicioYmd, fimYmd, label } = resolverPeriodo(params);
    const contas = await prisma.finConta.findMany({ where: { ativo: true } });
    const saldoInicialContas = contas.reduce((s, c) => s + toNumber(c.saldoInicial), 0);

    const movAntes = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        dataMovimento: { lt: inicio, not: null },
      },
      select: { natureza: true, valor: true },
    });
    let saldoInicial = saldoInicialContas;
    for (const m of movAntes) {
      const v = toNumber(m.valor);
      saldoInicial += m.natureza === 'receita' ? v : -v;
    }

    const noPeriodo = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        dataMovimento: { gte: inicio, lte: fim },
      },
      select: { natureza: true, valor: true, dataMovimento: true },
    });

    let entradas = 0;
    let saidas = 0;
    for (const m of noPeriodo) {
      const v = toNumber(m.valor);
      if (m.natureza === 'receita') entradas += v;
      else saidas += v;
    }

    const aReceber = await prisma.finLancamento.findMany({
      where: {
        natureza: 'receita',
        status: { in: ['prevista', 'a_receber', 'vencida'] },
        OR: [
          { dataVencimento: { gte: inicio, lte: fim } },
          { dataVencimento: null, dataCompetencia: { gte: inicio, lte: fim } },
        ],
      },
      select: { valor: true },
    });
    const aPagar = await prisma.finLancamento.findMany({
      where: {
        natureza: 'despesa',
        status: { in: ['prevista', 'a_pagar', 'vencida'] },
        OR: [
          { dataVencimento: { gte: inicio, lte: fim } },
          { dataVencimento: null, dataCompetencia: { gte: inicio, lte: fim } },
        ],
      },
      select: { valor: true },
    });

    const projReceber = aReceber.reduce((s, x) => s + toNumber(x.valor), 0);
    const projPagar = aPagar.reduce((s, x) => s + toNumber(x.valor), 0);

    return {
      periodo: { inicioYmd, fimYmd, label },
      saldoInicial: round2(saldoInicial),
      entradas: round2(entradas),
      saidas: round2(saidas),
      saldoAtual: round2(saldoInicial + entradas - saidas),
      projecaoReceber: round2(projReceber),
      projecaoPagar: round2(projPagar),
      saldoProjetado: round2(saldoInicial + entradas - saidas + projReceber - projPagar),
    };
  }

  // ── DRE gerencial (regime competência) ────────────────────────────────────
  async dre(params: { periodo?: string; de?: string; ate?: string }) {
    const { inicio, fim, inicioYmd, fimYmd, label } = resolverPeriodo(params);
    const lancs = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { notIn: ['cancelada'] },
        dataCompetencia: { gte: inicio, lte: fim },
      },
      include: { categoria: true, subcategoria: true },
    });

    const sumGrupo = (grupo: string, natureza?: string) =>
      lancs
        .filter((l) => {
          if (natureza && l.natureza !== natureza) return false;
          if (l.status === 'estornada' && grupo !== 'deducoes') return false;
          return (l.categoria?.grupoDre || '') === grupo;
        })
        .reduce((s, l) => s + toNumber(l.valor), 0);

    const receitaBruta = sumGrupo('receita_bruta', 'receita');
    const deducoes =
      sumGrupo('deducoes') +
      lancs
        .filter((l) => l.natureza === 'receita' && l.status === 'estornada')
        .reduce((s, l) => s + toNumber(l.valor), 0);
    const receitaLiquida = receitaBruta - deducoes;
    const custosDiretos = sumGrupo('custo_direto', 'despesa');
    const margemContribuicao = receitaLiquida - custosDiretos;
    const despesasComerciais = sumGrupo('despesa_comercial', 'despesa');
    const despesasAdmin = sumGrupo('despesa_administrativa', 'despesa');
    const despesasFinanceiras = sumGrupo('despesa_financeira', 'despesa');
    const resultadoOperacional =
      margemContribuicao - despesasComerciais - despesasAdmin - despesasFinanceiras;

    const detalhePorCategoria = (grupo: string) => {
      const map = new Map<string, number>();
      for (const l of lancs) {
        if ((l.categoria?.grupoDre || '') !== grupo) continue;
        if (l.status === 'cancelada') continue;
        const nome = l.subcategoria?.nome || l.categoria?.nome || 'Outros';
        map.set(nome, (map.get(nome) || 0) + toNumber(l.valor));
      }
      return [...map.entries()].map(([nome, valor]) => ({ nome, valor: round2(valor) }));
    };

    const temLancamentos = lancs.length > 0;

    return {
      periodo: { inicioYmd, fimYmd, label },
      temDadosReais: temLancamentos,
      receitaBruta: round2(receitaBruta),
      deducoes: round2(deducoes),
      receitaLiquida: round2(receitaLiquida),
      custosDiretos: round2(custosDiretos),
      custosDiretosDetalhe: detalhePorCategoria('custo_direto'),
      margemContribuicao: round2(margemContribuicao),
      margemContribuicaoPct: receitaLiquida > 0 ? round2((margemContribuicao / receitaLiquida) * 100) : 0,
      despesasComerciais: round2(despesasComerciais),
      despesasComerciaisDetalhe: detalhePorCategoria('despesa_comercial'),
      despesasAdministrativas: round2(despesasAdmin),
      despesasAdministrativasDetalhe: detalhePorCategoria('despesa_administrativa'),
      despesasFinanceiras: round2(despesasFinanceiras),
      resultadoOperacional: round2(resultadoOperacional),
    };
  }

  async resumoDashboardFinanceiro(params: { periodo?: string; de?: string; ate?: string }) {
    const fluxo = await this.fluxoCaixa(params);
    const dre = await this.dre(params);
    const agora = new Date();

    const aReceber = await prisma.finLancamento.findMany({
      where: { natureza: 'receita', status: { in: ['prevista', 'a_receber', 'vencida'] } },
      select: { valor: true, status: true, dataVencimento: true },
    });
    const aPagar = await prisma.finLancamento.findMany({
      where: { natureza: 'despesa', status: { in: ['prevista', 'a_pagar', 'vencida'] } },
      select: { valor: true, status: true, dataVencimento: true },
    });

    let totalAReceber = 0;
    let totalAPagar = 0;
    let vencidos = 0;
    for (const r of aReceber) {
      const st = statusReceitaEfetivo(r.status, r.dataVencimento, agora);
      totalAReceber += toNumber(r.valor);
      if (st === 'vencida') vencidos += toNumber(r.valor);
    }
    for (const d of aPagar) {
      const st = statusDespesaEfetivo(d.status, d.dataVencimento, agora);
      totalAPagar += toNumber(d.valor);
      if (st === 'vencida') vencidos += toNumber(d.valor);
    }

    const { inicio, fim } = resolverPeriodo(params);
    const movPeriodo = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        dataMovimento: { gte: inicio, lte: fim },
      },
      include: { categoria: true },
    });

    const serieMap = new Map<string, { receitas: number; despesas: number }>();
    const despCat = new Map<string, number>();
    for (const m of movPeriodo) {
      const key = ymdBrasil(m.dataMovimento!);
      if (!serieMap.has(key)) serieMap.set(key, { receitas: 0, despesas: 0 });
      const row = serieMap.get(key)!;
      const v = toNumber(m.valor);
      if (m.natureza === 'receita') row.receitas += v;
      else {
        row.despesas += v;
        const cat = m.categoria?.nome || 'Outros';
        despCat.set(cat, (despCat.get(cat) || 0) + v);
      }
    }

    return {
      saldoDisponivel: fluxo.saldoAtual,
      aReceber: round2(totalAReceber),
      aPagar: round2(totalAPagar),
      vencidos: round2(vencidos),
      receitasRealizadas: fluxo.entradas,
      despesasRealizadas: fluxo.saidas,
      margemContribuicao: dre.margemContribuicao,
      margemContribuicaoPct: dre.margemContribuicaoPct,
      resultadoOperacional: dre.resultadoOperacional,
      temDadosReais: dre.temDadosReais,
      receitasXDespesas: [...serieMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dia, v]) => ({ dia, ...v })),
      despesasPorCategoria: [...despCat.entries()].map(([categoria, valor]) => ({
        categoria,
        valor: round2(valor),
      })),
    };
  }

  async exportarCsv(filtros: LancamentoFiltros = {}) {
    const { items } = await this.listarLancamentos({ ...filtros, page: 1, limit: 5000 });
    const header = [
      'natureza',
      'descricao',
      'categoria',
      'subcategoria',
      'cliente',
      'fornecedor',
      'pedido',
      'valor',
      'competencia',
      'vencimento',
      'movimento',
      'conta',
      'status',
      'centro_custo',
    ];
    const rows = items.map((l) =>
      [
        l.natureza,
        l.descricao,
        l.categoria?.nome || '',
        l.subcategoria?.nome || '',
        l.cliente?.nome || '',
        l.fornecedorNome || '',
        l.pedido?.numero || '',
        String(l.valor),
        l.dataCompetencia ? ymdBrasil(l.dataCompetencia) : '',
        l.dataVencimento ? ymdBrasil(l.dataVencimento) : '',
        l.dataMovimento ? ymdBrasil(l.dataMovimento) : '',
        l.conta?.nome || '',
        l.statusEfetivo || l.status,
        l.centroCusto?.nome || '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [header.join(','), ...rows].join('\n');
  }
}

export const financeiroService = new FinanceiroService();
