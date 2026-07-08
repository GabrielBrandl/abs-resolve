import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import type { Comissao, Parceiro } from '@prisma/client';

function baseUrl() {
  return (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || 'https://app.absresolve.com.br').replace(/\/$/, '');
}

function gerarCodigoBase(nome: string) {
  const limpo = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  const prefixo = limpo.slice(0, 4) || 'ABS';
  const sufixo = randomBytes(2).toString('hex').toUpperCase();
  return `${prefixo}${sufixo}`;
}

async function gerarCodigoUnico(nome: string) {
  for (let i = 0; i < 12; i++) {
    const codigo = gerarCodigoBase(nome);
    const existe = await prisma.parceiro.findUnique({ where: { codigo } });
    if (!existe) return codigo;
  }
  return `PAR${Date.now().toString(36).toUpperCase()}`;
}

function resumoComissoes(comissoes: Pick<Comissao, 'valorVenda' | 'valorComissao' | 'status'>[]) {
  let vendas = 0;
  let valorVendido = 0;
  let comissaoTotal = 0;
  let comissaoPendente = 0;
  let comissaoPaga = 0;

  for (const c of comissoes) {
    if (c.status === 'cancelada') continue;
    vendas += 1;
    valorVendido += toNumber(c.valorVenda);
    const com = toNumber(c.valorComissao);
    comissaoTotal += com;
    if (c.status === 'paga') comissaoPaga += com;
    else comissaoPendente += com;
  }

  return {
    vendas,
    valorVendido: Number(valorVendido.toFixed(2)),
    comissaoTotal: Number(comissaoTotal.toFixed(2)),
    comissaoPendente: Number(comissaoPendente.toFixed(2)),
    comissaoPaga: Number(comissaoPaga.toFixed(2)),
  };
}

function linkIndicacao(codigo: string | null) {
  return codigo ? `${baseUrl()}/cadastro?ref=${codigo}` : null;
}

