import { prisma } from '../utils/prisma.js';
import { gerarNumeroPedido } from '../utils/helpers.js';
import { notificacaoService } from './notificacao.service.js';

const STATUS_PEDIDO = [
  'recebido',
  'em_analise',
  'aguardando_documentacao',
  'em_processamento',
  'em_execucao',
  'finalizado',
  'cancelado',
];

export class PedidosService {
  async listar(filters: { status?: string; busca?: string; clienteId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.clienteId) where.clienteId = filters.clienteId;
    if (filters.busca) {
      where.OR = [
        { numero: { contains: filters.busca, mode: 'insensitive' } },
        { cliente: { nome: { contains: filters.busca, mode: 'insensitive' } } },
      ];
    }

    return prisma.pedido.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        ordemServico: true,
        servico: { select: { nome: true } },
      },
    });
  }

  async buscarPorId(id: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        ordemServico: true,
        servico: true,
        pagamentos: true,
      },
    });
    if (!pedido) throw new Error('Pedido não encontrado');
    return pedido;
  }

  async criar(data: {
    clienteId: string;
    valor: number;
    responsavel: string;
    descricao?: string;
    servicoId?: string;
  }) {
    const numero = await gerarNumeroPedido();
    const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const pedido = await prisma.pedido.create({
      data: {
        numero,
        clienteId: data.clienteId,
        valor: data.valor,
        responsavel: data.responsavel,
        descricao: data.descricao,
        servicoId: data.servicoId,
      },
      include: { cliente: true },
    });

    notificacaoService
      .notificarNovoPedido(cliente.nome, numero, cliente.email, cliente.telefone)
      .catch(() => {});

    return pedido;
  }

  async atualizarStatus(id: string, status: string) {
    if (!STATUS_PEDIDO.includes(status)) throw new Error('Status inválido');

    const pedido = await prisma.pedido.update({
      where: { id },
      data: { status },
      include: { cliente: true },
    });

    notificacaoService
      .notificarMudancaStatus('pedido', pedido.numero, status, pedido.cliente.email)
      .catch(() => {});

    return pedido;
  }

  getStatusList() {
    return STATUS_PEDIDO;
  }
}

export const pedidosService = new PedidosService();
