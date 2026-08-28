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

interface LeadFilters {
  etapa?: string;
  responsavel?: string;
  origem?: string;
  prioridade?: string;
  busca?: string;
}

type LeadCreateInput = {
  nome: string;
  cpfCnpj?: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: string;
  responsavel: string;
  valorEstimado?: number | null;
  probabilidade?: number;
  prioridade?: string;
  dataPrevista?: string | null;
  proximoContato?: string | null;
  tags?: string[];
  observacoes?: string | null;
};

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
      },
    });
  }

  async listar(filters: LeadFilters) {
    const where: Prisma.LeadWhereInput = {};
    if (filters.etapa) where.etapa = filters.etapa;
    if (filters.responsavel) where.responsavel = { contains: filters.responsavel, mode: 'insensitive' };
    if (filters.origem) where.origem = filters.origem;
    if (filters.prioridade) where.prioridade = filters.prioridade;
    if (filters.busca) {
      where.OR = [
        { nome: { contains: filters.busca, mode: 'insensitive' } },
        { email: { contains: filters.busca, mode: 'insensitive' } },
        { telefone: { contains: filters.busca } },
        { interesse: { contains: filters.busca, mode: 'insensitive' } },
      ];
    }

    return prisma.lead.findMany({
      where,
      orderBy: [{ prioridade: 'desc' }, { updatedAt: 'desc' }],
      include: {
        interacoes: { orderBy: { data: 'desc' }, take: 1 },
        cliente: { select: { id: true, nome: true } },
      },
    });
  }

  async dashboard() {
    const leads = await prisma.lead.findMany({
      select: {
        etapa: true,
        valorEstimado: true,
        probabilidade: true,
        prioridade: true,
        proximoContato: true,
        createdAt: true,
      },
    });

    const abertos = leads.filter((l) => !['fechado', 'perdido'].includes(l.etapa));
    const fechados = leads.filter((l) => l.etapa === 'fechado');
    const perdidos = leads.filter((l) => l.etapa === 'perdido');
    const pipeline = abertos.reduce((sum, l) => {
      const valor = toNumber(l.valorEstimado);
      return sum + valor * ((l.probabilidade || 0) / 100);
    }, 0);
    const valorAberto = abertos.reduce((sum, l) => sum + toNumber(l.valorEstimado), 0);
    const agora = new Date();
    const atrasados = abertos.filter((l) => l.proximoContato && l.proximoContato < agora).length;
    const porEtapa = ETAPAS.map((etapa) => ({
      etapa,
      quantidade: leads.filter((l) => l.etapa === etapa).length,
    }));

    return {
      total: leads.length,
      abertos: abertos.length,
      fechados: fechados.length,
      perdidos: perdidos.length,
      conversao: leads.length ? Math.round((fechados.length / leads.length) * 1000) / 10 : 0,
      pipeline: Math.round(pipeline * 100) / 100,
      valorAberto: Math.round(valorAberto * 100) / 100,
      atrasados,
      altaPrioridade: abertos.filter((l) => l.prioridade === 'alta').length,
      porEtapa,
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
      },
    });
    if (!lead) throw new Error('Lead não encontrado');
    return lead;
  }

  async criar(data: LeadCreateInput) {
    return prisma.lead.create({
      data: {
        nome: data.nome,
        cpfCnpj: data.cpfCnpj,
        telefone: data.telefone,
        email: data.email,
        origem: data.origem || 'manual',
        interesse: data.interesse || '',
        responsavel: data.responsavel || 'Comercial',
        etapa: 'novo_lead',
        valorEstimado: data.valorEstimado ?? null,
        probabilidade: data.probabilidade ?? 10,
        prioridade: data.prioridade || 'media',
        dataPrevista: data.dataPrevista ? new Date(data.dataPrevista) : null,
        proximoContato: data.proximoContato ? new Date(data.proximoContato) : null,
        tags: data.tags || [],
        observacoes: data.observacoes || null,
      },
    });
  }

  async atualizar(
    id: string,
    data: Partial<LeadCreateInput> & { motivoPerda?: string | null }
  ) {
    await this.buscarPorId(id);
    return prisma.lead.update({
      where: { id },
      data: {
        ...(data.nome != null ? { nome: data.nome } : {}),
        ...(data.cpfCnpj !== undefined ? { cpfCnpj: data.cpfCnpj } : {}),
        ...(data.telefone != null ? { telefone: data.telefone } : {}),
        ...(data.email != null ? { email: data.email } : {}),
        ...(data.origem != null ? { origem: data.origem } : {}),
        ...(data.interesse != null ? { interesse: data.interesse } : {}),
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
      },
    });
  }

  async atualizarEtapa(id: string, etapa: string, motivoPerda?: string) {
    if (!ETAPAS.includes(etapa as (typeof ETAPAS)[number])) throw new Error('Etapa inválida');
    const lead = await this.buscarPorId(id);
    if (etapa === 'perdido' && !motivoPerda && !lead.motivoPerda) {
      throw new Error('Informe o motivo da perda');
    }
    return prisma.lead.update({
      where: { id },
      data: {
        etapa,
        probabilidade: PROB_POR_ETAPA[etapa] ?? lead.probabilidade,
        ...(etapa === 'perdido' && motivoPerda ? { motivoPerda } : {}),
        ...(etapa === 'fechado' ? { probabilidade: 100 } : {}),
      },
    });
  }

  async registrarInteracao(
    leadId: string,
    data: { tipo: string; descricao: string; usuarioId: string; proximoContato?: string }
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

    if (data.proximoContato) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { proximoContato: new Date(data.proximoContato) },
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

  async converterParaCliente(leadId: string, usuarioId?: string) {
    const lead = await this.buscarPorId(leadId);

    if (lead.clienteId) {
      await prisma.lead.update({ where: { id: leadId }, data: { etapa: 'fechado', probabilidade: 100 } });
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
        email: lead.email,
        telefone: lead.telefone,
        consentimentoLgpd: true,
        dataAceite: new Date(),
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { etapa: 'fechado', probabilidade: 100, clienteId: cliente.id },
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

  getEtapas() {
    return ETAPAS.map((key) => ({
      key,
      probabilidade: PROB_POR_ETAPA[key],
    }));
  }
}

export const leadsService = new LeadsService();
