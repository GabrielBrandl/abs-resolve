import { prisma } from '../utils/prisma.js';

const ETAPAS = [
  'novo_lead',
  'contato_realizado',
  'qualificado',
  'proposta_enviada',
  'negociacao',
  'fechado',
  'perdido',
];

interface LeadFilters {
  etapa?: string;
  responsavel?: string;
  origem?: string;
  busca?: string;
}

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
        data: { nome, telefone, email, interesse },
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
      },
    });
  }

  async listar(filters: LeadFilters) {
    const where: Record<string, unknown> = {};
    if (filters.etapa) where.etapa = filters.etapa;
    if (filters.responsavel) where.responsavel = filters.responsavel;
    if (filters.origem) where.origem = filters.origem;
    if (filters.busca) {
      where.OR = [
        { nome: { contains: filters.busca, mode: 'insensitive' } },
        { email: { contains: filters.busca, mode: 'insensitive' } },
      ];
    }

    return prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        interacoes: { orderBy: { data: 'desc' }, take: 1 },
      },
    });
  }

  async buscarPorId(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        interacoes: {
          orderBy: { data: 'desc' },
          include: { usuario: { select: { nome: true } } },
        },
      },
    });
    if (!lead) throw new Error('Lead não encontrado');
    return lead;
  }

  async criar(data: {
    nome: string;
    cpfCnpj?: string;
    telefone: string;
    email: string;
    origem: string;
    interesse: string;
    responsavel: string;
  }) {
    return prisma.lead.create({ data: { ...data, etapa: 'novo_lead' } });
  }

  async atualizarEtapa(id: string, etapa: string) {
    if (!ETAPAS.includes(etapa)) throw new Error('Etapa inválida');
    return prisma.lead.update({ where: { id }, data: { etapa } });
  }

  async registrarInteracao(
    leadId: string,
    data: { tipo: string; descricao: string; usuarioId: string }
  ) {
    await this.buscarPorId(leadId);
    return prisma.interacao.create({
      data: { leadId, ...data },
      include: { usuario: { select: { nome: true } } },
    });
  }

  async historico(id: string) {
    return prisma.interacao.findMany({
      where: { leadId: id },
      orderBy: { data: 'desc' },
      include: { usuario: { select: { nome: true } } },
    });
  }

  async converterParaCliente(leadId: string) {
    const lead = await this.buscarPorId(leadId);

    const cliente = await prisma.cliente.create({
      data: {
        tipo: lead.cpfCnpj && lead.cpfCnpj.length > 11 ? 'PJ' : 'PF',
        nome: lead.nome,
        cpf: lead.cpfCnpj && lead.cpfCnpj.length <= 11 ? lead.cpfCnpj.replace(/\D/g, '') : undefined,
        cnpj: lead.cpfCnpj && lead.cpfCnpj.length > 11 ? lead.cpfCnpj.replace(/\D/g, '') : undefined,
        email: lead.email,
        telefone: lead.telefone,
        consentimentoLgpd: true,
        dataAceite: new Date(),
      },
    });

    await prisma.lead.update({ where: { id: leadId }, data: { etapa: 'fechado' } });

    return cliente;
  }

  getEtapas() {
    return ETAPAS;
  }
}

export const leadsService = new LeadsService();
