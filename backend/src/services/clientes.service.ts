import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma.js';
import { validarCpf, validarCnpj, formatarDocumento } from '../utils/validators.js';
import { toNumber } from '../utils/helpers.js';
import { normalizarOrigem } from '../utils/periodo.js';

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
  origem?: string;
  consentimentoLgpd?: boolean;
  criarAcesso?: boolean;
  senha?: string;
  forcarDuplicado?: boolean;
  /** Venda assistida / WhatsApp: permite PF sem CPF na hora. */
  cadastroSimplificado?: boolean;
}

function soDigitos(v: string) {
  return v.replace(/\D/g, '');
}

export class ClientesService {
  async listar(filters: ClienteFilters) {
    const { status, tipo, busca, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (busca) {
      const digits = soDigitos(busca);
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { email: { contains: busca, mode: 'insensitive' } },
        ...(digits
          ? [
              { telefone: { contains: digits } },
              { whatsapp: { contains: digits } },
              { cpf: { contains: digits } },
              { cnpj: { contains: digits } },
            ]
          : []),
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pedidos: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, valor: true },
          },
          pagamentos: {
            where: { status: 'RECEIVED' },
            select: { valor: true },
          },
          _count: {
            select: {
              pedidos: true,
              solicitacoes: true,
              agendamentos: true,
            },
          },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    const enriquecidos = clientes.map((c) => {
      const totalGasto = c.pagamentos.reduce((s, p) => s + toNumber(p.valor), 0);
      const nServicos = c._count.solicitacoes || c._count.pedidos;
      return {
        id: c.id,
        tipo: c.tipo,
        nome: c.nome,
        cpf: c.cpf,
        cnpj: c.cnpj,
        email: c.email,
        telefone: c.telefone,
        status: c.status,
        origem: normalizarOrigem(c.origem),
        createdAt: c.createdAt,
        ultimaCompra: c.pedidos[0]?.createdAt || null,
        numeroServicos: nServicos,
        totalGasto: Math.round(totalGasto * 100) / 100,
        ticketMedio: nServicos > 0 ? Math.round((totalGasto / nServicos) * 100) / 100 : 0,
      };
    });

    return { clientes: enriquecidos, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async buscarPorTelefone(telefone: string) {
    const digits = soDigitos(telefone);
    if (digits.length < 8) return [];
    const sufixo = digits.slice(-8);
    return prisma.cliente.findMany({
      where: {
        OR: [{ telefone: { contains: sufixo } }, { whatsapp: { contains: sufixo } }],
      },
      take: 10,
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        cpf: true,
        cnpj: true,
        status: true,
        tipo: true,
      },
    });
  }

  async buscarDuplicados(data: { telefone?: string; email?: string; cpf?: string; cnpj?: string }) {
    const or: Record<string, unknown>[] = [];
    if (data.telefone) {
      const digits = soDigitos(data.telefone);
      if (digits.length >= 8) {
        const sufixo = digits.slice(-8);
        or.push({ telefone: { contains: sufixo } }, { whatsapp: { contains: sufixo } });
      }
    }
    if (data.email) or.push({ email: { equals: data.email, mode: 'insensitive' } });
    if (data.cpf) or.push({ cpf: soDigitos(data.cpf) });
    if (data.cnpj) or.push({ cnpj: soDigitos(data.cnpj) });
    if (!or.length) return [];
    return prisma.cliente.findMany({
      where: { OR: or },
      take: 10,
      select: { id: true, nome: true, telefone: true, email: true, cpf: true, cnpj: true, status: true },
    });
  }

  async buscarPorId(id: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        pedidos: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            ordemServico: { include: { tecnico: { select: { id: true, nome: true } } } },
            pagamentos: true,
            solicitacao: { include: { servico: { select: { nome: true, slug: true } } } },
          },
        },
        interacoes: { orderBy: { data: 'desc' }, take: 50, include: { usuario: { select: { nome: true } } } },
        pagamentos: { orderBy: { createdAt: 'desc' }, take: 50, include: { pedido: { select: { numero: true } } } },
        garantias: { orderBy: { dataInicio: 'desc' }, take: 20 },
        produtosInstalados: { orderBy: { data: 'desc' }, take: 20 },
        agendamentos: {
          orderBy: { data: 'desc' },
          take: 30,
          include: { tecnico: { select: { nome: true } }, pedido: { select: { numero: true } } },
        },
        leads: { orderBy: { updatedAt: 'desc' }, take: 20 },
        solicitacoes: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            status: true,
            fotos: true,
            opcoes: true,
            precoFinal: true,
            createdAt: true,
            servico: { select: { nome: true, slug: true } },
          },
        },
        user: { select: { id: true, email: true } },
      },
    });
    if (!cliente) throw new Error('Cliente não encontrado');

    const pagos = cliente.pagamentos.filter((p) => p.status === 'RECEIVED');
    const totalGasto = pagos.reduce((s, p) => s + toNumber(p.valor), 0);
    const nServicos = cliente.solicitacoes.length || cliente.pedidos.length;
    const ultimaCompra = cliente.pedidos[0]?.createdAt || null;

    return {
      ...cliente,
      origem: normalizarOrigem(cliente.origem),
      kpis: {
        totalGasto: Math.round(totalGasto * 100) / 100,
        quantidadeServicos: nServicos,
        ticketMedio: nServicos > 0 ? Math.round((totalGasto / nServicos) * 100) / 100 : 0,
        ultimaCompra,
        pedidos: cliente.pedidos.length,
        os: cliente.pedidos.filter((p) => p.ordemServico).length,
      },
    };
  }

  async criar(data: CreateClienteData) {
    if (data.tipo === 'PF') {
      if (data.cpf) {
        const cpfLimpo = formatarDocumento(data.cpf);
        if (!validarCpf(cpfLimpo)) throw new Error('CPF inválido');
        data.cpf = cpfLimpo;
      } else if (!data.cadastroSimplificado) {
        throw new Error('CPF é obrigatório para PF');
      }
    } else {
      if (!data.cnpj) throw new Error('CNPJ é obrigatório para PJ');
      const cnpjLimpo = formatarDocumento(data.cnpj);
      if (!validarCnpj(cnpjLimpo)) throw new Error('CNPJ inválido');
      data.cnpj = cnpjLimpo;
    }

    if (!data.email?.trim()) {
      const tel = soDigitos(data.telefone || data.whatsapp || '');
      data.email = tel ? `${tel}@venda.absresolve.local` : `cliente-${Date.now()}@venda.absresolve.local`;
    }

    const dups = await this.buscarDuplicados({
      telefone: data.telefone,
      email: data.email,
      cpf: data.cpf,
      cnpj: data.cnpj,
    });
    if (dups.length && !data.forcarDuplicado) {
      const err = new Error('Cliente já cadastrado com telefone/CPF/CNPJ/e-mail semelhante');
      (err as Error & { duplicados?: unknown }).duplicados = dups;
      throw err;
    }

    const { cadastroSimplificado: _cs, criarAcesso, senha, forcarDuplicado: _f, ...rest } = data;

    const cliente = await prisma.cliente.create({
      data: {
        tipo: rest.tipo,
        nome: rest.nome,
        cpf: rest.cpf,
        razaoSocial: rest.razaoSocial,
        nomeFantasia: rest.nomeFantasia,
        cnpj: rest.cnpj,
        responsavel: rest.responsavel,
        email: rest.email,
        telefone: soDigitos(rest.telefone),
        whatsapp: rest.whatsapp ? soDigitos(rest.whatsapp) : soDigitos(rest.telefone),
        endereco: rest.endereco || {},
        origem: normalizarOrigem(rest.origem),
        consentimentoLgpd: rest.consentimentoLgpd ?? false,
        dataAceite: rest.consentimentoLgpd ? new Date() : null,
      },
    });

    if (criarAcesso && senha) {
      const senhaHash = await bcrypt.hash(senha, 12);
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

    const { criarAcesso: _a, senha: _s, forcarDuplicado: _f, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (rest.telefone) updateData.telefone = soDigitos(rest.telefone);
    if (rest.whatsapp) updateData.whatsapp = soDigitos(rest.whatsapp);
    if (rest.origem) updateData.origem = normalizarOrigem(rest.origem);

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

  async atualizarAcessoPortal(
    clienteId: string,
    data: { email?: string; senha?: string; nome?: string }
  ) {
    const cliente = await this.buscarPorId(clienteId);
    if (!cliente.user) throw new Error('Cliente não possui acesso ao portal');

    if (data.email && data.email !== cliente.user.email) {
      const dup = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: cliente.user.id } },
      });
      if (dup) throw new Error('Email já cadastrado');
    }

    const userUpdate: { nome?: string; email?: string; senhaHash?: string } = {};
    if (data.nome) userUpdate.nome = data.nome;
    if (data.email) userUpdate.email = data.email;
    if (data.senha) userUpdate.senhaHash = await bcrypt.hash(data.senha, 12);

    if (Object.keys(userUpdate).length) {
      await prisma.user.update({ where: { id: cliente.user.id }, data: userUpdate });
    }

    const clienteUpdate: { nome?: string; email?: string } = {};
    if (data.nome) clienteUpdate.nome = data.nome;
    if (data.email) clienteUpdate.email = data.email;

    if (Object.keys(clienteUpdate).length) {
      await prisma.cliente.update({ where: { id: clienteId }, data: clienteUpdate });
    }

    return this.buscarPorId(clienteId);
  }

  async excluir(clienteId: string) {
    const cliente = await this.buscarPorId(clienteId);
    const pedidos = await prisma.pedido.count({ where: { clienteId } });
    if (pedidos > 0) {
      throw new Error('Cliente possui pedidos vinculados. Bloqueie o cadastro em vez de excluir.');
    }

    if (cliente.user) {
      await prisma.refreshToken.deleteMany({ where: { userId: cliente.user.id } });
      await prisma.user.delete({ where: { id: cliente.user.id } });
    }

    await prisma.cliente.delete({ where: { id: clienteId } });
    return { id: clienteId, deleted: true };
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
      origem: c.origem,
      ultimaCompra: c.ultimaCompra,
      numeroServicos: c.numeroServicos,
      totalGasto: c.totalGasto,
    }));
  }
}

export const clientesService = new ClientesService();
