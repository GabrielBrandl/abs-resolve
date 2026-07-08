import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma.js';
import { Role } from '@prisma/client';
import { apagarClienteCascade } from '../utils/cliente-cascade.js';

export class AdminEquipeService {
  async listarUsuarios() {
    return prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
        clienteId: true,
        tecnico: { select: { id: true, nome: true, ativo: true, capacidadeDiaria: true } },
      },
      orderBy: [{ ativo: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async criarUsuario(data: {
    nome: string;
    email: string;
    senha: string;
    role: string;
    capacidadeDiaria?: number;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email já cadastrado');

    const role = data.role as Role;
    const senhaHash = await bcrypt.hash(data.senha, 10);

    const user = await prisma.user.create({
      data: { nome: data.nome, email: data.email, senhaHash, role, ativo: true },
      select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
    });

    if (role === 'operacional') {
      await prisma.tecnico.create({
        data: {
          nome: data.nome,
          userId: user.id,
          capacidadeDiaria: data.capacidadeDiaria ?? 6,
          ativo: true,
        },
      });
    }

    return this.listarUsuarios().then((lista) => lista.find((u) => u.id === user.id) || user);
  }

  async criarCliente(data: {
    nome: string;
    email: string;
    senha: string;
    cpf: string;
    telefone: string;
    endereco?: Record<string, string>;
  }) {
    const doc = data.cpf.replace(/\D/g, '');
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error('Email já cadastrado');

    const existingCpf = await prisma.cliente.findUnique({ where: { cpf: doc } });
    if (existingCpf) throw new Error('CPF já cadastrado');

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const cliente = await prisma.cliente.create({
      data: {
        tipo: 'PF',
        nome: data.nome,
        cpf: doc,
        email: data.email,
        telefone: data.telefone,
        whatsapp: data.telefone,
        endereco: data.endereco || {},
        consentimentoLgpd: true,
        dataAceite: new Date(),
      },
    });

    await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
        role: 'cliente',
        clienteId: cliente.id,
        ativo: true,
      },
    });

    return cliente;
  }

  async atualizarUsuario(
    id: string,
    data: { nome?: string; email?: string; senha?: string; role?: string; capacidadeDiaria?: number }
  ) {
    const user = await prisma.user.findUnique({ where: { id }, include: { tecnico: true } });
    if (!user) throw new Error('Usuário não encontrado');

    if (data.email && data.email !== user.email) {
      const dup = await prisma.user.findUnique({ where: { email: data.email } });
      if (dup) throw new Error('Email já cadastrado');
    }

    const update: { nome?: string; email?: string; senhaHash?: string; role?: Role } = {};
    if (data.nome) update.nome = data.nome;
    if (data.email) update.email = data.email;
    if (data.role) update.role = data.role as Role;
    if (data.senha) update.senhaHash = await bcrypt.hash(data.senha, 10);

    if (Object.keys(update).length) {
      await prisma.user.update({ where: { id }, data: update });
    }

    if (user.tecnico) {
      const tecUpdate: { nome?: string; capacidadeDiaria?: number } = {};
      if (data.nome) tecUpdate.nome = data.nome;
      if (data.capacidadeDiaria !== undefined) tecUpdate.capacidadeDiaria = data.capacidadeDiaria;
      if (Object.keys(tecUpdate).length) {
        await prisma.tecnico.update({ where: { id: user.tecnico.id }, data: tecUpdate });
      }
    } else if (data.role === 'operacional' || (user.role === 'operacional' && !user.tecnico)) {
      await prisma.tecnico.create({
        data: {
          nome: data.nome || user.nome,
          userId: id,
          capacidadeDiaria: data.capacidadeDiaria ?? 6,
          ativo: true,
        },
      });
    }

    return this.listarUsuarios().then((lista) => lista.find((u) => u.id === id));
  }

