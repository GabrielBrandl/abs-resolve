import { prisma } from '../utils/prisma.js';
import { ordemServicoService } from './ordemServico.service.js';
import { storageService } from './storage.service.js';
import { notificacaoService } from './notificacao.service.js';

function temFotoConclusao(checklist: Record<string, unknown>): boolean {
  return Boolean(checklist.fotoDepois || checklist.fotoConclusao);
}

export class TecnicoService {
  private async tecnicoDoUsuario(userId: string) {
    return prisma.tecnico.findFirst({ where: { userId, ativo: true } });
  }

  async minhasOs(userId: string) {
    const tecnico = await this.tecnicoDoUsuario(userId);

    const whereBase = {
      etapa: { in: ['execucao', 'conclusao', 'avaliacao'] as string[] },
    };

    const where = tecnico
      ? {
          ...whereBase,
          OR: [
            { tecnicoId: tecnico.id },
            { pedido: { agendamentos: { some: { tecnicoId: tecnico.id } } } },
          ],
        }
      : whereBase;

    return prisma.ordemServico.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nome: true } },
        pedido: {
          include: {
            cliente: { select: { nome: true, telefone: true, endereco: true } },
            agendamentos: { where: { status: { notIn: ['cancelado'] } }, take: 1, include: { tecnico: true } },
            solicitacao: { include: { servico: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async buscarOs(id: string, userId?: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        tecnico: true,
        pedido: {
          include: {
            cliente: true,
            agendamentos: true,
            solicitacao: { include: { servico: true } },
          },
        },
      },
    });
    if (!os) return null;

    if (userId) {
      const tecnico = await this.tecnicoDoUsuario(userId);
      if (tecnico && os.tecnicoId && os.tecnicoId !== tecnico.id) {
        throw new Error('OS não atribuída a você');
      }
    }

    return os;
  }

  async atualizarEtapa(id: string, etapa: string, userId?: string) {
    if (userId) await this.buscarOs(id, userId);
    return ordemServicoService.atualizarEtapa(id, etapa);
  }

  async voltarEtapaOs(id: string, userId: string) {
    const os = await this.buscarOs(id, userId);
    if (!os) throw new Error('OS não encontrada');
    if (os.checklistCompleto) throw new Error('OS já finalizada — não é possível voltar');

    const mapa: Record<string, string> = {
      avaliacao: 'conclusao',
      conclusao: 'execucao',
    };
    const novaEtapa = mapa[os.etapa];
    if (!novaEtapa) throw new Error('Não é possível voltar esta etapa');

    return ordemServicoService.atualizarEtapa(id, novaEtapa);
  }

  async uploadChecklistFoto(
    osId: string,
    userId: string,
    campo: string,
    file: Express.Multer.File
  ) {
    const os = await this.buscarOs(osId, userId);
    if (!os) throw new Error('OS não encontrada');

    const { url } = await storageService.upload(os.pedido.clienteId, file);
    const checklist = (os.checklist as Record<string, string>) || {};
    checklist[campo] = url;

    return ordemServicoService.atualizarChecklist(osId, checklist);
  }

  async atualizarChecklist(id: string, userId: string, checklist: Record<string, string>) {
    await this.buscarOs(id, userId);
    return ordemServicoService.atualizarChecklist(id, checklist);
  }

  async concluirServico(id: string, userId: string, data: { descricaoConclusao?: string; materiais?: string }) {
    const os = await this.buscarOs(id, userId);
    if (!os) throw new Error('OS não encontrada');

    const checklist = { ...(os.checklist as Record<string, string>), ...data };
    if (!temFotoConclusao(checklist)) {
      throw new Error('Envie a foto do serviço concluído para finalizar');
    }

    return ordemServicoService.atualizarChecklist(id, checklist);
  }

  async marcarACaminho(agendamentoId: string, userId: string) {
    const tecnico = await this.tecnicoDoUsuario(userId);
    const ag = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        cliente: { select: { nome: true, email: true, telefone: true } },
        pedido: { select: { numero: true } },
        tecnico: { select: { nome: true } },
      },
    });
    if (!ag) throw new Error('Agendamento não encontrado');
    if (tecnico && ag.tecnicoId && ag.tecnicoId !== tecnico.id) {
      throw new Error('Agendamento não atribuído a você');
    }

    const updated = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'a_caminho' },
    });

    notificacaoService
      .notificarTecnicoACaminho({
        email: ag.cliente.email,
        telefone: ag.cliente.telefone,
        clienteNome: ag.cliente.nome,
        pedidoNumero: ag.pedido?.numero,
        tecnicoNome: ag.tecnico?.nome || tecnico?.nome,
      })
      .catch(() => {});

    return updated;
  }

  async marcarChegada(agendamentoId: string, userId: string) {
    const tecnico = await this.tecnicoDoUsuario(userId);
    const ag = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        cliente: { select: { nome: true, email: true, telefone: true } },
        pedido: { select: { numero: true } },
        tecnico: { select: { nome: true } },
      },
    });
    if (!ag) throw new Error('Agendamento não encontrado');
    if (tecnico && ag.tecnicoId && ag.tecnicoId !== tecnico.id) {
      throw new Error('Agendamento não atribuído a você');
    }

    const updated = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'em_execucao' },
    });

    if (ag.pedidoId) {
      await prisma.pedido.update({
        where: { id: ag.pedidoId },
        data: { status: 'em_execucao' },
      });
      await prisma.ordemServico.updateMany({
        where: { pedidoId: ag.pedidoId },
        data: { etapa: 'execucao' },
      });
    }

    notificacaoService
      .notificarTecnicoChegou({
        email: ag.cliente.email,
        telefone: ag.cliente.telefone,
        clienteNome: ag.cliente.nome,
        pedidoNumero: ag.pedido?.numero,
        tecnicoNome: ag.tecnico?.nome || tecnico?.nome,
      })
      .catch(() => {});

    return updated;
  }

  async voltarAgendamento(agendamentoId: string, userId: string) {
    const tecnico = await this.tecnicoDoUsuario(userId);
    const ag = await prisma.agendamento.findUnique({ where: { id: agendamentoId } });
    if (!ag) throw new Error('Agendamento não encontrado');
    if (tecnico && ag.tecnicoId && ag.tecnicoId !== tecnico.id) {
      throw new Error('Agendamento não atribuído a você');
    }

    const mapa: Record<string, string> = {
      em_execucao: 'a_caminho',
      a_caminho: 'confirmado',
    };
    const novoStatus = mapa[ag.status];
    if (!novoStatus) throw new Error('Não é possível voltar esta etapa');

    return prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: novoStatus },
    });
  }

  async agendaHoje(userId: string) {
    const tecnico = await this.tecnicoDoUsuario(userId);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    return prisma.agendamento.findMany({
      where: {
        data: { gte: hoje, lt: amanha },
        status: { in: ['confirmado', 'a_caminho', 'em_execucao'] },
        ...(tecnico ? { OR: [{ tecnicoId: tecnico.id }, { tecnicoId: null }] } : {}),
      },
      include: {
        tecnico: { select: { nome: true } },
        cliente: { select: { nome: true, telefone: true, endereco: true } },
        pedido: { select: { numero: true, descricao: true } },
      },
      orderBy: { horarioInicio: 'asc' },
    });
  }

  /** Agenda virtual (semana/período) para o funcionário visualizar */
  async agendaVirtual(userId: string, dataInicio?: string, dias = 7) {
    const tecnico = await this.tecnicoDoUsuario(userId);
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date();
    inicio.setHours(0, 0, 0, 0);
    // começa na segunda da semana selecionada
    const diaSemana = inicio.getDay();
    const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicio.setDate(inicio.getDate() + diffSegunda);

    const janela = Math.max(1, Math.min(31, Number(dias) || 7));
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + janela - 1);
    fim.setHours(23, 59, 59, 999);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        data: { gte: inicio, lte: fim },
        status: { in: ['confirmado', 'reagendado', 'a_caminho', 'em_execucao'] },
        ...(tecnico ? { OR: [{ tecnicoId: tecnico.id }, { tecnicoId: null }] } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, email: true, endereco: true } },
        tecnico: { select: { id: true, nome: true } },
        pedido: {
          select: {
            id: true,
            numero: true,
            descricao: true,
            valor: true,
            status: true,
            ordemServico: { select: { observacoes: true } },
          },
        },
        solicitacao: {
          select: {
            opcoes: true,
            servico: { select: { nome: true, categoria: true, descricao: true } },
          },
        },
      },
      orderBy: [{ data: 'asc' }, { horarioInicio: 'asc' }],
    });

    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    return {
      agendamentos: agendamentos.map((ag) => {
        const opcoes = (ag.solicitacao?.opcoes || {}) as Record<string, unknown>;
        return {
          ...ag,
          servicoNome: ag.solicitacao?.servico?.nome || ag.pedido?.descricao || 'Serviço',
          detalhes: {
            oQueFazer: String(opcoes.oQueFazer || ag.pedido?.descricao || ''),
            observacoes: String(opcoes.observacoes || ag.pedido?.ordemServico?.observacoes || ''),
            materiais: String(opcoes.materiais || ''),
            acesso: String(opcoes.acesso || ''),
            contatoNoLocal: String(opcoes.contatoNoLocal || ''),
            prioridade: String(opcoes.prioridade || 'normal'),
            categoria: ag.solicitacao?.servico?.categoria || '',
            valor: ag.pedido?.valor != null ? Number(ag.pedido.valor) : null,
          },
        };
      }),
      tecnicos,
      meuTecnicoId: tecnico?.id || null,
      periodo: { inicio, fim },
      slotsPadrao: [
        { inicio: '08:00', fim: '10:00' },
        { inicio: '10:00', fim: '12:00' },
        { inicio: '14:00', fim: '16:00' },
        { inicio: '16:00', fim: '18:00' },
      ],
    };
  }
}

export const tecnicoService = new TecnicoService();
