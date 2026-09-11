import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';

const ETAPAS = [
  'novo_lead',
  'contato_realizado',
  'qualificado',
  'proposta_enviada',
  'negociacao',
  'fechado',
  'perdido',
] as const;

const PROB_POR_ETAPA: Record<string, number> = {
  novo_lead: 10,
  contato_realizado: 20,
  qualificado: 40,
  proposta_enviada: 60,
  negociacao: 75,
  fechado: 100,
  perdido: 0,
};

export const MOTIVOS_PERDA = [
  'Preço',
  'Parou de responder',
  'Contratou concorrente',
  'Prazo/agendamento',
  'Serviço não atendido',
  'Desistiu',
  'Outro',
] as const;

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
}

type LeadCreateInput = {
  nome: string;
  cpfCnpj?: string;
  telefone: string;
  email?: string;
  origem: string;
  interesse?: string;
  campanha?: string | null;
  categoriaInteresse?: string | null;
  catalogoServicoId?: string | null;
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

function parsePeriodo(de?: string, ate?: string) {
  const inicio = de ? new Date(`${de}T00:00:00.000`) : undefined;
  const fim = ate ? new Date(`${ate}T23:59:59.999`) : undefined;
  return { inicio, fim };
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
  const { inicio, fim } = parsePeriodo(filters.de, filters.ate);
  if (inicio || fim) {
    where.createdAt = {
      ...(inicio ? { gte: inicio } : {}),
      ...(fim ? { lte: fim } : {}),
    };
  }
  if (filters.busca) {
    where.OR = [
      { nome: { contains: filters.busca, mode: 'insensitive' } },
      { email: { contains: filters.busca, mode: 'insensitive' } },
      { telefone: { contains: filters.busca } },
      { interesse: { contains: filters.busca, mode: 'insensitive' } },
      { campanha: { contains: filters.busca, mode: 'insensitive' } },
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

export class LeadsService {
  async capturarConsultor(data: {
    nome: string;
    telefone: string;
    email: string;
    problema: string;
    servico?: string;
    consentimento: boolean;
  }) {
    const nome = data.nome.trim();
    const telefone = data.telefone.replace(/\D/g, '');
    const email = data.email.trim().toLowerCase();
    const problema = data.problema.trim();

    if (nome.length < 2) throw new Error('Informe seu nome');
    if (telefone.length < 10 || telefone.length > 13) throw new Error('Informe um telefone válido');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido');
    if (data.consentimento !== true) throw new Error('Autorize o contato para continuar');
    if (problema.length < 5 || problema.length > 500) {
      throw new Error('Descreva brevemente o problema');
    }

    const existente = await prisma.lead.findFirst({
      where: {
        origem: 'consultor_site',
        OR: [{ email }, { telefone }],
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

    return prisma.lead.create({
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
  }

  async listar(filters: LeadFilters) {
    return prisma.lead.findMany({
      where: buildWhere(filters),
      orderBy: [{ prioridade: 'desc' }, { updatedAt: 'desc' }],
      include: leadListInclude,
    });
  }

  /**
   * Indicadores comerciais do período — usados pelo CRM e pelo Dashboard Executivo.
   */
  async indicadores(filters: LeadFilters = {}) {
    const where = buildWhere(filters);
    const { inicio, fim } = parsePeriodo(filters.de, filters.ate);
    const periodoSolicitacao: Prisma.DateTimeFilter | undefined =
      inicio || fim
        ? {
            ...(inicio ? { gte: inicio } : {}),
            ...(fim ? { lte: fim } : {}),
          }
        : undefined;

    const [leads, orcamentos, pedidosFechados] = await Promise.all([
      prisma.lead.findMany({
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
        },
      }),
      prisma.solicitacaoServico.count({
        where: {
          ...(periodoSolicitacao ? { createdAt: periodoSolicitacao } : {}),
          OR: [
            { leadId: { not: null } },
            { status: { in: ['orcamento_pendente', 'orcamento', 'checkout', 'aprovado', 'aguardando_pagamento'] } },
          ],
        },
      }),
      prisma.lead.findMany({
        where: {
          ...where,
          etapa: 'fechado',
          statusComercial: 'fechado_ganho',
        },
        select: {
          createdAt: true,
          updatedAt: true,
          valorEstimado: true,
          pedido: { select: { valor: true, createdAt: true } },
        },
      }),
    ]);

    const leadsQualificados = leads.filter((l) =>
      ['qualificado', 'proposta_enviada', 'negociacao', 'fechado'].includes(l.etapa)
    ).length;

    const abertos = leads.filter((l) => !['fechado', 'perdido'].includes(l.etapa));
    const vendas = pedidosFechados.length;
    const valorPipeline = abertos.reduce((sum, l) => sum + toNumber(l.valorEstimado), 0);
    const valorVendas = pedidosFechados.reduce(
      (sum, l) => sum + toNumber(l.pedido?.valor ?? l.valorEstimado),
      0
    );
    const taxaConversao = leads.length ? Math.round((vendas / leads.length) * 1000) / 10 : 0;
    const ticketMedio = vendas ? Math.round((valorVendas / vendas) * 100) / 100 : 0;

    let tempoMedioFechamento: number | null = null;
    if (pedidosFechados.length) {
      const dias = pedidosFechados.map((l) => {
        const fimClose = l.pedido?.createdAt || l.updatedAt;
        return Math.max(0, (fimClose.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      });
      tempoMedioFechamento =
        Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10;
    }

    const porEtapa = ETAPAS.map((etapa) => ({
      etapa,
      quantidade: leads.filter((l) => l.etapa === etapa).length,
    }));

    return {
      leads: leads.length,
      leadsQualificados,
      orcamentos,
      vendas,
      valorPipeline: Math.round(valorPipeline * 100) / 100,
      taxaConversao,
      ticketMedio,
      tempoMedioFechamento,
      porEtapa,
    };
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
    const abertos = leads.filter((l) => !['fechado', 'perdido'].includes(l.etapa));
    const agora = new Date();
    const pipelinePonderado = abertos.reduce((sum, l) => {
      return sum + toNumber(l.valorEstimado) * ((l.probabilidade || 0) / 100);
    }, 0);

    return {
      ...indicadores,
      abertos: abertos.length,
      fechados: indicadores.vendas,
      perdidos: leads.filter((l) => l.etapa === 'perdido').length,
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

    if (lead.etapa === 'fechado') {
      items.push({
        tipo: 'fechado',
        titulo: 'Lead fechado (ganho)',
        descricao: 'Movido automaticamente ou manualmente para Fechado',
        data: lead.updatedAt.toISOString(),
      });
    }
    if (lead.etapa === 'perdido') {
      items.push({
        tipo: 'perdido',
        titulo: 'Lead perdido',
        descricao: lead.motivoPerda || 'Sem motivo informado',
        data: lead.updatedAt.toISOString(),
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

    return prisma.lead.create({
      data: {
        nome: data.nome.trim(),
        cpfCnpj: data.cpfCnpj,
        telefone: data.telefone.replace(/\D/g, '') || data.telefone,
        email: (data.email || '').trim().toLowerCase(),
        origem: data.origem || 'manual',
        interesse,
        campanha: data.campanha || null,
        categoriaInteresse,
        catalogoServicoId,
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
        ...(data.cpfCnpj !== undefined ? { cpfCnpj: data.cpfCnpj } : {}),
        ...(data.telefone != null ? { telefone: data.telefone } : {}),
        ...(data.email != null ? { email: data.email } : {}),
        ...(data.origem != null ? { origem: data.origem } : {}),
        ...(interesse != null ? { interesse } : {}),
        ...(data.campanha !== undefined ? { campanha: data.campanha } : {}),
        ...(categoriaInteresse !== undefined ? { categoriaInteresse } : {}),
        ...(data.catalogoServicoId !== undefined ? { catalogoServicoId: data.catalogoServicoId } : {}),
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
      },
      include: leadListInclude,
    });
  }

  async atualizarEtapa(id: string, etapa: string, motivoPerda?: string, proximoContato?: string) {
    if (!ETAPAS.includes(etapa as (typeof ETAPAS)[number])) throw new Error('Etapa inválida');
    const lead = await this.buscarPorId(id);
    if (etapa === 'perdido' && !motivoPerda && !lead.motivoPerda) {
      throw new Error('Informe o motivo da perda');
    }

    let statusComercial = lead.statusComercial;
    if (etapa === 'perdido') statusComercial = 'perdido';
    if (etapa === 'fechado') statusComercial = 'fechado_ganho';
    if (etapa === 'negociacao' || etapa === 'proposta_enviada') {
      if (proximoContato) statusComercial = 'aguardando_cliente';
    }

    return prisma.lead.update({
      where: { id },
      data: {
        etapa,
        statusComercial,
        probabilidade: PROB_POR_ETAPA[etapa] ?? lead.probabilidade,
        ...(etapa === 'perdido' && motivoPerda ? { motivoPerda } : {}),
        ...(proximoContato ? { proximoContato: new Date(proximoContato) } : {}),
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });
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
    if (status === 'fechado_ganho') {
      patch.etapa = 'fechado';
      patch.probabilidade = 100;
    }
    if (status === 'perdido') {
      patch.etapa = 'perdido';
      patch.probabilidade = 0;
    }

    return prisma.lead.update({ where: { id }, data: patch, include: leadListInclude });
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

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        solicitacaoId,
        ...(sol.clienteId && !lead.clienteId ? { clienteId: sol.clienteId } : {}),
        ...(sol.precoFinal != null ? { valorEstimado: sol.precoFinal } : {}),
        etapa: ['fechado', 'perdido'].includes(lead.etapa) ? lead.etapa : 'proposta_enviada',
        statusComercial: ['fechado_ganho', 'perdido'].includes(lead.statusComercial)
          ? lead.statusComercial
          : 'em_andamento',
        probabilidade: ['fechado', 'perdido'].includes(lead.etapa) ? lead.probabilidade : 60,
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });

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
        dataUltimaInteracao: new Date(),
      },
      include: leadListInclude,
    });

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

    const patch: Prisma.LeadUpdateInput = {
      dataUltimaInteracao: new Date(),
      ...(data.proximoContato ? { proximoContato: new Date(data.proximoContato) } : {}),
      ...(data.proximaAcao !== undefined ? { proximaAcao: data.proximaAcao } : {}),
    };
    if (data.tipo === 'ligacao' || data.tipo === 'whatsapp' || data.tipo === 'email') {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead?.etapa === 'novo_lead') {
        patch.etapa = 'contato_realizado';
        patch.probabilidade = 20;
      }
    }

    await prisma.lead.update({ where: { id: leadId }, data: patch });
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
      if (fechar) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { etapa: 'fechado', statusComercial: 'fechado_ganho', probabilidade: 100 },
        });
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
        ...(manterEtapa
          ? {}
          : { etapa: 'fechado', statusComercial: 'fechado_ganho', probabilidade: 100 }),
      },
    });

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
      probabilidade: PROB_POR_ETAPA[key],
    }));
  }

  getMotivosPerda() {
    return [...MOTIVOS_PERDA];
  }
}

export const leadsService = new LeadsService();
