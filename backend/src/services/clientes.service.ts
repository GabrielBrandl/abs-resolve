import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma.js';
import { validarCpf, validarCnpj, formatarDocumento } from '../utils/validators.js';

interface ClienteFilters {
  status?: string;
  tipo?: string;
  busca?: string;
  page?: number;
  limit?: number;
}

interface CreateClienteData {
  tipo: 'PF' | 'PJ';
  nome: string;
  cpf?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  responsavel?: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  endereco?: object;
  consentimentoLgpd?: boolean;
  criarAcesso?: boolean;
  senha?: string;
}

export class ClientesService {
  async listar(filters: ClienteFilters) {
    const { status, tipo, busca, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { email: { contains: busca, mode: 'insensitive' } },
        { cpf: { contains: busca.replace(/\D/g, '') } },
        { cnpj: { contains: busca.replace(/\D/g, '') } },
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cliente.count({ where }),
    ]);

    return { clientes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async buscarPorId(id: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        pedidos: { orderBy: { createdAt: 'desc' }, take: 10 },
        interacoes: { orderBy: { data: 'desc' }, take: 20, include: { usuario: { select: { nome: true } } } },
        pagamentos: { orderBy: { createdAt: 'desc' }, take: 10 },
        garantias: { orderBy: { dataInicio: 'desc' }, take: 10 },
        produtosInstalados: { orderBy: { data: 'desc' }, take: 20 },
        user: { select: { id: true, email: true } },
      },
    });
    if (!cliente) throw new Error('Cliente não encontrado');
    return cliente;
  }

  async criar(data: CreateClienteData) {
    if (data.tipo === 'PF') {
      if (!data.cpf) throw new Error('CPF é obrigatório para PF');
      const cpfLimpo = formatarDocumento(data.cpf);
      if (!validarCpf(cpfLimpo)) throw new Error('CPF inválido');
      data.cpf = cpfLimpo;
    } else {
      if (!data.cnpj) throw new Error('CNPJ é obrigatório para PJ');
      const cnpjLimpo = formatarDocumento(data.cnpj);
      if (!validarCnpj(cnpjLimpo)) throw new Error('CNPJ inválido');
      data.cnpj = cnpjLimpo;
    }

    const cliente = await prisma.cliente.create({
      data: {
        tipo: data.tipo,
        nome: data.nome,
        cpf: data.cpf,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        cnpj: data.cnpj,
        responsavel: data.responsavel,
        email: data.email,
        telefone: data.telefone,
        whatsapp: data.whatsapp,
        endereco: data.endereco || {},
        consentimentoLgpd: data.consentimentoLgpd ?? false,
        dataAceite: data.consentimentoLgpd ? new Date() : null,
      },
    });

    if (data.criarAcesso && data.senha) {
      const senhaHash = await bcrypt.hash(data.senha, 10);
      await prisma.user.create({
        data: {
          nome: data.nome,
          email: data.email,
          senhaHash,
          role: 'cliente',
          clienteId: cliente.id,
        },
      });
    }

    return cliente;
  }

  async atualizar(id: string, data: Partial<CreateClienteData>) {
    await this.buscarPorId(id);

    if (data.cpf) {
      const cpfLimpo = formatarDocumento(data.cpf);
      if (!validarCpf(cpfLimpo)) throw new Error('CPF inválido');
      data.cpf = cpfLimpo;
    }
    if (data.cnpj) {
      const cnpjLimpo = formatarDocumento(data.cnpj);
      if (!validarCnpj(cnpjLimpo)) throw new Error('CNPJ inválido');
      data.cnpj = cnpjLimpo;
    }

    const { criarAcesso, senha, ...updateData } = data;
    return prisma.cliente.update({ where: { id }, data: updateData });
  }

  async atualizarStatus(id: string, status: string) {
    if (!['ativo', 'inativo', 'bloqueado'].includes(status)) {
      throw new Error('Status inválido');
    }
    return prisma.cliente.update({ where: { id }, data: { status } });
  }

  async listarPagamentos(clienteId: string) {
    return prisma.pagamento.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
      include: { pedido: { select: { numero: true } } },
    });
  }

  async registrarInteracao(clienteId: string, data: { tipo: string; descricao: string; usuarioId: string }) {
    await this.buscarPorId(clienteId);
    return prisma.interacao.create({
      data: { clienteId, ...data },
      include: { usuario: { select: { nome: true } } },
    });
  }

  async exportarCsv(filters: ClienteFilters) {
    const { clientes } = await this.listar({ ...filters, limit: 10000 });
    return clientes.map((c) => ({
      nome: c.nome,
      tipo: c.tipo,
      documento: c.cpf || c.cnpj || '',
      email: c.email,
      telefone: c.telefone,
      status: c.status,
    }));
  }
}

export const clientesService = new ClientesService();
