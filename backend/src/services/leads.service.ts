import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import {
  ETAPAS_CRM,
  ETAPAS_ABERTAS,
  LABEL_ETAPA,
  MOTIVOS_ABANDONO,
  MOTIVOS_PERDA,
  PROB_POR_ETAPA,
  isEtapaQualificado,
  isEtapaTerminal,
} from '../utils/crm-funil.js';

const ETAPAS = ETAPAS_CRM;

export { MOTIVOS_PERDA, MOTIVOS_ABANDONO };

export interface LeadFilters {
  etapa?: string;
  responsavel?: string;
  origem?: string;
  campanha?: string;
  categoria?: string;
  servicoId?: string;
  prioridade?: string;
  busca?: string;
  de?: string;
  ate?: string;
  tipoLead?: string;
  segmento?: string;
  bairro?: string;
  ligou?: string;
  atendeu?: string;
  contatoDecisorOk?: string;
  /** hoje | atrasados — fila de follow-up */
  fila?: string;
}

type LeadCreateInput = {
  nome: string;
  nomeFantasia?: string | null;
  cpfCnpj?: string;
  telefone: string;
  email?: string;
  origem: string;
  interesse?: string;
  campanha?: string | null;
  categoriaInteresse?: string | null;
  catalogoServicoId?: string | null;
  segmento?: string | null;
  bairro?: string | null;
  ligou?: boolean | string | null;
  atendeu?: boolean | string | null;
  contatoNome?: string | null;
  contatoCargo?: string | null;
  contatoTelefone?: string | null;
  contatoEmail?: string | null;
  contatoDecisorOk?: boolean | string | null;
  cidade?: string | null;
  tipoLead?: string;
  responsavel: string;
  valorEstimado?: number | null;
  probabilidade?: number;
  prioridade?: string;
  dataPrevista?: string | null;
  proximoContato?: string | null;
  proximaAcao?: string | null;
  tags?: string[];
  observacoes?: string | null;
};

/** Aceita boolean, "sim"/"nao", "true"/"false". Undefined = não enviado; null = limpar. */
function parseSimNao(v: unknown): boolean | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['sim', 's', 'true', '1', 'yes'].includes(s)) return true;
  if (['nao', 'não', 'n', 'false', '0', 'no'].includes(s)) return false;
  return null;
}

function parsePeriodo(de?: string, ate?: string) {
  const inicio = de ? new Date(`${de}T00:00:00.000`) : undefined;
  const fim = ate ? new Date(`${ate}T23:59:59.999`) : undefined;
  return { inicio, fim };
}

function inicioFimDiaBrasil(ref = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ref);
  return {
    inicio: new Date(`${ymd}T00:00:00-03:00`),
    fim: new Date(`${ymd}T23:59:59.999-03:00`),
  };
}

function buildWhere(filters: LeadFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (filters.etapa) where.etapa = filters.etapa;
  if (filters.responsavel) {
    where.responsavel = { contains: filters.responsavel, mode: 'insensitive' };
  }
  if (filters.origem) where.origem = filters.origem;
  if (filters.campanha) {
    where.campanha = { contains: filters.campanha, mode: 'insensitive' };
  }
  if (filters.categoria) where.categoriaInteresse = filters.categoria;
  if (filters.servicoId) where.catalogoServicoId = filters.servicoId;
  if (filters.prioridade) where.prioridade = filters.prioridade;
  if (filters.tipoLead) where.tipoLead = filters.tipoLead;
  if (filters.segmento) where.segmento = filters.segmento;
  if (filters.bairro) {
    where.bairro = { contains: filters.bairro, mode: 'insensitive' };
  }
  const ligouF = parseSimNao(filters.ligou);
  if (ligouF !== undefined && ligouF !== null) where.ligou = ligouF;
  const atendeuF = parseSimNao(filters.atendeu);
  if (atendeuF !== undefined && atendeuF !== null) where.atendeu = atendeuF;
  const decisorF = parseSimNao(filters.contatoDecisorOk);
  if (decisorF !== undefined && decisorF !== null) where.contatoDecisorOk = decisorF;
  const { inicio, fim } = parsePeriodo(filters.de, filters.ate);
  if (inicio || fim) {
    where.createdAt = {
      ...(inicio ? { gte: inicio } : {}),
      ...(fim ? { lte: fim } : {}),
    };
  }

  if (filters.fila === 'hoje' || filters.fila === 'atrasados') {
    const dia = inicioFimDiaBrasil();
    where.etapa = {
      in: [...ETAPAS_ABERTAS],
    };
    where.proximoContato =
      filters.fila === 'hoje'
        ? { gte: dia.inicio, lte: dia.fim }
        : { lt: dia.inicio };
  }

  if (filters.busca) {
    where.OR = [
      { nome: { contains: filters.busca, mode: 'insensitive' } },
      { nomeFantasia: { contains: filters.busca, mode: 'insensitive' } },
      { email: { contains: filters.busca, mode: 'insensitive' } },
      { telefone: { contains: filters.busca } },
      { interesse: { contains: filters.busca, mode: 'insensitive' } },
      { campanha: { contains: filters.busca, mode: 'insensitive' } },
      { contatoNome: { contains: filters.busca, mode: 'insensitive' } },
      { segmento: { contains: filters.busca, mode: 'insensitive' } },
      { bairro: { contains: filters.busca, mode: 'insensitive' } },
      { contatoTelefone: { contains: filters.busca } },
      { contatoEmail: { contains: filters.busca, mode: 'insensitive' } },
    ];
  }
  return where;
}

const leadListInclude = {
  interacoes: { orderBy: { data: 'desc' as const }, take: 1 },
  cliente: { select: { id: true, nome: true } },
  catalogoServico: { select: { id: true, nome: true, slug: true, categoria: true } },
  solicitacao: {
    select: {
      id: true,
      status: true,
      precoFinal: true,
      pedidoId: true,
      createdAt: true,
    },
  },
  pedido: { select: { id: true, numero: true, status: true, valor: true } },
} satisfies Prisma.LeadInclude;

type MudancaEtapaOpts = {
  motivo?: string | null;
  observacao?: string | null;
  usuarioId?: string | null;
};