  async deletarUsuario(id: string, requesterId: string) {
    if (id === requesterId) throw new Error('Não é possível excluir seu próprio usuário');

    const user = await prisma.user.findUnique({ where: { id }, include: { tecnico: true } });
    if (!user) throw new Error('Usuário não encontrado');

    if (user.role === 'admin') {
      const adminsAtivos = await prisma.user.count({ where: { role: 'admin', ativo: true } });
      if (adminsAtivos <= 1) throw new Error('Não é possível excluir o único administrador');
    }

    // Cliente: remove o cadastro completo (libera CPF/CNPJ para novo cadastro)
    if (user.role === 'cliente' && user.clienteId) {
      await apagarClienteCascade(user.clienteId);
      return { id, deleted: true };
    }

    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: id } });

    if (user.tecnico) {
      await prisma.tecnico.update({
        where: { id: user.tecnico.id },
        data: { userId: null, ativo: false },
      });
    }

    await prisma.user.delete({ where: { id } });
    return { id, deleted: true };
  }

  async alterarStatusUsuario(id: string, ativo: boolean) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { tecnico: true },
    });
    if (!user) throw new Error('Usuário não encontrado');
    if (user.role === 'admin' && !ativo) {
      const adminsAtivos = await prisma.user.count({ where: { role: 'admin', ativo: true } });
      if (adminsAtivos <= 1) throw new Error('Não é possível desativar o único administrador ativo');
    }

    await prisma.user.update({ where: { id }, data: { ativo } });

    if (user.tecnico) {
      await prisma.tecnico.update({ where: { id: user.tecnico.id }, data: { ativo } });
    }

    if (!ativo) {
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return { id, ativo };
  }

  async listarAtribuicoes() {
    const agendamentos = await prisma.agendamento.findMany({
      where: { status: { notIn: ['cancelado'] } },
      include: {
        cliente: { select: { nome: true, telefone: true, endereco: true } },
        tecnico: { select: { id: true, nome: true } },
        pedido: {
          select: {
            id: true,
            numero: true,
            descricao: true,
            status: true,
            ordemServico: {
              select: {
                id: true,
                etapa: true,
                checklistCompleto: true,
                checklist: true,
                tecnico: { select: { id: true, nome: true } },
              },
            },
          },
        },
        solicitacao: {
          select: {
            id: true,
            fotos: true,
            opcoes: true,
            servico: { select: { nome: true, slug: true, categoria: true } },
          },
        },
      },
      orderBy: [{ data: 'asc' }, { horarioInicio: 'asc' }],
      take: 100,
    });

    return agendamentos;
  }

  async atribuirTecnico(agendamentoId: string, tecnicoId: string | null) {
    const ag = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { pedido: { include: { ordemServico: true } } },
    });
    if (!ag) throw new Error('Agendamento não encontrado');

    if (tecnicoId) {
      const tecnico = await prisma.tecnico.findFirst({ where: { id: tecnicoId, ativo: true } });
      if (!tecnico) throw new Error('Técnico não encontrado ou inativo');
    }

    const updated = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { tecnicoId },
      include: {
        tecnico: true,
        cliente: { select: { nome: true } },
        pedido: { select: { numero: true, ordemServico: true } },
      },
    });

    if (ag.pedido?.ordemServico) {
      await prisma.ordemServico.update({
        where: { id: ag.pedido.ordemServico.id },
        data: { tecnicoId },
      });
    }

    return updated;
  }

  async listarTecnicosComCarga() {
    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      include: {
        user: { select: { email: true, ativo: true } },
        _count: {
          select: {
            agendamentos: { where: { status: { notIn: ['cancelado', 'reagendado'] } } },
            ordensServico: { where: { etapa: { in: ['execucao', 'conclusao'] } } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return tecnicos.map((t) => ({
      id: t.id,
      nome: t.nome,
      email: t.user?.email,
      capacidadeDiaria: t.capacidadeDiaria,
      agendamentosAtivos: t._count.agendamentos,
      osEmAndamento: t._count.ordensServico,
    }));
  }
}

export const adminEquipeService = new AdminEquipeService();
