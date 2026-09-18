import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import {
  addMesesYmd,
  fimDiaBrasil,
  inicioDiaBrasil,
  resolverPeriodo,
  round2,
  statusDespesaEfetivo,
  statusReceitaEfetivo,
  ymdBrasil,
} from '../utils/periodo.js';
import { calcularDreGerencial, dreDrilldown } from './dre-gerencial.js';

const SEED_CATEGORIAS: Array<{
  tipo: string;
  nome: string;
  grupoDre: string;
  subs: string[];
}> = [
  {
    tipo: 'receita',
    nome: 'Serviços',
    grupoDre: 'receita_bruta',
    subs: ['Elétrica', 'Hidráulica', 'Climatização', 'Materiais', 'Outros'],
  },
  {
    tipo: 'receita',
    nome: 'Deduções',
    grupoDre: 'deducoes',
    subs: ['Impostos sobre faturamento', 'Cashback', 'Descontos', 'Estornos', 'Outras deduções'],
  },
  {
    tipo: 'custo_direto',
    nome: 'Prestadores',
    grupoDre: 'custo_direto',
    subs: ['Repasse', 'Logística', 'Taxas de execução', 'Outros custos variáveis'],
  },
  {
    tipo: 'custo_direto',
    nome: 'Materiais',
    grupoDre: 'custo_direto',
    subs: ['Material de serviço'],
  },
  {
    tipo: 'despesa_operacional',
    nome: 'Marketing',
    grupoDre: 'despesa_comercial',
    subs: ['Google Ads', 'Meta Ads', 'Outras mídias', 'Ferramentas comerciais', 'Outras despesas comerciais'],
  },
  {
    tipo: 'despesa_operacional',
    nome: 'Comissões',
    grupoDre: 'despesa_comercial',
    subs: ['Parceiros', 'Equipe', 'Comissões comerciais'],
  },
  {
    tipo: 'despesa_operacional',
    nome: 'Sistemas',
    grupoDre: 'despesa_administrativa',
    subs: ['Softwares', 'Telefonia/internet'],
  },
  {
    tipo: 'despesa_operacional',
    nome: 'Administrativo',
    grupoDre: 'despesa_administrativa',
    subs: [
      'Pró-labore',
      'Salários administrativos',
      'Contabilidade',
      'Jurídico',
      'Aluguel',
      'Equipe',
      'Estrutura',
      'Outras despesas administrativas',
    ],
  },
  {
    tipo: 'despesa_financeira',
    nome: 'Financeiro',
    grupoDre: 'despesa_financeira',
    subs: ['Taxas de cartão', 'Taxas de gateway', 'Tarifas bancárias', 'Juros', 'Outras despesas financeiras'],
  },
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
  async saldoConta(contaId: string, ate?: Date) {
    const conta = await prisma.finConta.findUnique({ where: { id: contaId } });
    if (!conta) throw new Error('Conta não encontrada');

    const ateFiltro = ate ? { lte: ate } : undefined;

    const baixas = await prisma.finBaixa.findMany({
      where: {
        contaId,
        // Apenas baixas ativas: estorno marca a original como estornada e ela sai do saldo.
        // Não somar tipo=estorno (senão o valor seria removido duas vezes).
        tipo: 'baixa',
        estornado: false,
        lancamento: { status: { notIn: ['cancelada', 'estornada'] } },
        ...(ateFiltro ? { dataMovimento: ateFiltro } : {}),
      },
      include: { lancamento: { select: { natureza: true } } },
    });

    let saldo = toNumber(conta.saldoInicial);
    for (const b of baixas) {
      const v = toNumber(b.valorLiquido);
      const nat = b.lancamento.natureza;
      if (nat === 'receita') saldo += v;
      else if (nat === 'despesa') saldo -= v;
    }

    const transferencias = await prisma.finLancamento.findMany({
      where: {
        natureza: 'transferencia',
        status: { notIn: ['cancelada', 'estornada'] },
        OR: [{ contaId }, { contaDestinoId: contaId }],
        ...(ateFiltro ? { dataMovimento: ateFiltro } : {}),
      },
      select: { valor: true, contaId: true, contaDestinoId: true },
    });
    for (const t of transferencias) {
      const v = toNumber(t.valor);
      if (t.contaId === contaId) saldo -= v;
      if (t.contaDestinoId === contaId) saldo += v;
    }

    // Lançamentos liquidados sem baixa registrada (legado / liquidação na criação)
    const liquidadosSemBaixa = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        contaId,
        baixas: { none: {} },
        ...(ateFiltro ? { dataMovimento: ateFiltro } : {}),
      },
      select: { natureza: true, valor: true, valorPago: true },
    });
    for (const l of liquidadosSemBaixa) {
      const v = toNumber(l.valorPago) || toNumber(l.valor);
      if (l.natureza === 'receita') saldo += v;
      else saldo -= v;
    }

    return round2(saldo);
  }

  async listarContas(incluirInativos = false) {
    const contas = await prisma.finConta.findMany({
      where: incluirInativos ? undefined : { ativo: true },
      orderBy: { nome: 'asc' },
    });
    return Promise.all(
      contas.map(async (c) => ({
        ...c,
        saldoInicial: toNumber(c.saldoInicial),
        saldoAtual: await this.saldoConta(c.id),
      }))
    );
  }

  async extratoConta(
    contaId: string,
    params: { periodo?: string; de?: string; ate?: string } = {}
  ) {
    const conta = await prisma.finConta.findUnique({ where: { id: contaId } });
    if (!conta) throw new Error('Conta não encontrada');

    const { inicio, fim, inicioYmd, fimYmd, label } = resolverPeriodo(params);
    const saldoAbertura = await this.saldoConta(contaId, new Date(inicio.getTime() - 1));

    type Mov = {
      id: string;
      data: string;
      tipo: string;
      descricao: string;
      valor: number;
      lancamentoId?: string;
      baixaId?: string;
      formaPagamento?: string | null;
      anexoUrl?: string | null;
    };
    const movs: Mov[] = [];

    const baixas = await prisma.finBaixa.findMany({
      where: {
        contaId,
        // Inclui baixas estornadas + registros de estorno para o extrato fechar (entrada + estorno = 0)
        tipo: { in: ['baixa', 'estorno'] },
        lancamento: { status: { notIn: ['cancelada', 'estornada'] } },
        dataMovimento: { gte: inicio, lte: fim },
      },
      include: {
        lancamento: { select: { id: true, descricao: true, natureza: true } },
      },
      orderBy: { dataMovimento: 'asc' },
    });
    for (const b of baixas) {
      const nat = b.lancamento.natureza;
      let sinal = 0;
      if (b.tipo === 'estorno') {
        sinal = nat === 'receita' ? -1 : nat === 'despesa' ? 1 : 0;
      } else {
        sinal = nat === 'receita' ? 1 : nat === 'despesa' ? -1 : 0;
      }
      if (!sinal) continue;
      const baseDesc =
        b.tipo === 'estorno'
          ? `Estorno: ${b.lancamento.descricao}`
          : b.estornado
            ? `${b.lancamento.descricao} (estornada)`
            : b.lancamento.descricao;
      movs.push({
        id: `baixa-${b.id}`,
        data: ymdBrasil(b.dataMovimento),
        tipo: b.tipo === 'estorno' ? 'estorno' : nat === 'receita' ? 'entrada' : 'saida',
        descricao: baseDesc,
        valor: round2(sinal * toNumber(b.valorLiquido)),
        lancamentoId: b.lancamentoId,
        baixaId: b.id,
        formaPagamento: b.formaPagamento,
        anexoUrl: b.anexoUrl,
      });
    }

    const transferencias = await prisma.finLancamento.findMany({
      where: {
        natureza: 'transferencia',
        status: { notIn: ['cancelada', 'estornada'] },
        OR: [{ contaId }, { contaDestinoId: contaId }],
        dataMovimento: { gte: inicio, lte: fim },
      },
      include: { conta: true, contaDestino: true },
      orderBy: { dataMovimento: 'asc' },
    });
    for (const t of transferencias) {
      const v = toNumber(t.valor);
      if (t.contaId === contaId) {
        movs.push({
          id: `tr-out-${t.id}`,
          data: ymdBrasil(t.dataMovimento || t.dataCompetencia),
          tipo: 'transferencia_saida',
          descricao: `${t.descricao} → ${t.contaDestino?.nome || 'conta'}`,
          valor: round2(-v),
          lancamentoId: t.id,
          formaPagamento: t.formaPagamento,
          anexoUrl: t.anexoUrl,
        });
      }
      if (t.contaDestinoId === contaId) {
        movs.push({
          id: `tr-in-${t.id}`,
          data: ymdBrasil(t.dataMovimento || t.dataCompetencia),
          tipo: 'transferencia_entrada',
          descricao: `${t.descricao} ← ${t.conta?.nome || 'conta'}`,
          valor: round2(v),
          lancamentoId: t.id,
          formaPagamento: t.formaPagamento,
          anexoUrl: t.anexoUrl,
        });
      }
    }

    const liquidadosSemBaixa = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        contaId,
        baixas: { none: {} },
        dataMovimento: { gte: inicio, lte: fim },
      },
      orderBy: { dataMovimento: 'asc' },
    });
    for (const l of liquidadosSemBaixa) {
      const v = toNumber(l.valorPago) || toNumber(l.valor);
      movs.push({
        id: `lanc-${l.id}`,
        data: ymdBrasil(l.dataMovimento || l.dataCompetencia),
        tipo: l.natureza === 'receita' ? 'entrada' : 'saida',
        descricao: l.descricao,
        valor: round2(l.natureza === 'receita' ? v : -v),
        lancamentoId: l.id,
        formaPagamento: l.formaPagamento,
        anexoUrl: l.anexoUrl,
      });
    }

    movs.sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));

    let running = saldoAbertura;
    const itens = movs.map((m) => {
      running = round2(running + m.valor);
      return { ...m, saldoApos: running };
    });

    return {
      conta: { id: conta.id, nome: conta.nome, tipo: conta.tipo },
      periodo: { inicioYmd, fimYmd, label },
      saldoAbertura: round2(saldoAbertura),
      saldoAtual: running,
      entradas: round2(itens.filter((i) => i.valor > 0).reduce((s, i) => s + i.valor, 0)),
      saidas: round2(itens.filter((i) => i.valor < 0).reduce((s, i) => s + Math.abs(i.valor), 0)),
      itens,
    };
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
      items: items.map((l) => {
        const valor = toNumber(l.valor);
        const valorPago = toNumber((l as { valorPago?: unknown }).valorPago);
        const saldo = round2(Math.max(0, valor - valorPago));
        return {
          ...l,
          valor,
          valorPago,
          saldo,
          statusEfetivo:
            l.natureza === 'receita'
              ? statusReceitaEfetivo(l.status, l.dataVencimento, agora)
              : l.natureza === 'despesa'
                ? statusDespesaEfetivo(l.status, l.dataVencimento, agora)
                : l.status,
        };
      }),
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
    /** Quantidade de parcelas (1 = único). Só para receita/despesa. */
    parcelas?: number;
  }) {
    if (data.natureza === 'transferencia') {
      if (!data.contaId || !data.contaDestinoId) {
        throw new Error('Transferência exige conta origem e destino');
      }
      if (data.contaId === data.contaDestinoId) {
        throw new Error('Contas de origem e destino devem ser diferentes');
      }
    }

    const nParcelas = Math.max(1, Math.min(60, Math.floor(Number(data.parcelas) || 1)));
    if (nParcelas > 1 && data.natureza === 'transferencia') {
      throw new Error('Transferência não pode ser parcelada');
    }
    if (!(data.valor > 0)) throw new Error('Valor deve ser positivo');

    const criarUm = async (opts: {
      descricao: string;
      valor: number;
      dataCompetencia: string;
      dataVencimento?: string | null;
      parcelaNumero?: number | null;
      parcelaTotal?: number | null;
      grupoParcelasId?: string | null;
    }) => {
      let status = data.status;
      if (!status) {
        if (data.natureza === 'receita') status = data.dataMovimento ? 'recebida' : 'a_receber';
        else if (data.natureza === 'despesa') status = data.dataMovimento ? 'paga' : 'a_pagar';
        else status = 'paga';
      }
      const liquidado = status === 'recebida' || status === 'paga';
      return prisma.finLancamento.create({
        data: {
          natureza: data.natureza,
          descricao: opts.descricao,
          valor: opts.valor,
          valorPago: liquidado ? opts.valor : 0,
          dataCompetencia: inicioDiaBrasil(opts.dataCompetencia.slice(0, 10)),
          dataVencimento: opts.dataVencimento
            ? inicioDiaBrasil(opts.dataVencimento.slice(0, 10))
            : null,
          dataMovimento: data.dataMovimento
            ? inicioDiaBrasil(data.dataMovimento.slice(0, 10))
            : data.natureza === 'transferencia'
              ? inicioDiaBrasil(opts.dataCompetencia.slice(0, 10))
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
          parcelaNumero: opts.parcelaNumero ?? null,
          parcelaTotal: opts.parcelaTotal ?? null,
          grupoParcelasId: opts.grupoParcelasId ?? null,
          historico: [
            {
              em: new Date().toISOString(),
              acao: nParcelas > 1 ? 'criado_parcela' : 'criado',
              status,
              valor: opts.valor,
              parcela: opts.parcelaNumero || null,
              parcelaTotal: opts.parcelaTotal || null,
            },
          ] as Prisma.InputJsonValue,
        },
        include: { categoria: true, subcategoria: true, conta: true, cliente: true },
      });
    };

    if (nParcelas === 1) {
      return criarUm({
        descricao: data.descricao,
        valor: round2(data.valor),
        dataCompetencia: data.dataCompetencia,
        dataVencimento: data.dataVencimento,
      });
    }

    const grupoId = randomUUID();
    const baseComp = data.dataCompetencia.slice(0, 10);
    const baseVenc = (data.dataVencimento || data.dataCompetencia).slice(0, 10);
    const valorBase = round2(data.valor / nParcelas);
    const criado = [];
    let acumulado = 0;
    for (let i = 1; i <= nParcelas; i++) {
      const valor =
        i === nParcelas ? round2(data.valor - acumulado) : valorBase;
      acumulado = round2(acumulado + valor);
      const offset = i - 1;
      criado.push(
        await criarUm({
          descricao: `${data.descricao} (${i}/${nParcelas})`,
          valor,
          dataCompetencia: addMesesYmd(baseComp, offset),
          dataVencimento: addMesesYmd(baseVenc, offset),
          parcelaNumero: i,
          parcelaTotal: nParcelas,
          grupoParcelasId: grupoId,
        })
      );
    }
    return { grupoParcelasId: grupoId, parcelas: criado, total: criado.length };
  }

  async atualizarLancamento(id: string, data: Record<string, unknown>) {
    const patch: Record<string, unknown> = { ...data };
    for (const k of ['dataCompetencia', 'dataVencimento', 'dataMovimento'] as const) {
      if (typeof patch[k] === 'string' && patch[k]) {
        patch[k] = inicioDiaBrasil(String(patch[k]).slice(0, 10));
      }
    }
    const historicoEvento = {
      em: new Date().toISOString(),
      acao: 'atualizado',
      campos: Object.keys(data),
    };
    const atual = await prisma.finLancamento.findUnique({ where: { id } });
    if (!atual) throw new Error('Lançamento não encontrado');
    const hist = Array.isArray(atual.historico) ? (atual.historico as object[]) : [];
    return prisma.finLancamento.update({
      where: { id },
      data: {
        ...patch,
        historico: [...hist, historicoEvento] as Prisma.InputJsonValue,
      },
      include: { categoria: true, subcategoria: true, conta: true, cliente: true },
    });
  }

  /** Remove o lançamento e suas baixas (cascade). Ajusta o saldo das contas automaticamente. */
  async excluirLancamento(id: string, usuarioId?: string) {
    const l = await prisma.finLancamento.findUnique({
      where: { id },
      include: { baixas: true },
    });
    if (!l) throw new Error('Lançamento não encontrado');

    await prisma.finLancamento.delete({ where: { id } });
    return {
      id,
      deleted: true,
      descricao: l.descricao,
      baixasRemovidas: l.baixas.length,
      usuarioId: usuarioId || null,
    };
  }

  async obterLancamento(id: string) {
    const l = await prisma.finLancamento.findUnique({
      where: { id },
      include: {
        categoria: true,
        subcategoria: true,
        conta: true,
        contaDestino: true,
        centroCusto: true,
        cliente: { select: { id: true, nome: true } },
        pedido: { select: { id: true, numero: true } },
        baixas: { orderBy: { createdAt: 'asc' }, include: { conta: true } },
      },
    });
    if (!l) throw new Error('Lançamento não encontrado');
    const valor = toNumber(l.valor);
    const valorPago = toNumber(l.valorPago);
    return {
      ...l,
      valor,
      valorPago,
      saldo: round2(Math.max(0, valor - valorPago)),
      statusEfetivo:
        l.natureza === 'receita'
          ? statusReceitaEfetivo(l.status, l.dataVencimento)
          : l.natureza === 'despesa'
            ? statusDespesaEfetivo(l.status, l.dataVencimento)
            : l.status,
    };
  }

  async baixarLancamento(
    id: string,
    input: {
      dataMovimento?: string;
      contaId?: string;
      valorPrincipal?: number;
      juros?: number;
      multa?: number;
      desconto?: number;
      taxa?: number;
      formaPagamento?: string;
      observacoes?: string;
      anexoUrl?: string;
      usuarioId?: string;
    } = {}
  ) {
    const l = await prisma.finLancamento.findUnique({
      where: { id },
      include: { baixas: { where: { estornado: false } } },
    });
    if (!l) throw new Error('Lançamento não encontrado');
    if (['cancelada', 'estornada'].includes(l.status)) {
      throw new Error('Lançamento cancelado/estornado não pode ser baixado');
    }
    if (['recebida', 'paga'].includes(l.status)) {
      throw new Error('Lançamento já está liquidado');
    }

    const valorOriginal = toNumber(l.valor);
    const jaPago = toNumber(l.valorPago);
    const saldo = round2(Math.max(0, valorOriginal - jaPago));
    if (saldo <= 0) throw new Error('Não há saldo em aberto');

    const juros = Math.max(0, Number(input.juros) || 0);
    const multa = Math.max(0, Number(input.multa) || 0);
    const desconto = Math.max(0, Number(input.desconto) || 0);
    const taxa = Math.max(0, Number(input.taxa) || 0);
    let principal = input.valorPrincipal != null ? Number(input.valorPrincipal) : saldo;
    if (!(principal > 0)) throw new Error('Informe o valor do pagamento');
    principal = round2(Math.min(principal, saldo));

    const valorLiquido = round2(principal + juros + multa - desconto - taxa);
    if (valorLiquido < 0) throw new Error('Valor líquido inválido');

    const mov = input.dataMovimento
      ? inicioDiaBrasil(input.dataMovimento.slice(0, 10))
      : new Date();

    const novoPago = round2(jaPago + principal);
    const liquidado = novoPago + 0.001 >= valorOriginal;
    const status = liquidado
      ? l.natureza === 'receita'
        ? 'recebida'
        : 'paga'
      : 'parcial';

    const historicoAtual = Array.isArray(l.historico) ? (l.historico as object[]) : [];
    const evento = {
      em: new Date().toISOString(),
      acao: liquidado ? 'baixa_total' : 'baixa_parcial',
      usuarioId: input.usuarioId || null,
      dataMovimento: ymdBrasil(mov),
      valorPrincipal: principal,
      juros,
      multa,
      desconto,
      taxa,
      valorLiquido,
      saldoApos: round2(Math.max(0, valorOriginal - novoPago)),
    };

    const [baixa] = await prisma.$transaction([
      prisma.finBaixa.create({
        data: {
          lancamentoId: id,
          tipo: 'baixa',
          dataMovimento: mov,
          valorPrincipal: principal,
          juros,
          multa,
          desconto,
          taxa,
          valorLiquido,
          contaId: input.contaId || l.contaId || null,
          formaPagamento: input.formaPagamento || l.formaPagamento || null,
          anexoUrl: input.anexoUrl || null,
          observacoes: input.observacoes || null,
          usuarioId: input.usuarioId || null,
        },
      }),
      prisma.finLancamento.update({
        where: { id },
        data: {
          valorPago: novoPago,
          jurosPago: round2(toNumber(l.jurosPago) + juros),
          multaPaga: round2(toNumber(l.multaPaga) + multa),
          descontoConcedido: round2(toNumber(l.descontoConcedido) + desconto),
          taxaPaga: round2(toNumber(l.taxaPaga) + taxa),
          dataMovimento: mov,
          status,
          ...(input.contaId ? { contaId: input.contaId } : {}),
          ...(input.formaPagamento ? { formaPagamento: input.formaPagamento } : {}),
          historico: [...historicoAtual, evento] as Prisma.InputJsonValue,
        },
      }),
    ]);

    return prisma.finLancamento.findUnique({
      where: { id },
      include: {
        categoria: true,
        subcategoria: true,
        conta: true,
        cliente: true,
        baixas: { orderBy: { createdAt: 'asc' }, include: { conta: true } },
      },
    }).then((row) => ({ ...row, baixa }));
  }

  async listarBaixas(lancamentoId: string) {
    return prisma.finBaixa.findMany({
      where: { lancamentoId },
      include: { conta: true },
      orderBy: { dataMovimento: 'asc' },
    });
  }

  async estornarBaixa(
    baixaId: string,
    input: { motivo?: string; usuarioId?: string; dataMovimento?: string } = {}
  ) {
    const baixa = await prisma.finBaixa.findUnique({
      where: { id: baixaId },
      include: { lancamento: true },
    });
    if (!baixa) throw new Error('Baixa não encontrada');
    if (baixa.estornado) throw new Error('Baixa já foi estornada');
    if (baixa.tipo === 'estorno') throw new Error('Não é possível estornar um estorno');

    const l = baixa.lancamento;
    const principal = toNumber(baixa.valorPrincipal);
    const juros = toNumber(baixa.juros);
    const multa = toNumber(baixa.multa);
    const desconto = toNumber(baixa.desconto);
    const taxa = toNumber(baixa.taxa);
    const liquido = toNumber(baixa.valorLiquido);

    const novoPago = round2(Math.max(0, toNumber(l.valorPago) - principal));
    const valorOriginal = toNumber(l.valor);
    let status: string;
    if (novoPago <= 0.001) {
      status = l.natureza === 'receita' ? 'a_receber' : 'a_pagar';
    } else if (novoPago + 0.001 < valorOriginal) {
      status = 'parcial';
    } else {
      status = l.natureza === 'receita' ? 'recebida' : 'paga';
    }

    const mov = input.dataMovimento
      ? inicioDiaBrasil(input.dataMovimento.slice(0, 10))
      : new Date();

    const hist = Array.isArray(l.historico) ? (l.historico as object[]) : [];
    const evento = {
      em: new Date().toISOString(),
      acao: 'estorno_baixa',
      usuarioId: input.usuarioId || null,
      baixaId,
      motivo: input.motivo || null,
      valorPrincipal: principal,
      valorLiquido: liquido,
      saldoApos: round2(Math.max(0, valorOriginal - novoPago)),
    };

    const [, estorno] = await prisma.$transaction([
      prisma.finBaixa.update({
        where: { id: baixaId },
        data: { estornado: true },
      }),
      prisma.finBaixa.create({
        data: {
          lancamentoId: l.id,
          tipo: 'estorno',
          dataMovimento: mov,
          valorPrincipal: principal,
          juros,
          multa,
          desconto,
          taxa,
          valorLiquido: liquido,
          contaId: baixa.contaId,
          formaPagamento: baixa.formaPagamento,
          observacoes: input.motivo || `Estorno da baixa ${baixaId.slice(0, 8)}`,
          usuarioId: input.usuarioId || null,
          baixaOrigemId: baixaId,
          estornado: false,
        },
      }),
      prisma.finLancamento.update({
        where: { id: l.id },
        data: {
          valorPago: novoPago,
          jurosPago: round2(Math.max(0, toNumber(l.jurosPago) - juros)),
          multaPaga: round2(Math.max(0, toNumber(l.multaPaga) - multa)),
          descontoConcedido: round2(Math.max(0, toNumber(l.descontoConcedido) - desconto)),
          taxaPaga: round2(Math.max(0, toNumber(l.taxaPaga) - taxa)),
          status,
          dataMovimento: novoPago > 0.001 ? l.dataMovimento : null,
          historico: [...hist, evento] as Prisma.InputJsonValue,
        },
      }),
    ]);

    return this.obterLancamento(l.id).then((row) => ({ ...row, estorno }));
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

  /** Importa pagamentos RECEIVED antigos que ainda não têm lançamento financeiro. */
  async backfillReceitasDePagamentos(limite = 500) {
    await garantirPlanoFinanceiroPadrao();
    const pagos = await prisma.pagamento.findMany({
      where: {
        status: 'RECEIVED',
        lancamentoFinanceiro: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limite,
      select: { id: true },
    });

    let gerados = 0;
    const erros: string[] = [];
    for (const p of pagos) {
      try {
        const created = await this.gerarReceitaDePagamento(p.id);
        if (created) gerados += 1;
      } catch (err) {
        erros.push(`${p.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { analisados: pagos.length, gerados, erros: erros.slice(0, 20) };
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
            parcelas: 1,
          });
          if ('id' in created) gerados.push(created.id);
          else gerados.push(...created.parcelas.map((p) => p.id));
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

    const baixasAntes = await prisma.finBaixa.findMany({
      where: {
        estornado: false,
        tipo: 'baixa',
        dataMovimento: { lt: inicio },
        lancamento: { status: { notIn: ['cancelada', 'estornada'] } },
      },
      include: { lancamento: { select: { natureza: true } } },
    });
    let saldoInicial = saldoInicialContas;
    for (const b of baixasAntes) {
      const v = toNumber(b.valorLiquido);
      if (b.lancamento.natureza === 'receita') saldoInicial += v;
      else if (b.lancamento.natureza === 'despesa') saldoInicial -= v;
    }

    const baixasPeriodo = await prisma.finBaixa.findMany({
      where: {
        estornado: false,
        tipo: 'baixa',
        dataMovimento: { gte: inicio, lte: fim },
        lancamento: { status: { notIn: ['cancelada', 'estornada'] } },
      },
      include: { lancamento: { select: { natureza: true } } },
    });

    let entradas = 0;
    let saidas = 0;
    for (const b of baixasPeriodo) {
      const v = toNumber(b.valorLiquido);
      if (b.lancamento.natureza === 'receita') entradas += v;
      else if (b.lancamento.natureza === 'despesa') saidas += v;
    }

    // Legado: liquidados sem baixa
    const legadoAntes = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        baixas: { none: {} },
        dataMovimento: { lt: inicio, not: null },
      },
      select: { natureza: true, valor: true, valorPago: true },
    });
    for (const m of legadoAntes) {
      const v = toNumber(m.valorPago) || toNumber(m.valor);
      saldoInicial += m.natureza === 'receita' ? v : -v;
    }
    const legadoPeriodo = await prisma.finLancamento.findMany({
      where: {
        natureza: { in: ['receita', 'despesa'] },
        status: { in: ['recebida', 'paga'] },
        baixas: { none: {} },
        dataMovimento: { gte: inicio, lte: fim },
      },
      select: { natureza: true, valor: true, valorPago: true },
    });
    for (const m of legadoPeriodo) {
      const v = toNumber(m.valorPago) || toNumber(m.valor);
      if (m.natureza === 'receita') entradas += v;
      else saidas += v;
    }

    const aReceber = await prisma.finLancamento.findMany({
      where: {
        natureza: 'receita',
        status: { in: ['prevista', 'a_receber', 'parcial', 'vencida'] },
        OR: [
          { dataVencimento: { gte: inicio, lte: fim } },
          { dataVencimento: null, dataCompetencia: { gte: inicio, lte: fim } },
        ],
      },
      select: { valor: true, valorPago: true },
    });
    const aPagar = await prisma.finLancamento.findMany({
      where: {
        natureza: 'despesa',
        status: { in: ['prevista', 'a_pagar', 'parcial', 'vencida'] },
        OR: [
          { dataVencimento: { gte: inicio, lte: fim } },
          { dataVencimento: null, dataCompetencia: { gte: inicio, lte: fim } },
        ],
      },
      select: { valor: true, valorPago: true },
    });

    const projReceber = aReceber.reduce(
      (s, x) => s + Math.max(0, toNumber(x.valor) - toNumber(x.valorPago)),
      0
    );
    const projPagar = aPagar.reduce(
      (s, x) => s + Math.max(0, toNumber(x.valor) - toNumber(x.valorPago)),
      0
    );

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
  async dre(params: { periodo?: string; de?: string; ate?: string; dimensao?: string }) {
    return calcularDreGerencial(params);
  }

  async dreDrilldown(params: {
    drillKey: string;
    periodo?: string;
    de?: string;
    ate?: string;
  }) {
    return dreDrilldown(params);
  }

  async resumoDashboardFinanceiro(params: { periodo?: string; de?: string; ate?: string }) {
    const fluxo = await this.fluxoCaixa(params);
    const dre = await this.dre(params);
    const agora = new Date();

    const aReceber = await prisma.finLancamento.findMany({
      where: { natureza: 'receita', status: { in: ['prevista', 'a_receber', 'parcial', 'vencida'] } },
      select: { valor: true, valorPago: true, status: true, dataVencimento: true },
    });
    const aPagar = await prisma.finLancamento.findMany({
      where: { natureza: 'despesa', status: { in: ['prevista', 'a_pagar', 'parcial', 'vencida'] } },
      select: { valor: true, valorPago: true, status: true, dataVencimento: true },
    });

    let totalAReceber = 0;
    let totalAPagar = 0;
    let vencidos = 0;
    for (const r of aReceber) {
      const st = statusReceitaEfetivo(r.status, r.dataVencimento, agora);
      const saldo = round2(Math.max(0, toNumber(r.valor) - toNumber(r.valorPago)));
      totalAReceber += saldo;
      if (st === 'vencida' || st === 'parcial_vencida') vencidos += saldo;
    }
    for (const d of aPagar) {
      const st = statusDespesaEfetivo(d.status, d.dataVencimento, agora);
      const saldo = round2(Math.max(0, toNumber(d.valor) - toNumber(d.valorPago)));
      totalAPagar += saldo;
      if (st === 'vencida' || st === 'parcial_vencida') vencidos += saldo;
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