function agregarMotivos(valores: Array<string | null | undefined>) {
  const map = new Map<string, number>();
  for (const v of valores) {
    const key = (v || 'Não informado').trim() || 'Não informado';
    map.set(key, (map.get(key) || 0) + 1);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([motivo, quantidade]) => ({
      motivo,
      quantidade,
      percentual: total ? Math.round((quantidade / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

async function resolverUsuarioNome(usuarioId?: string | null) {
  if (!usuarioId) return { usuarioId: null as string | null, usuarioNome: null as string | null };
  const u = await prisma.user.findUnique({ where: { id: usuarioId }, select: { id: true, nome: true } });
  return { usuarioId: u?.id || null, usuarioNome: u?.nome || null };
}

async function registrarMovimentacao(
  leadId: string,
  etapaAnterior: string | null,
  etapaNova: string,
  opts: MudancaEtapaOpts = {}
) {
  const { usuarioId, usuarioNome } = await resolverUsuarioNome(opts.usuarioId);
  return prisma.leadMovimentacao.create({
    data: {
      leadId,
      etapaAnterior,
      etapaNova,
      motivo: opts.motivo || null,
      observacao: opts.observacao || null,
      usuarioId,
      usuarioNome,
    },
  });
}

function marcosPorEtapa(
  etapa: string,
  lead: {
    dataQualificacao?: Date | null;
    dataOrcamento?: Date | null;
    dataFechamento?: Date | null;
    dataPerda?: Date | null;
    dataAbandono?: Date | null;
  }
): {
  dataQualificacao?: Date;
  dataOrcamento?: Date;
  dataFechamento?: Date;
  dataPerda?: Date;
  dataAbandono?: Date;
} {
  const agora = new Date();
  const patch: {
    dataQualificacao?: Date;
    dataOrcamento?: Date;
    dataFechamento?: Date;
    dataPerda?: Date;
    dataAbandono?: Date;
  } = {};
  if (isEtapaQualificado(etapa) && !lead.dataQualificacao) patch.dataQualificacao = agora;
  if (
    (etapa === 'proposta_enviada' || etapa === 'negociacao' || etapa === 'fechado') &&
    !lead.dataOrcamento
  ) {
    patch.dataOrcamento = agora;
  }
  if (etapa === 'fechado' && !lead.dataFechamento) patch.dataFechamento = agora;
  if (etapa === 'perdido') patch.dataPerda = agora;
  if (etapa === 'abandonou_qualificacao') patch.dataAbandono = agora;
  return patch;
}

export class LeadsService {
  async capturarConsultor(data: {
    nome: string;
    telefone: string;
    email?: string;
    problema: string;
    servico?: string;
    consentimento: boolean;
  }) {
    const nome = data.nome.trim();
    const telefone = data.telefone.replace(/\D/g, '');
    const emailRaw = String(data.email || '').trim().toLowerCase();
    const email =
      emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : '';
    const problema = data.problema.trim();

    if (nome.length < 2) throw new Error('Informe seu nome');
    if (telefone.length < 10 || telefone.length > 13) throw new Error('Informe um telefone válido');
    if (emailRaw && !email) throw new Error('Informe um e-mail válido');
    if (data.consentimento !== true) throw new Error('Autorize o contato para continuar');
    if (problema.length < 5 || problema.length > 500) {
      throw new Error('Descreva brevemente o problema');
    }

    const existente = await prisma.lead.findFirst({
      where: {
        origem: 'consultor_site',
        OR: [...(email ? [{ email }] : []), { telefone }],
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const interesse = [data.servico?.trim(), problema].filter(Boolean).join(' — ').slice(0, 1000);
    if (existente) {
      return prisma.lead.update({
        where: { id: existente.id },
        data: { nome, telefone, email, interesse, prioridade: 'alta' },
      });
    }

    let catalogoServicoId: string | undefined;
    let categoriaInteresse: string | undefined;
    if (data.servico?.trim()) {
      const cat = await prisma.catalogoServico.findFirst({
        where: {
          OR: [
            { slug: data.servico.trim() },
            { nome: { equals: data.servico.trim(), mode: 'insensitive' } },
          ],
          ativo: true,
        },
      });
      if (cat) {
        catalogoServicoId = cat.id;
        categoriaInteresse = cat.categoria;
      }
    }

    const criado = await prisma.lead.create({
      data: {
        nome,
        telefone,
        email,
        origem: 'consultor_site',
        interesse,
        responsavel: 'Comercial',
        etapa: 'novo_lead',
        prioridade: 'alta',
        probabilidade: 10,
        tags: ['site', 'consultor'],
        ...(catalogoServicoId ? { catalogoServicoId } : {}),
        ...(categoriaInteresse ? { categoriaInteresse } : {}),
      },
    });
    await registrarMovimentacao(criado.id, null, 'novo_lead');
    return criado;
  }

  async listar(filters: LeadFilters) {
    return prisma.lead.findMany({
      where: buildWhere(filters),
      orderBy: [{ prioridade: 'desc' }, { updatedAt: 'desc' }],
      include: leadListInclude,
    });
  }

  /**
   * Indicadores comerciais do período — coorte por createdAt (competência de entrada).
   * Usados pelo CRM e pelo Dashboard Executivo.
   */
  async indicadores(filters: LeadFilters = {}) {
    const where = buildWhere(filters);

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        etapa: true,
        statusComercial: true,
        valorEstimado: true,
        probabilidade: true,
        createdAt: true,
        updatedAt: true,
        pedidoId: true,
        solicitacaoId: true,
        motivoPerda: true,
        motivoAbandono: true,
        tipoCliente: true,
        dataQualificacao: true,
        dataOrcamento: true,
        dataFechamento: true,
        dataPerda: true,
        dataAbandono: true,
        origem: true,
        campanha: true,
        pedido: { select: { valor: true, createdAt: true } },
      },
    });

    const totalLeads = leads.length;
    const leadsQualificados = leads.filter((l) => isEtapaQualificado(l.etapa)).length;
    const abandonaram = leads.filter((l) => l.etapa === 'abandonou_qualificacao').length;
    const perdidos = leads.filter((l) => l.etapa === 'perdido').length;
    const orcamentos = leads.filter(
      (l) =>
        !!l.solicitacaoId ||
        !!l.dataOrcamento ||
        ['proposta_enviada', 'negociacao', 'fechado'].includes(l.etapa)
    ).length;
    const vendasLeads = leads.filter((l) => l.etapa === 'fechado');
    const vendas = vendasLeads.length;
    const vendasNovos = vendasLeads.filter((l) => l.tipoCliente !== 'recorrente').length;

    const abertos = leads.filter((l) => (ETAPAS_ABERTAS as readonly string[]).includes(l.etapa));
    const valorPipeline = abertos.reduce((sum, l) => sum + toNumber(l.valorEstimado), 0);
    const valorVendas = vendasLeads.reduce(
      (sum, l) => sum + toNumber(l.pedido?.valor ?? l.valorEstimado),
      0
    );

    const taxaQualificacao = totalLeads
      ? Math.round((leadsQualificados / totalLeads) * 1000) / 10
      : 0;
    const taxaAbandono = totalLeads ? Math.round((abandonaram / totalLeads) * 1000) / 10 : 0;
    const taxaQualificadoOrcamento = leadsQualificados
      ? Math.round((orcamentos / leadsQualificados) * 1000) / 10
      : 0;
    const taxaOrcamentoVenda = orcamentos
      ? Math.round((vendas / orcamentos) * 1000) / 10
      : 0;
    const taxaConversao = totalLeads ? Math.round((vendas / totalLeads) * 1000) / 10 : 0;
    const ticketMedio = vendas ? Math.round((valorVendas / vendas) * 100) / 100 : 0;

    let tempoMedioFechamento: number | null = null;
    if (vendasLeads.length) {
      const dias = vendasLeads.map((l) => {
        const fimClose = l.dataFechamento || l.pedido?.createdAt || l.updatedAt;
        return Math.max(0, (fimClose.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      });
      tempoMedioFechamento =
        Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10;
    }

    const porEtapa = ETAPAS.map((etapa) => ({
      etapa,
      quantidade: leads.filter((l) => l.etapa === etapa).length,
    }));

    const motivosAbandono = agregarMotivos(
      leads.filter((l) => l.etapa === 'abandonou_qualificacao').map((l) => l.motivoAbandono)
    );
    const motivosPerda = agregarMotivos(
      leads.filter((l) => l.etapa === 'perdido').map((l) => l.motivoPerda)
    );

    const porOrigemMap = new Map<
      string,
      { leads: number; qualificados: number; orcamentos: number; vendas: number; receita: number }
    >();
    for (const l of leads) {
      const o = l.origem || 'outros';
      if (!porOrigemMap.has(o)) {
        porOrigemMap.set(o, { leads: 0, qualificados: 0, orcamentos: 0, vendas: 0, receita: 0 });
      }
      const row = porOrigemMap.get(o)!;
      row.leads += 1;
      if (isEtapaQualificado(l.etapa)) row.qualificados += 1;
      if (
        l.solicitacaoId ||
        l.dataOrcamento ||
        ['proposta_enviada', 'negociacao', 'fechado'].includes(l.etapa)
      ) {
        row.orcamentos += 1;
      }
      if (l.etapa === 'fechado') {
        row.vendas += 1;
        row.receita += toNumber(l.pedido?.valor ?? l.valorEstimado);
      }
    }
    const porOrigem = [...porOrigemMap.entries()]
      .map(([origem, v]) => ({
        origem,
        ...v,
        receita: Math.round(v.receita * 100) / 100,
      }))
      .sort((a, b) => b.leads - a.leads);

    const porCampanhaMap = new Map<
      string,
      { leads: number; qualificados: number; orcamentos: number; vendas: number; receita: number }
    >();
    for (const l of leads) {
      const c = (l.campanha || '').trim() || '(sem campanha)';
      if (!porCampanhaMap.has(c)) {
        porCampanhaMap.set(c, { leads: 0, qualificados: 0, orcamentos: 0, vendas: 0, receita: 0 });
      }
      const row = porCampanhaMap.get(c)!;
      row.leads += 1;
      if (isEtapaQualificado(l.etapa)) row.qualificados += 1;
      if (
        l.solicitacaoId ||
        l.dataOrcamento ||
        ['proposta_enviada', 'negociacao', 'fechado'].includes(l.etapa)
      ) {
        row.orcamentos += 1;
      }
      if (l.etapa === 'fechado') {
        row.vendas += 1;
        row.receita += toNumber(l.pedido?.valor ?? l.valorEstimado);
      }
    }
    const porCampanha = [...porCampanhaMap.entries()]
      .map(([campanha, v]) => ({
        campanha,
        ...v,
        receita: Math.round(v.receita * 100) / 100,
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 30);

    return {
      leads: totalLeads,
      leadsQualificados,
      abandonaramQualificacao: abandonaram,
      perdidos,
      orcamentos,
      vendas,
      vendasNovosClientes: vendasNovos,
      valorPipeline: Math.round(valorPipeline * 100) / 100,
      receita: Math.round(valorVendas * 100) / 100,
      taxaQualificacao,
      taxaAbandono,
      taxaQualificadoOrcamento,
      taxaOrcamentoVenda,
      taxaConversao,
      ticketMedio,
      tempoMedioFechamento,
      porEtapa,
      motivosAbandono,
      motivosPerda,
      porOrigem,
      porCampanha,
      funil: {
        leads: totalLeads,
        qualificados: leadsQualificados,
        orcamentos,
        vendas,
        taxaLeadQualificado: taxaQualificacao,
        taxaQualificadoOrcamento,
        taxaOrcamentoVenda,
        taxaLeadVenda: taxaConversao,
      },
    };
  }

  async mesesComLeads() {
    const rows = await prisma.$queryRaw<Array<{ ym: string }>>`
      SELECT DISTINCT to_char("created_at" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS ym
      FROM leads
      ORDER BY ym DESC
    `;
    const meses = rows
      .map((r) => r.ym)
      .filter(Boolean)
      .map((ym) => {
        const [y, m] = ym.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
        });
        return {
          key: ym,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          de: `${ym}-01`,
          ate: new Date(y, m, 0).toISOString().slice(0, 10),
        };
      });
    return { meses };
  }

  async dashboard(filters: LeadFilters = {}) {
    const indicadores = await this.indicadores(filters);
    const leads = await prisma.lead.findMany({
      where: buildWhere(filters),
      select: {
        etapa: true,
        valorEstimado: true,
        probabilidade: true,
        prioridade: true,
        proximoContato: true,
      },
    });
    const abertos = leads.filter((l) => (ETAPAS_ABERTAS as readonly string[]).includes(l.etapa));
    const agora = new Date();
    const pipelinePonderado = abertos.reduce((sum, l) => {
      return sum + toNumber(l.valorEstimado) * ((l.probabilidade || 0) / 100);
    }, 0);

    return {
      ...indicadores,
      abertos: abertos.length,
      fechados: indicadores.vendas,
      conversao: indicadores.taxaConversao,
      pipeline: Math.round(pipelinePonderado * 100) / 100,
      valorAberto: indicadores.valorPipeline,
      atrasados: abertos.filter((l) => l.proximoContato && l.proximoContato < agora).length,
      altaPrioridade: abertos.filter((l) => l.prioridade === 'alta').length,
    };
  }

  async buscarPorId(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        interacoes: {
          orderBy: { data: 'desc' },
          include: { usuario: { select: { nome: true } } },
        },
        movimentacoes: {
          orderBy: { createdAt: 'asc' },
        },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        catalogoServico: { select: { id: true, nome: true, slug: true, categoria: true, precoMinimo: true } },
        solicitacao: {
          include: {
            servico: { select: { id: true, nome: true, slug: true } },
            pedido: { select: { id: true, numero: true, status: true, valor: true } },
          },
        },
        solicitacoes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            servico: { select: { nome: true, slug: true } },
            pedido: { select: { id: true, numero: true, status: true, valor: true } },
          },
        },
        pedido: {
          include: {
            pagamentos: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                valor: true,
                metodo: true,
                paymentDate: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!lead) throw new Error('Lead não encontrado');
    return lead;
  }

  async timeline(id: string) {
    const lead = await this.buscarPorId(id);
    type Item = { tipo: string; titulo: string; descricao: string; data: string; meta?: Record<string, unknown> };
    const items: Item[] = [];

    items.push({
      tipo: 'lead_criado',
      titulo: 'Lead criado',
      descricao: `Origem: ${lead.origem}${lead.campanha ? ` · Campanha: ${lead.campanha}` : ''}`,
      data: lead.createdAt.toISOString(),
    });

    for (const i of [...lead.interacoes].reverse()) {
      const mapTipo: Record<string, string> = {
        ligacao: 'Contato',
        whatsapp: 'Contato WhatsApp',
        email: 'Contato e-mail',
        reuniao: 'Reunião',
        proposta: 'Proposta / orçamento',
        observacao: 'Observação',
        followup: 'Follow-up',
        negociacao: 'Negociação',
        sistema: 'Sistema',
      };
      items.push({
        tipo: i.tipo,
        titulo: mapTipo[i.tipo] || i.tipo,
        descricao: i.descricao,
        data: i.data.toISOString(),
        meta: { usuario: i.usuario?.nome },
      });
    }

    for (const sol of lead.solicitacoes || []) {
      items.push({
        tipo: 'orcamento',
        titulo: 'Orçamento enviado',
        descricao: `${sol.servico?.nome || 'Serviço'} · ${sol.status}${sol.precoFinal != null ? ` · R$ ${toNumber(sol.precoFinal).toFixed(2)}` : ''}`,
        data: sol.createdAt.toISOString(),
        meta: { solicitacaoId: sol.id, quote_id: sol.id },
      });
      if (sol.pedido) {
        items.push({
          tipo: 'pedido',
          titulo: 'Pedido criado',
          descricao: `${sol.pedido.numero} · ${sol.pedido.status} · R$ ${toNumber(sol.pedido.valor).toFixed(2)}`,
          data: sol.updatedAt.toISOString(),
          meta: { order_id: sol.pedido.id, quote_id: sol.id },
        });
      }
    }

    if (lead.pedido && !(lead.solicitacoes || []).some((s) => s.pedidoId === lead.pedidoId)) {
      items.push({
        tipo: 'pedido',
        titulo: 'Pedido vinculado',
        descricao: `${lead.pedido.numero} · ${lead.pedido.status} · R$ ${toNumber(lead.pedido.valor).toFixed(2)}`,
        data: lead.pedido.createdAt.toISOString(),
        meta: { order_id: lead.pedido.id, quote_id: lead.solicitacaoId },
      });
    }

    for (const pag of lead.pedido?.pagamentos || []) {
      if (pag.status === 'RECEIVED' || pag.paymentDate) {
        items.push({
          tipo: 'pagamento',
          titulo: 'Pagamento',
          descricao: `${pag.metodo} · R$ ${toNumber(pag.valor).toFixed(2)} · ${pag.status}`,
          data: (pag.paymentDate || pag.createdAt).toISOString(),
          meta: { pagamentoId: pag.id },
        });
      }
    }

    for (const m of lead.movimentacoes || []) {
      if (!m.etapaAnterior && m.etapaNova === 'novo_lead') continue; // já coberto por lead_criado
      const label = LABEL_ETAPA[m.etapaNova] || m.etapaNova;
      const de = m.etapaAnterior ? LABEL_ETAPA[m.etapaAnterior] || m.etapaAnterior : null;
      const partes = [
        de ? `${de} → ${label}` : label,
        m.motivo ? `Motivo: ${m.motivo}` : null,
        m.observacao || null,
        m.usuarioNome ? `por ${m.usuarioNome}` : null,
      ].filter(Boolean);
      items.push({
        tipo: 'mudanca_etapa',
        titulo: label,
        descricao: partes.join(' · '),
        data: m.createdAt.toISOString(),
        meta: {
          etapaAnterior: m.etapaAnterior,
          etapaNova: m.etapaNova,
          motivo: m.motivo,
          observacao: m.observacao,
          usuario: m.usuarioNome,
        },
      });
    }

    items.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    return items;
  }

  async criar(data: LeadCreateInput) {
    if (!data.nome?.trim()) throw new Error('Informe o nome');
    if (!data.telefone?.trim()) throw new Error('Informe o WhatsApp/telefone');

    let interesse = data.interesse || '';
    let categoriaInteresse = data.categoriaInteresse || null;
    let catalogoServicoId = data.catalogoServicoId || null;

    if (catalogoServicoId) {
      const servico = await prisma.catalogoServico.findUnique({ where: { id: catalogoServicoId } });
      if (!servico) throw new Error('Serviço de interesse não encontrado no catálogo');
      categoriaInteresse = categoriaInteresse || servico.categoria;
      if (!interesse) interesse = servico.nome;
    }

    const tipoLead =
      data.tipoLead === 'prospeccao_b2b' || data.origem === 'prospeccao_b2b'
        ? 'prospeccao_b2b'
        : data.tipoLead || 'inbound';

    const lead = await prisma.lead.create({
      data: {
        nome: data.nome.trim(),
        nomeFantasia: data.nomeFantasia?.trim() || null,
        cpfCnpj: data.cpfCnpj,
        telefone: data.telefone.replace(/\D/g, '') || data.telefone,
        email: (data.email || '').trim().toLowerCase(),
        origem: data.origem || (tipoLead === 'prospeccao_b2b' ? 'prospeccao_b2b' : 'manual'),
        interesse,
        campanha: data.campanha || null,
        categoriaInteresse,
        catalogoServicoId,
        segmento: data.segmento || null,
        bairro: data.bairro?.trim() || null,
        ligou: parseSimNao(data.ligou) ?? null,
        atendeu: parseSimNao(data.atendeu) ?? null,
        contatoNome: data.contatoNome?.trim() || null,
        contatoCargo: data.contatoCargo?.trim() || null,
        contatoTelefone: data.contatoTelefone?.replace(/\D/g, '') || data.contatoTelefone?.trim() || null,
        contatoEmail: data.contatoEmail?.trim().toLowerCase() || null,
        contatoDecisorOk: parseSimNao(data.contatoDecisorOk) ?? null,
        cidade: data.cidade?.trim() || (tipoLead === 'prospeccao_b2b' ? 'Manaus' : null),
        tipoLead,
        responsavel: data.responsavel || 'Comercial',
        etapa: 'novo_lead',
        valorEstimado: data.valorEstimado ?? null,
        probabilidade: data.probabilidade ?? 10,
        prioridade: data.prioridade || 'media',
        dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : null,
        proximoContato: data.proximoContato ? new Date(data.proximoContato) : null,
        proximaAcao: data.proximaAcao || null,
        tags: data.tags || [],
        observacoes: data.observacoes || null,
      },
      include: leadListInclude,
    });

    await registrarMovimentacao(lead.id, null, 'novo_lead');
    return lead;
  }

  async atualizar(
    id: string,
    data: Partial<LeadCreateInput> & {
      motivoPerda?: string | null;
      statusComercial?: string;
      proximaAcao?: string | null;
      pedidoId?: string | null;
      solicitacaoId?: string | null;
      clienteId?: string | null;
      etapa?: string;
    }
  ) {
    await this.buscarPorId(id);
    if (data.statusComercial === 'perdido' || data.etapa === 'perdido') {
      if (!data.motivoPerda) {
        const atual = await this.buscarPorId(id);
        if (!atual.motivoPerda) throw new Error('Informe o motivo da perda');
      }
    }
    if (data.statusComercial === 'aguardando_cliente' && !data.proximoContato) {
      const atual = await this.buscarPorId(id);
      if (!atual.proximoContato) {
        throw new Error('Defina a data de follow-up para Aguardando cliente');
      }
    }

    let etapa = data.etapa as string | undefined;
    let statusComercial = data.statusComercial;
    if (statusComercial === 'fechado_ganho') etapa = etapa || 'fechado';
    if (statusComercial === 'perdido') etapa = etapa || 'perdido';
    if (etapa === 'fechado') statusComercial = statusComercial || 'fechado_ganho';
    if (etapa === 'perdido') statusComercial = statusComercial || 'perdido';

    let interesse = data.interesse;
    let categoriaInteresse = data.categoriaInteresse;
    if (data.catalogoServicoId) {
      const servico = await prisma.catalogoServico.findUnique({ where: { id: data.catalogoServicoId } });
      if (!servico) throw new Error('Serviço de interesse não encontrado no catálogo');
      if (categoriaInteresse === undefined) categoriaInteresse = servico.categoria;
      if (interesse === undefined || interesse === '') interesse = servico.nome;
    }

    return prisma.lead.update({
      where: { id },
      data: {
        ...(data.nome != null ? { nome: data.nome } : {}),
        ...(data.nomeFantasia !== undefined ? { nomeFantasia: data.nomeFantasia || null } : {}),
        ...(data.cpfCnpj !== undefined ? { cpfCnpj: data.cpfCnpj } : {}),
        ...(data.telefone != null ? { telefone: data.telefone } : {}),
        ...(data.email != null ? { email: data.email } : {}),
        ...(data.origem != null ? { origem: data.origem } : {}),
        ...(interesse != null ? { interesse } : {}),
        ...(data.campanha !== undefined ? { campanha: data.campanha } : {}),
        ...(categoriaInteresse !== undefined ? { categoriaInteresse } : {}),
        ...(data.catalogoServicoId !== undefined ? { catalogoServicoId: data.catalogoServicoId } : {}),
        ...(data.segmento !== undefined ? { segmento: data.segmento || null } : {}),
        ...(data.bairro !== undefined ? { bairro: data.bairro || null } : {}),
        ...(data.ligou !== undefined ? { ligou: parseSimNao(data.ligou) ?? null } : {}),
        ...(data.atendeu !== undefined ? { atendeu: parseSimNao(data.atendeu) ?? null } : {}),
        ...(data.contatoNome !== undefined ? { contatoNome: data.contatoNome || null } : {}),
        ...(data.contatoCargo !== undefined ? { contatoCargo: data.contatoCargo || null } : {}),
        ...(data.contatoTelefone !== undefined
          ? {
              contatoTelefone:
                data.contatoTelefone?.replace(/\D/g, '') || data.contatoTelefone || null,
            }
          : {}),
        ...(data.contatoEmail !== undefined
          ? { contatoEmail: data.contatoEmail?.trim().toLowerCase() || null }
          : {}),
        ...(data.contatoDecisorOk !== undefined
          ? { contatoDecisorOk: parseSimNao(data.contatoDecisorOk) ?? null }
          : {}),
        ...(data.cidade !== undefined ? { cidade: data.cidade || null } : {}),
        ...(data.tipoLead != null ? { tipoLead: data.tipoLead } : {}),
        ...(data.responsavel != null ? { responsavel: data.responsavel } : {}),
        ...(data.valorEstimado !== undefined ? { valorEstimado: data.valorEstimado } : {}),
        ...(data.probabilidade !== undefined ? { probabilidade: data.probabilidade } : {}),
        ...(data.prioridade != null ? { prioridade: data.prioridade } : {}),
        ...(data.motivoPerda !== undefined ? { motivoPerda: data.motivoPerda } : {}),
        ...(data.dataPrevista !== undefined
          ? { dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : null }
          : {}),
        ...(data.proximoContato !== undefined
          ? { proximoContato: data.proximoContato ? new Date(data.proximoContato) : null }
          : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {}),
        ...(statusComercial != null ? { statusComercial } : {}),
        ...(etapa != null
          ? { etapa, probabilidade: PROB_POR_ETAPA[etapa] ?? undefined }
          : {}),
        ...(data.proximaAcao !== undefined ? { proximaAcao: data.proximaAcao } : {}),
        ...(data.pedidoId !== undefined ? { pedidoId: data.pedidoId } : {}),
        ...(data.solicitacaoId !== undefined ? { solicitacaoId: data.solicitacaoId } : {}),
        ...(data.clienteId !== undefined ? { clienteId: data.clienteId } : {}),
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });
  }

  async atualizarEtapa(
    id: string,
    etapa: string,
    opts: {
      motivoPerda?: string;
      observacaoPerda?: string;
      motivoAbandono?: string;
      observacaoAbandono?: string;
      proximoContato?: string;
      usuarioId?: string;
    } = {}
  ) {
    if (!ETAPAS.includes(etapa as (typeof ETAPAS)[number])) throw new Error('Etapa inválida');
    const lead = await this.buscarPorId(id);
    if (lead.etapa === etapa) return lead;

    if (etapa === 'perdido') {
      const motivo = opts.motivoPerda || lead.motivoPerda;
      if (!motivo) throw new Error('Informe o motivo da perda');
    }
    if (etapa === 'abandonou_qualificacao') {
      const motivo = opts.motivoAbandono || lead.motivoAbandono;
      if (!motivo) throw new Error('Informe o motivo do abandono');
    }

    let statusComercial = lead.statusComercial;
    if (etapa === 'perdido' || etapa === 'abandonou_qualificacao') statusComercial = 'perdido';
    if (etapa === 'fechado') statusComercial = 'fechado_ganho';
    if (etapa === 'negociacao' || etapa === 'proposta_enviada') {
      if (opts.proximoContato) statusComercial = 'aguardando_cliente';
      else if (statusComercial === 'perdido') statusComercial = 'em_andamento';
    }
    if (!isEtapaTerminal(etapa) && statusComercial === 'perdido') {
      statusComercial = 'em_andamento';
    }

    let tipoCliente = lead.tipoCliente;
    if (etapa === 'fechado' && !tipoCliente && lead.clienteId) {
      const pedidosAnteriores = await prisma.pedido.count({
        where: {
          clienteId: lead.clienteId,
          ...(lead.pedidoId ? { id: { not: lead.pedidoId } } : {}),
        },
      });
      tipoCliente = pedidosAnteriores > 0 ? 'recorrente' : 'novo';
    } else if (etapa === 'fechado' && !tipoCliente) {
      tipoCliente = 'novo';
    }

    const motivo =
      etapa === 'perdido'
        ? opts.motivoPerda || lead.motivoPerda
        : etapa === 'abandonou_qualificacao'
          ? opts.motivoAbandono || lead.motivoAbandono
          : null;
    const observacao =
      etapa === 'perdido'
        ? opts.observacaoPerda
        : etapa === 'abandonou_qualificacao'
          ? opts.observacaoAbandono
          : null;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        etapa,
        statusComercial,
        probabilidade: PROB_POR_ETAPA[etapa] ?? lead.probabilidade,
        ...(tipoCliente ? { tipoCliente } : {}),
        ...(etapa === 'perdido'
          ? {
              motivoPerda: motivo,
              ...(opts.observacaoPerda !== undefined
                ? { observacaoPerda: opts.observacaoPerda || null }
                : {}),
            }
          : {}),
        ...(etapa === 'abandonou_qualificacao'
          ? {
              motivoAbandono: motivo,
              ...(opts.observacaoAbandono !== undefined
                ? { observacaoAbandono: opts.observacaoAbandono || null }
                : {}),
            }
          : {}),
        ...(opts.proximoContato ? { proximoContato: new Date(opts.proximoContato) } : {}),
        ...marcosPorEtapa(etapa, lead),
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });

    await registrarMovimentacao(id, lead.etapa, etapa, {
      motivo,
      observacao,
      usuarioId: opts.usuarioId,
    });

    return updated;
  }

  async atualizarStatusComercial(
    id: string,
    data: {
      statusComercial: string;
      motivoPerda?: string;
      proximoContato?: string;
      proximaAcao?: string;
      responsavel?: string;
    }
  ) {
    const lead = await this.buscarPorId(id);
    const status = data.statusComercial;
    if (status === 'perdido' && !data.motivoPerda && !lead.motivoPerda) {
      throw new Error('Informe o motivo da perda');
    }
    if (status === 'aguardando_cliente' && !data.proximoContato && !lead.proximoContato) {
      throw new Error('Defina a data de follow-up');
    }

    const patch: Prisma.LeadUpdateInput = {
      statusComercial: status,
      ...(data.motivoPerda ? { motivoPerda: data.motivoPerda } : {}),
      ...(data.proximoContato ? { proximoContato: new Date(data.proximoContato) } : {}),
      ...(data.proximaAcao !== undefined ? { proximaAcao: data.proximaAcao } : {}),
      ...(data.responsavel ? { responsavel: data.responsavel } : {}),
      dataUltimaInteracao: new Date(),
    };
    let novaEtapa: string | null = null;
    if (status === 'fechado_ganho') {
      patch.etapa = 'fechado';
      patch.probabilidade = 100;
      Object.assign(patch, marcosPorEtapa('fechado', lead));
      novaEtapa = 'fechado';
    }
    if (status === 'perdido') {
      patch.etapa = 'perdido';
      patch.probabilidade = 0;
      Object.assign(patch, marcosPorEtapa('perdido', lead));
      novaEtapa = 'perdido';
    }

    const updated = await prisma.lead.update({ where: { id }, data: patch, include: leadListInclude });
    if (novaEtapa && novaEtapa !== lead.etapa) {
      await registrarMovimentacao(id, lead.etapa, novaEtapa, {
        motivo: data.motivoPerda || null,
      });
    }
    return updated;
  }

  /** Vincula orçamento (SolicitacaoServico) ao lead e avança para Proposta Enviada. */
  async vincularOrcamento(leadId: string, solicitacaoId: string, usuarioId?: string) {
    const lead = await this.buscarPorId(leadId);
    const sol = await prisma.solicitacaoServico.findUnique({ where: { id: solicitacaoId } });
    if (!sol) throw new Error('Orçamento não encontrado');

    await prisma.solicitacaoServico.update({
      where: { id: solicitacaoId },
      data: { leadId },
    });

    const novaEtapa = ['fechado', 'perdido', 'abandonou_qualificacao'].includes(lead.etapa)
      ? lead.etapa
      : 'proposta_enviada';

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        solicitacaoId,
        ...(sol.clienteId && !lead.clienteId ? { clienteId: sol.clienteId } : {}),
        ...(sol.precoFinal != null ? { valorEstimado: sol.precoFinal } : {}),
        etapa: novaEtapa,
        statusComercial: ['fechado_ganho', 'perdido'].includes(lead.statusComercial)
          ? lead.statusComercial
          : 'em_andamento',
        probabilidade: isEtapaTerminal(lead.etapa) ? lead.probabilidade : 60,
        ...marcosPorEtapa(novaEtapa, lead),
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });

    if (novaEtapa !== lead.etapa) {
      await registrarMovimentacao(leadId, lead.etapa, novaEtapa, {
        usuarioId,
        motivo: 'Orçamento vinculado',
      });
    }

    if (usuarioId) {
      await prisma.interacao.create({
        data: {
          leadId,
          tipo: 'proposta',
          descricao: `Orçamento vinculado (${solicitacaoId.slice(0, 8)})`,
          usuarioId,
        },
      });
    }

    return updated;
  }

  /**
   * Ao fechar orçamento/pedido: vincula lead_id, quote_id (solicitacao) e order_id e move para Fechado.
   */
  async marcarFechadoComVinculos(opts: {
    leadId?: string | null;
    solicitacaoId?: string | null;
    pedidoId: string;
    clienteId: string;
    usuarioId?: string;
  }) {
    let lead =
      (opts.leadId
        ? await prisma.lead.findUnique({ where: { id: opts.leadId } })
        : null) ||
      (await prisma.lead.findFirst({ where: { pedidoId: opts.pedidoId } })) ||
      (opts.solicitacaoId
        ? await prisma.lead.findFirst({
            where: { OR: [{ solicitacaoId: opts.solicitacaoId }, { solicitacoes: { some: { id: opts.solicitacaoId } } }] },
          })
        : null) ||
      (await prisma.lead.findFirst({
        where: {
          clienteId: opts.clienteId,
          statusComercial: { notIn: ['fechado_ganho', 'perdido'] },
        },
        orderBy: { updatedAt: 'desc' },
      }));

    if (!lead) return null;

    if (opts.solicitacaoId) {
      await prisma.solicitacaoServico.update({
        where: { id: opts.solicitacaoId },
        data: { leadId: lead.id, pedidoId: opts.pedidoId },
      }).catch(() => {});
    }

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        statusComercial: 'fechado_ganho',
        etapa: 'fechado',
        probabilidade: 100,
        clienteId: opts.clienteId,
        pedidoId: opts.pedidoId,
        ...(opts.solicitacaoId ? { solicitacaoId: opts.solicitacaoId } : {}),
        ...marcosPorEtapa('fechado', lead),
        tipoCliente: lead.tipoCliente || 'novo',
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });

    if (lead.etapa !== 'fechado') {
      await registrarMovimentacao(lead.id, lead.etapa, 'fechado', {
        usuarioId: opts.usuarioId,
        motivo: 'Fechamento automático',
      });
    }

    if (opts.usuarioId) {
      await prisma.interacao.create({
        data: {
          leadId: lead.id,
          clienteId: opts.clienteId,
          tipo: 'sistema',
          descricao: `Pedido fechado — lead_id=${lead.id} quote_id=${opts.solicitacaoId || lead.solicitacaoId || '—'} order_id=${opts.pedidoId}`,
          usuarioId: opts.usuarioId,
        },
      });
    }

    return updated;
  }

  async marcarFechadoGanhoPorPedido(pedidoId: string, clienteId: string) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { pedidoId },
      select: { id: true, leadId: true },
    });
    return this.marcarFechadoComVinculos({
      pedidoId,
      clienteId,
      solicitacaoId: sol?.id,
      leadId: sol?.leadId,
    });
  }

  /** Cria orçamento a partir do lead (usa serviço do catálogo). */
  async criarOrcamento(
    leadId: string,
    data: { catalogoServicoId?: string; valor?: number; observacao?: string; usuarioId: string }
  ) {
    const lead = await this.buscarPorId(leadId);
    const servicoId = data.catalogoServicoId || lead.catalogoServicoId;
    if (!servicoId) throw new Error('Selecione o serviço de interesse do catálogo');

    const servico = await prisma.catalogoServico.findUnique({ where: { id: servicoId } });
    if (!servico || !servico.ativo) throw new Error('Serviço do catálogo indisponível');

    let clienteId = lead.clienteId;
    if (!clienteId) {
      const cliente = await this.converterParaCliente(leadId, data.usuarioId, { manterEtapa: true });
      clienteId = cliente.id;
    }

    const valor = data.valor ?? (toNumber(lead.valorEstimado) || toNumber(servico.precoMinimo) || 0);

    const sol = await prisma.solicitacaoServico.create({
      data: {
        clienteId: clienteId!,
        servicoId,
        leadId,
        tipo: servico.tipo || 'C',
        opcoes: {
          tipoSolicitacao: 'orcamento_crm',
          observacaoComercial: data.observacao || null,
          origemLead: lead.origem,
          campanha: lead.campanha,
        } as Prisma.InputJsonValue,
        status: 'orcamento_pendente',
        precoBase: valor || null,
        precoFinal: valor || null,
      },
    });

    await this.vincularOrcamento(leadId, sol.id, data.usuarioId);
    return this.buscarPorId(leadId);
  }

  /** Cria pedido a partir do lead e vincula IDs; etapa → Negociação (fechamento completo no pagamento). */
  async criarPedido(
    leadId: string,
    data: { valor?: number; descricao?: string; usuarioId: string }
  ) {
    const lead = await this.buscarPorId(leadId);
    let clienteId = lead.clienteId;
    if (!clienteId) {
      const cliente = await this.converterParaCliente(leadId, data.usuarioId, { manterEtapa: true });
      clienteId = cliente.id;
    }

    const valor =
      data.valor ?? (toNumber(lead.solicitacao?.precoFinal) || toNumber(lead.valorEstimado));
    if (!valor || valor <= 0) throw new Error('Informe o valor do pedido');

    const { gerarNumeroPedido } = await import('../utils/helpers.js');
    const numero = await gerarNumeroPedido();

    const pedido = await prisma.pedido.create({
      data: {
        numero,
        clienteId: clienteId!,
        valor,
        responsavel: lead.responsavel || 'Comercial',
        descricao:
          data.descricao ||
          lead.interesse ||
          lead.catalogoServico?.nome ||
          'Pedido via CRM',
        status: 'recebido',
      },
    });

    if (lead.solicitacaoId) {
      await prisma.solicitacaoServico.update({
        where: { id: lead.solicitacaoId },
        data: { pedidoId: pedido.id, leadId },
      }).catch(() => {});
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        pedidoId: pedido.id,
        clienteId,
        etapa: 'negociacao',
        statusComercial: 'em_andamento',
        probabilidade: 75,
        valorEstimado: valor,
        dataUltimaInteracao: new Date(),
      },
    });

    await prisma.interacao.create({
      data: {
        leadId,
        clienteId,
        tipo: 'negociacao',
        descricao: `Pedido ${numero} criado (order_id=${pedido.id}${lead.solicitacaoId ? ` quote_id=${lead.solicitacaoId}` : ''})`,
        usuarioId: data.usuarioId,
      },
    });

    return this.buscarPorId(leadId);
  }

  async agendarFollowUp(
    leadId: string,
    data: { proximoContato: string; proximaAcao?: string; usuarioId: string }
  ) {
    if (!data.proximoContato) throw new Error('Informe data/hora do próximo contato');
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        proximoContato: new Date(data.proximoContato),
        ...(data.proximaAcao !== undefined ? { proximaAcao: data.proximaAcao } : {}),
        statusComercial: 'aguardando_cliente',
        dataUltimaInteracao: new Date(),
      },
    });
    await prisma.interacao.create({
      data: {
        leadId,
        tipo: 'followup',
        descricao: `Follow-up agendado para ${new Date(data.proximoContato).toLocaleString('pt-BR')}${data.proximaAcao ? ` — ${data.proximaAcao}` : ''}`,
        usuarioId: data.usuarioId,
      },
    });
    return this.buscarPorId(leadId);
  }

  async registrarInteracao(
    leadId: string,
    data: { tipo: string; descricao: string; usuarioId: string; proximoContato?: string; proximaAcao?: string }
  ) {
    await this.buscarPorId(leadId);
    const interacao = await prisma.interacao.create({
      data: {
        leadId,
        tipo: data.tipo,
        descricao: data.descricao,
        usuarioId: data.usuarioId,
      },
      include: { usuario: { select: { nome: true } } },
    });

    const leadAtual = await prisma.lead.findUnique({ where: { id: leadId } });
    const patch: Prisma.LeadUpdateInput = {
      dataUltimaInteracao: new Date(),
      ...(data.proximoContato ? { proximoContato: new Date(data.proximoContato) } : {}),
      ...(data.proximaAcao !== undefined ? { proximaAcao: data.proximaAcao } : {}),
    };
    let avancouContato = false;
    if (
      leadAtual &&
      (data.tipo === 'ligacao' || data.tipo === 'whatsapp' || data.tipo === 'email') &&
      leadAtual.etapa === 'novo_lead'
    ) {
      patch.etapa = 'contato_realizado';
      patch.probabilidade = 20;
      avancouContato = true;
    }

    await prisma.lead.update({ where: { id: leadId }, data: patch });
    if (avancouContato && leadAtual) {
      await registrarMovimentacao(leadId, leadAtual.etapa, 'contato_realizado', {
        usuarioId: data.usuarioId,
        motivo: 'Contato registrado',
      });
    }
    return interacao;
  }

  async historico(id: string) {
    return prisma.interacao.findMany({
      where: { leadId: id },
      orderBy: { data: 'desc' },
      include: { usuario: { select: { nome: true } } },
    });
  }

  async converterParaCliente(
    leadId: string,
    usuarioId?: string,
    opts?: { manterEtapa?: boolean; fecharComoGanho?: boolean }
  ) {
    const lead = await this.buscarPorId(leadId);
    const fechar = opts?.fecharComoGanho === true;
    const manterEtapa = opts?.manterEtapa !== false && !fechar;

    if (lead.clienteId) {
      if (fechar && lead.etapa !== 'fechado') {
        await this.atualizarEtapa(leadId, 'fechado', { usuarioId });
      }
      return prisma.cliente.findUniqueOrThrow({ where: { id: lead.clienteId } });
    }

    const cliente = await prisma.cliente.create({
      data: {
        tipo: lead.cpfCnpj && lead.cpfCnpj.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF',
        nome: lead.nome,
        cpf:
          lead.cpfCnpj && lead.cpfCnpj.replace(/\D/g, '').length <= 11
            ? lead.cpfCnpj.replace(/\D/g, '')
            : undefined,
        cnpj:
          lead.cpfCnpj && lead.cpfCnpj.replace(/\D/g, '').length > 11
            ? lead.cpfCnpj.replace(/\D/g, '')
            : undefined,
        email: lead.email || `${lead.telefone}@lead.local`,
        telefone: lead.telefone,
        whatsapp: lead.telefone,
        origem: lead.origem || 'outros',
        consentimentoLgpd: true,
        dataAceite: new Date(),
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        clienteId: cliente.id,
      },
    });

    if (!manterEtapa && lead.etapa !== 'fechado') {
      await this.atualizarEtapa(leadId, 'fechado', { usuarioId });
    } else if (usuarioId) {
      // noop — movimentação já cobre quando fecha
    }

    if (usuarioId) {
      await prisma.interacao.create({
        data: {
          leadId,
          clienteId: cliente.id,
          tipo: 'sistema',
          descricao: `Lead convertido em cliente ${cliente.nome}`,
          usuarioId,
        },
      });
    }

    return cliente;
  }

  async excluir(id: string) {
    await this.buscarPorId(id);

    await prisma.$transaction(async (tx) => {
      await tx.solicitacaoServico.updateMany({
        where: { leadId: id },
        data: { leadId: null },
      });
      await tx.lead.update({
        where: { id },
        data: { solicitacaoId: null, pedidoId: null },
      });
      await tx.interacao.deleteMany({ where: { leadId: id } });
      await tx.lead.delete({ where: { id } });
    });

    return { id, excluido: true };
  }

  getEtapas() {
    return ETAPAS.map((key) => ({
      key,
      label: LABEL_ETAPA[key],
      probabilidade: PROB_POR_ETAPA[key],
    }));
  }

  getMotivosPerda() {
    return [...MOTIVOS_PERDA];
  }

  getMotivosAbandono() {
    return [...MOTIVOS_ABANDONO];
  }
}

export const leadsService = new LeadsService();
