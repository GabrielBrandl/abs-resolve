import { prisma } from '../utils/prisma.js';
import { confirmarPagamentoRecebido } from './pagamento-confirmacao.service.js';
import { asaasService } from './asaas.service.js';
import { notificacaoService } from './notificacao.service.js';

export class PagamentosService {
  async listar(filters: { status?: string; clienteId?: string; dataInicio?: string; dataFim?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.clienteId) where.clienteId = filters.clienteId;
    if (filters.dataInicio || filters.dataFim) {
      where.dueDate = {};
      if (filters.dataInicio) (where.dueDate as Record<string, Date>).gte = new Date(filters.dataInicio);
      if (filters.dataFim) (where.dueDate as Record<string, Date>).lte = new Date(filters.dataFim);
    }

    return prisma.pagamento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        pedido: { select: { numero: true } },
      },
    });
  }

  async criarCobranca(data: {
    clienteId: string;
    pedidoId?: string;
    valor: number;
    metodo: 'PIX' | 'BOLETO' | 'CARTAO';
    dueDate: string;
    solicitacaoId?: string;
  }) {
    const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const billingMap = { PIX: 'PIX', BOLETO: 'BOLETO', CARTAO: 'CREDIT_CARD' } as const;
    const doc = cliente.cpf || cliente.cnpj || '';

    const asaasCustomer = await asaasService.criarCliente(cliente.nome, cliente.email, doc);
    const cobranca = await asaasService.criarCobranca({
      customer: asaasCustomer.id,
      billingType: billingMap[data.metodo],
      value: data.valor,
      dueDate: data.dueDate,
      description: data.pedidoId ? `Pedido ABS Resolve` : 'Cobrança ABS Resolve',
    });

    let pagamento = await prisma.pagamento.create({
      data: {
        clienteId: data.clienteId,
        pedidoId: data.pedidoId,
        asaasId: cobranca.id,
        valor: data.valor,
        metodo: data.metodo,
        status: 'PENDING',
        dueDate: new Date(data.dueDate),
        invoiceUrl: cobranca.invoiceUrl || cobranca.bankSlipUrl,
        pixCode: cobranca.pixTransaction?.payload,
      },
      include: { cliente: true, pedido: { select: { numero: true } } },
    });

    notificacaoService
      .notificarCobrancaGerada({
        clienteNome: cliente.nome,
        valor: data.valor,
        metodo: data.metodo,
        vencimento: data.dueDate,
        email: cliente.email,
        telefone: cliente.telefone,
        pedidoNumero: pagamento.pedido?.numero,
        linkPagamento: pagamento.invoiceUrl,
        pixCode: pagamento.pixCode,
      })
      .catch(() => {});

    // Mock/dev: confirma pagamento automaticamente após 2s
    const isMock = !process.env.ASAAS_API_KEY || process.env.ASAAS_MOCK === 'true' || cobranca.id.startsWith('pay_mock');
    if (isMock && data.pedidoId) {
      pagamento = await prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { status: 'RECEIVED', paymentDate: new Date() },
        include: { cliente: true, pedido: { select: { numero: true } } },
      });
      await confirmarPagamentoRecebido(pagamento.id);
    }

    return pagamento;
  }

  async simularConfirmacao(pagamentoId: string, clienteId: string) {
    const pagamento = await prisma.pagamento.findFirst({ where: { id: pagamentoId, clienteId } });
    if (!pagamento) throw new Error('Pagamento não encontrado');

    await prisma.pagamento.update({
      where: { id: pagamentoId },
      data: { status: 'RECEIVED', paymentDate: new Date() },
    });
    return confirmarPagamentoRecebido(pagamentoId);
  }

  async segundaVia(id: string) {
    const pagamento = await prisma.pagamento.findUnique({ where: { id } });
    if (!pagamento) throw new Error('Pagamento não encontrado');
    if (!pagamento.asaasId) throw new Error('Pagamento sem integração Asaas');

    const cobranca = await asaasService.buscarCobranca(pagamento.asaasId);
    return {
      ...pagamento,
      invoiceUrl: cobranca.invoiceUrl || pagamento.invoiceUrl,
      pixCode: cobranca.pixTransaction?.payload || pagamento.pixCode,
    };
  }

  async dashboardFinanceiro() {
    const agora = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(agora);
    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const inicioMes = new Date(`${y}-${m}-01T00:00:00-03:00`);

    const [recebidos, pendentes, vencidos, totalMes] = await Promise.all([
      prisma.pagamento.findMany({ where: { status: 'RECEIVED' } }),
      prisma.pagamento.findMany({ where: { status: 'PENDING' } }),
      prisma.pagamento.findMany({ where: { status: 'OVERDUE' } }),
      prisma.pagamento.findMany({
        where: {
          status: 'RECEIVED',
          OR: [
            { paymentDate: { gte: inicioMes } },
            { paymentDate: null, createdAt: { gte: inicioMes } },
          ],
        },
      }),
    ]);

    const soma = (arr: { valor: unknown }[]) =>
      arr.reduce((s, p) => s + Number(p.valor), 0);

    return {
      receitaMes: soma(totalMes),
      totalRecebido: soma(recebidos),
      totalPendente: soma(pendentes),
      totalVencido: soma(vencidos),
      inadimplencia:
        recebidos.length + vencidos.length > 0
          ? (vencidos.length / (recebidos.length + vencidos.length)) * 100
          : 0,
      cobrancasVencendo: pendentes.filter((p) => {
        const diff = new Date(p.dueDate).getTime() - agora.getTime();
        return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }
}

export const pagamentosService = new PagamentosService();