export class ParceirosService {
  async listar() {
    const parceiros = await prisma.parceiro.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      include: {
        comissoes: { select: { valorVenda: true, valorComissao: true, status: true } },
        _count: { select: { clientes: true } },
      },
    });

    return parceiros.map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      telefone: p.telefone,
      cnpj: p.cnpj,
      categoria: p.categoria,
      codigo: p.codigo,
      comissaoPercent: toNumber(p.comissaoPercent),
      ativo: p.ativo,
      createdAt: p.createdAt,
      link: linkIndicacao(p.codigo),
      clientes: p._count.clientes,
      ...resumoComissoes(p.comissoes),
    }));
  }

  async criar(data: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    categoria?: string;
    cnpj?: string;
    comissaoPercent?: number;
  }) {
    if (!data.nome || !data.email || !data.senha) {
      throw new Error('Nome, e-mail e senha são obrigatórios');
    }

    const emailUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailUser) throw new Error('Já existe um usuário com este e-mail');

    const codigo = await gerarCodigoUnico(data.nome);
    const senhaHash = await bcrypt.hash(data.senha, 10);

    const user = await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
        role: 'parceiro',
        ativo: true,
      },
    });

    const parceiro = await prisma.parceiro.create({
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || '',
        categoria: data.categoria || 'vendas',
        cnpj: data.cnpj?.replace(/\D/g, '') || null,
        codigo,
        comissaoPercent: data.comissaoPercent ?? 10,
        userId: user.id,
        ativo: true,
      },
    });

    return { ...parceiro, link: linkIndicacao(parceiro.codigo) };
  }

  async atualizar(
    id: string,
    data: Partial<{
      nome: string;
      email: string;
      telefone: string;
      cnpj: string;
      categoria: string;
      codigo: string;
      comissaoPercent: number;
      ativo: boolean;
      senha: string;
      recalcularPendentes: boolean;
    }>
  ) {
    const parceiro = await prisma.parceiro.findUnique({ where: { id } });
    if (!parceiro) throw new Error('Parceiro não encontrado');

    if (data.email && data.email !== parceiro.email) {
      const dup = await prisma.user.findFirst({
        where: { email: data.email, NOT: parceiro.userId ? { id: parceiro.userId } : undefined },
      });
      if (dup) throw new Error('Já existe um usuário com este e-mail');
    }

    if (data.codigo !== undefined && data.codigo !== parceiro.codigo) {
      const codigo = data.codigo.trim().toUpperCase();
      if (!codigo) throw new Error('Código de indicação não pode ser vazio');
      const dupCodigo = await prisma.parceiro.findFirst({
        where: { codigo, NOT: { id } },
      });
      if (dupCodigo) throw new Error('Já existe um parceiro com este código');
    }

    const cnpjLimpo =
      data.cnpj !== undefined ? data.cnpj.replace(/\D/g, '') || null : undefined;
    if (cnpjLimpo) {
      const dupCnpj = await prisma.parceiro.findFirst({
        where: { cnpj: cnpjLimpo, NOT: { id } },
      });
      if (dupCnpj) throw new Error('Já existe um parceiro com este CNPJ');
    }

    await prisma.parceiro.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.telefone !== undefined && { telefone: data.telefone }),
        ...(cnpjLimpo !== undefined && { cnpj: cnpjLimpo }),
        ...(data.categoria !== undefined && { categoria: data.categoria }),
        ...(data.codigo !== undefined && { codigo: data.codigo.trim().toUpperCase() }),
        ...(data.comissaoPercent !== undefined && { comissaoPercent: data.comissaoPercent }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
    });

    if (parceiro.userId) {
      const userUpdate: { nome?: string; email?: string; ativo?: boolean; senhaHash?: string } = {};
      if (data.nome !== undefined) userUpdate.nome = data.nome;
      if (data.email !== undefined) userUpdate.email = data.email;
      if (data.ativo !== undefined) userUpdate.ativo = data.ativo;
      if (data.senha) userUpdate.senhaHash = await bcrypt.hash(data.senha, 10);
      if (Object.keys(userUpdate).length) {
        await prisma.user.update({ where: { id: parceiro.userId }, data: userUpdate });
      }
    }

    if (data.recalcularPendentes && data.comissaoPercent !== undefined) {
      await this.recalcularComissoesPendentes(id, data.comissaoPercent);
    }

    return this.detalhe(id);
  }

  async recalcularComissoesPendentes(parceiroId: string, percentual?: number) {
    const parceiro = await prisma.parceiro.findUnique({ where: { id: parceiroId } });
    if (!parceiro) throw new Error('Parceiro não encontrado');

    const pct = percentual ?? toNumber(parceiro.comissaoPercent);
    const pendentes = await prisma.comissao.findMany({
      where: { parceiroId, status: 'pendente' },
    });

    for (const c of pendentes) {
      const valorVenda = toNumber(c.valorVenda);
      const valorComissao = Number(((valorVenda * pct) / 100).toFixed(2));
      await prisma.comissao.update({
        where: { id: c.id },
        data: { percentual: pct, valorComissao },
      });
    }

    return pendentes.length;
  }

  async remover(id: string) {
    const parceiro = await prisma.parceiro.findUnique({ where: { id } });
    if (!parceiro) throw new Error('Parceiro não encontrado');

    // Desvincula clientes e remove comissões e o usuário de acesso
    await prisma.$transaction([
      prisma.cliente.updateMany({ where: { parceiroId: id }, data: { parceiroId: null } }),
      prisma.comissao.deleteMany({ where: { parceiroId: id } }),
      prisma.parceiro.delete({ where: { id } }),
    ]);

    if (parceiro.userId) {
      await prisma.refreshToken.deleteMany({ where: { userId: parceiro.userId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: parceiro.userId } });
      await prisma.user.delete({ where: { id: parceiro.userId } }).catch(() => {});
    }

    return { id, deleted: true };
  }

  async detalhe(id: string) {
    const parceiro = await prisma.parceiro.findUnique({
      where: { id },
      include: {
        clientes: { select: { id: true, nome: true, email: true, telefone: true, createdAt: true } },
        comissoes: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!parceiro) throw new Error('Parceiro não encontrado');

    return {
      id: parceiro.id,
      nome: parceiro.nome,
      email: parceiro.email,
      telefone: parceiro.telefone,
      cnpj: parceiro.cnpj,
      categoria: parceiro.categoria,
      codigo: parceiro.codigo,
      comissaoPercent: toNumber(parceiro.comissaoPercent),
      ativo: parceiro.ativo,
      link: linkIndicacao(parceiro.codigo),
      clientes: parceiro.clientes,
      comissoes: parceiro.comissoes.map(this.serializarComissao),
      ...resumoComissoes(parceiro.comissoes),
    };
  }

  async marcarComissao(comissaoId: string, paga: boolean) {
    return this.atualizarComissao(comissaoId, { status: paga ? 'paga' : 'pendente' });
  }

  async atualizarComissao(
    comissaoId: string,
    data: Partial<{
      descricao: string;
      valorVenda: number;
      percentual: number;
      valorComissao: number;
      status: string;
      paga: boolean;
    }>
  ) {
    const comissao = await prisma.comissao.findUnique({ where: { id: comissaoId } });
    if (!comissao) throw new Error('Comissão não encontrada');

    const valorVenda = data.valorVenda !== undefined ? data.valorVenda : toNumber(comissao.valorVenda);
    const percentual = data.percentual !== undefined ? data.percentual : toNumber(comissao.percentual);
    let valorComissao =
      data.valorComissao !== undefined ? data.valorComissao : toNumber(comissao.valorComissao);

    if (data.percentual !== undefined && data.valorComissao === undefined) {
      valorComissao = Number(((valorVenda * percentual) / 100).toFixed(2));
    } else if (data.valorVenda !== undefined && data.percentual !== undefined && data.valorComissao === undefined) {
      valorComissao = Number(((valorVenda * percentual) / 100).toFixed(2));
    }

    let status = data.status;
    if (data.paga !== undefined) status = data.paga ? 'paga' : 'pendente';
    if (status && !['pendente', 'paga', 'cancelada'].includes(status)) {
      throw new Error('Status inválido');
    }

    const statusFinal = status ?? comissao.status;
    const pagaEm =
      statusFinal === 'paga'
        ? comissao.pagaEm ?? new Date()
        : statusFinal === 'pendente'
          ? null
          : comissao.pagaEm;

    return prisma.comissao.update({
      where: { id: comissaoId },
      data: {
        ...(data.descricao !== undefined && { descricao: data.descricao || null }),
        ...(data.valorVenda !== undefined && { valorVenda }),
        ...(data.percentual !== undefined && { percentual }),
        ...(data.valorComissao !== undefined || data.percentual !== undefined || data.valorVenda !== undefined
          ? { valorComissao }
          : {}),
        ...(status && { status: statusFinal, pagaEm }),
      },
    });
  }

  async excluirComissao(comissaoId: string) {
    const comissao = await prisma.comissao.findUnique({ where: { id: comissaoId } });
    if (!comissao) throw new Error('Comissão não encontrada');
    await prisma.comissao.delete({ where: { id: comissaoId } });
    return { id: comissaoId, deleted: true };
  }

  /** Dashboard do próprio parceiro logado */
  async resumoDoUsuario(userId: string) {
    const parceiro = await prisma.parceiro.findUnique({ where: { userId } });
    if (!parceiro) throw new Error('Parceiro não encontrado');
    return this.detalhe(parceiro.id);
  }

  private serializarComissao(c: Comissao) {
    return {
      id: c.id,
      descricao: c.descricao,
      valorVenda: toNumber(c.valorVenda),
      percentual: toNumber(c.percentual),
      valorComissao: toNumber(c.valorComissao),
      status: c.status,
      pagaEm: c.pagaEm,
      createdAt: c.createdAt,
    };
  }
}

export const parceirosService = new ParceirosService();

/**
 * Gera a comissão de um pagamento confirmado, caso o cliente tenha sido indicado
 * por um parceiro ativo. Idempotente por pedido (pedidoId é único em comissoes).
 */
export async function gerarComissaoDoPagamento(input: {
  clienteId: string;
  pedidoId: string;
  valor: number;
  descricao?: string | null;
}) {
  if (!input.pedidoId) return;

  const jaExiste = await prisma.comissao.findUnique({ where: { pedidoId: input.pedidoId } });
  if (jaExiste) return;

  const cliente = await prisma.cliente.findUnique({
    where: { id: input.clienteId },
    include: { parceiro: true },
  });

  const parceiro: Parceiro | null = cliente?.parceiro ?? null;
  if (!parceiro || !parceiro.ativo) return;

  const percentual = toNumber(parceiro.comissaoPercent);
  const valorComissao = Number(((input.valor * percentual) / 100).toFixed(2));

  await prisma.comissao.create({
    data: {
      parceiroId: parceiro.id,
      clienteId: input.clienteId,
      pedidoId: input.pedidoId,
      descricao: input.descricao || null,
      valorVenda: input.valor,
      percentual,
      valorComissao,
      status: 'pendente',
    },
  });
}
