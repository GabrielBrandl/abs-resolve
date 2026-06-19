import { prisma } from '../utils/prisma.js';
import { notificacaoService } from './notificacao.service.js';

const ETAPAS_OS = [
  'solicitacao',
  'analise',
  'orcamento',
  'aprovacao',
  'execucao',
  'conclusao',
  'avaliacao',
];

export class OrdemServicoService {
  async listar(filters: { etapa?: string; parceiro?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.etapa) where.etapa = filters.etapa;
    if (filters.parceiro) where.parceiro = filters.parceiro;

    return prisma.ordemServico.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        pedido: {
          include: { cliente: { select: { nome: true } } },
        },
      },
    });
  }

  async buscarPorId(id: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: { pedido: { include: { cliente: true } } },
    });
    if (!os) throw new Error('Ordem de serviço não encontrada');
    return os;
  }

  async criar(pedidoId: string, data: { observacoes?: string; parceiro?: string }) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { ordemServico: true },
    });
    if (!pedido) throw new Error('Pedido não encontrado');
    if (pedido.ordemServico) throw new Error('Pedido já possui ordem de serviço');

    return prisma.ordemServico.create({
      data: { pedidoId, ...data },
      include: { pedido: { include: { cliente: true } } },
    });
  }

  async atualizarEtapa(id: string, etapa: string) {
    if (!ETAPAS_OS.includes(etapa)) throw new Error('Etapa inválida');

    const os = await prisma.ordemServico.update({
      where: { id },
      data: { etapa },
      include: { pedido: { include: { cliente: true } } },
    });

    notificacaoService
      .notificarMudancaStatus('OS', os.pedido.numero, etapa, os.pedido.cliente.email)
      .catch(() => {});

    return os;
  }

  async atualizar(id: string, data: { observacoes?: string; parceiro?: string }) {
    return prisma.ordemServico.update({
      where: { id },
      data,
      include: { pedido: { include: { cliente: true } } },
    });
  }

  getEtapas() {
    return ETAPAS_OS;
  }
}

export const ordemServicoService = new OrdemServicoService();
