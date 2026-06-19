import { prisma } from '../utils/prisma.js';
import { gerarNumeroPedido } from '../utils/helpers.js';

export class ServicosService {
  async listar(filters: { categoria?: string; ativo?: boolean; busca?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.ativo !== undefined) where.ativo = filters.ativo;
    if (filters.busca) {
      where.OR = [
        { nome: { contains: filters.busca, mode: 'insensitive' } },
        { descricao: { contains: filters.busca, mode: 'insensitive' } },
      ];
    }

    return prisma.servico.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async buscarPorId(id: string) {
    const servico = await prisma.servico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');
    return servico;
  }

  async criar(data: {
    nome: string;
    categoria: string;
    descricao: string;
    preco?: number;
    parceiro?: string;
  }) {
    return prisma.servico.create({ data });
  }

  async atualizar(id: string, data: Partial<{ nome: string; categoria: string; descricao: string; preco: number; parceiro: string; ativo: boolean }>) {
    return prisma.servico.update({ where: { id }, data });
  }

  async solicitar(data: {
    servicoId: string;
    clienteId: string;
    responsavel: string;
    descricao?: string;
  }) {
    const servico = await this.buscarPorId(data.servicoId);
    const numero = await gerarNumeroPedido();

    return prisma.pedido.create({
      data: {
        numero,
        clienteId: data.clienteId,
        servicoId: data.servicoId,
        valor: servico.preco || 0,
        responsavel: data.responsavel,
        descricao: data.descricao || servico.descricao,
      },
      include: { servico: true, cliente: true },
    });
  }
}

export const servicosService = new ServicosService();

export class BeneficiosService {
  async listar(filters: { categoria?: string; ativo?: boolean }) {
    const where: Record<string, unknown> = {};
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.ativo !== undefined) where.ativo = filters.ativo;
    return prisma.beneficio.findMany({ where, orderBy: { parceiro: 'asc' } });
  }

  async criar(data: {
    parceiro: string;
    categoria: string;
    descricao: string;
    cupom?: string;
    cashback?: number;
    desconto?: number;
  }) {
    return prisma.beneficio.create({ data });
  }

  async atualizar(id: string, data: Partial<{ parceiro: string; categoria: string; descricao: string; cupom: string; cashback: number; desconto: number; ativo: boolean }>) {
    return prisma.beneficio.update({ where: { id }, data });
  }

  async excluir(id: string) {
    return prisma.beneficio.delete({ where: { id } });
  }
}

export const beneficiosService = new BeneficiosService();

export class ParceirosService {
  async listar() {
    return prisma.parceiro.findMany({ orderBy: { nome: 'asc' } });
  }

  async criar(data: { nome: string; cnpj?: string; email: string; telefone: string; categoria: string }) {
    return prisma.parceiro.create({ data });
  }

  async atualizar(id: string, data: Partial<{ nome: string; email: string; telefone: string; categoria: string; ativo: boolean }>) {
    return prisma.parceiro.update({ where: { id }, data });
  }
}

export const parceirosService = new ParceirosService();
