import axios, { isAxiosError } from 'axios';
import { prisma } from '../utils/prisma.js';
import { confirmarPagamentoRecebido } from './pagamento-confirmacao.service.js';

const asaasApi = axios.create({
  baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
  headers: {
    // EasyPanel às vezes escapa $ como $$ na env
    access_token: (process.env.ASAAS_API_KEY || '').replace(/^\$\$/, '$'),
    'Content-Type': 'application/json',
  },
});

function asaasErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { errors?: Array<{ description?: string }> } | undefined;
    const desc = body?.errors?.map((e) => e.description).filter(Boolean).join('; ');
    if (desc) return desc;
    if (err.response?.status) return `Asaas HTTP ${err.response.status}`;
  }
  return err instanceof Error ? err.message : 'Erro na integração Asaas';
}

function mockCobranca() {
  const mockId = `pay_mock_${Date.now()}`;
  return {
    id: mockId,
    status: 'PENDING',
    invoiceUrl: `https://sandbox.asaas.com/i/${mockId}`,
    bankSlipUrl: `https://sandbox.asaas.com/b/${mockId}`,
    pixTransaction: { payload: `00020126MOCKPIX${mockId}` },
  };
}

export class AsaasService {
  private get mockMode() {
    const key = (process.env.ASAAS_API_KEY || '').replace(/^\$\$/, '$');
    return !key || process.env.ASAAS_MOCK === 'true';
  }

  private get devFallback() {
    return process.env.NODE_ENV !== 'production' && process.env.ASAAS_MOCK !== 'false';
  }

  private warnFallback(action: string, err: unknown) {
    console.warn(`[Asaas] ${action} falhou — usando mock local:`, asaasErrorMessage(err));
  }

  async criarCobranca(data: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
  }) {
    if (this.mockMode) return mockCobranca();

    try {
      const { data: response } = await asaasApi.post('/payments', data);
      return response;
    } catch (err) {
      if (this.devFallback) {
        this.warnFallback('criarCobranca', err);
        return mockCobranca();
      }
      throw new Error(asaasErrorMessage(err));
    }
  }

  async criarCliente(nome: string, email: string, cpfCnpj: string) {
    if (this.mockMode) return { id: `cus_mock_${Date.now()}` };

    const doc = cpfCnpj.replace(/\D/g, '');

    try {
      const { data: list } = await asaasApi.get('/customers', { params: { cpfCnpj: doc, limit: 1 } });
      if (list.data?.length) return list.data[0];

      const { data } = await asaasApi.post('/customers', { name: nome, email, cpfCnpj: doc });
      return data;
    } catch (err) {
      if (this.devFallback) {
        this.warnFallback('criarCliente', err);
        return { id: `cus_mock_dev_${Date.now()}` };
      }
      throw new Error(asaasErrorMessage(err));
    }
  }

  async buscarCobranca(asaasId: string) {
    if (this.mockMode || asaasId.startsWith('pay_mock')) {
      return {
        id: asaasId,
        status: 'PENDING',
        invoiceUrl: `https://sandbox.asaas.com/i/${asaasId}`,
        pixTransaction: { payload: `00020126MOCKPIX${asaasId}` },
      };
    }

    try {
      const { data } = await asaasApi.get(`/payments/${asaasId}`);
      return data;
    } catch (err) {
      if (this.devFallback) {
        this.warnFallback('buscarCobranca', err);
        return { id: asaasId, status: 'PENDING' };
      }
      throw new Error(asaasErrorMessage(err));
    }
  }

  /**
   * Consulta o Asaas e, se a cobrança já foi paga, confirma no sistema.
   * Usado no polling do cliente e no cron — não depende só do webhook.
   */
  async sincronizarPagamentoLocal(pagamentoId: string) {
    const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } });
    if (!pagamento?.asaasId || pagamento.asaasId.startsWith('pay_mock')) return pagamento;
    if (pagamento.status === 'RECEIVED') return pagamento;

    const cobranca = await this.buscarCobranca(pagamento.asaasId);
    const statusMap: Record<string, string> = {
      RECEIVED: 'RECEIVED',
      CONFIRMED: 'RECEIVED',
      RECEIVED_IN_CASH: 'RECEIVED',
      OVERDUE: 'OVERDUE',
      REFUNDED: 'REFUNDED',
      PENDING: 'PENDING',
    };
    const novoStatus = statusMap[cobranca.status] || pagamento.status;

    if (novoStatus === pagamento.status && novoStatus !== 'RECEIVED') {
      if (novoStatus === 'OVERDUE' && pagamento.status !== 'OVERDUE') {
        return prisma.pagamento.update({
          where: { id: pagamento.id },
          data: { status: 'OVERDUE' },
        });
      }
      return pagamento;
    }

    if (novoStatus === 'OVERDUE' || novoStatus === 'REFUNDED' || novoStatus === 'PENDING') {
      if (novoStatus !== pagamento.status) {
        return prisma.pagamento.update({
          where: { id: pagamento.id },
          data: { status: novoStatus },
        });
      }
      return pagamento;
    }

    if (novoStatus === 'RECEIVED') {
      const paymentDate = cobranca.paymentDate || cobranca.confirmedDate
        ? new Date(cobranca.paymentDate || cobranca.confirmedDate)
        : new Date();

      const updated = await prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { status: 'RECEIVED', paymentDate },
      });
      await confirmarPagamentoRecebido(updated.id);
      return prisma.pagamento.findUnique({ where: { id: pagamento.id } });
    }

    return pagamento;
  }

  async sincronizarPendentes() {
    const pendentes = await prisma.pagamento.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        asaasId: { not: null },
        NOT: { asaasId: { startsWith: 'pay_mock' } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    let confirmados = 0;
    let atualizados = 0;

    for (const pg of pendentes) {
      try {
        const antes = pg.status;
        const depois = await this.sincronizarPagamentoLocal(pg.id);
        if (depois && depois.status !== antes) {
          atualizados += 1;
          if (depois.status === 'RECEIVED') confirmados += 1;
        }
      } catch (err) {
        console.warn(`[Asaas sync] ${pg.asaasId}:`, err instanceof Error ? err.message : err);
      }
    }

    return { verificados: pendentes.length, atualizados, confirmados };
  }

  async processarWebhook(event: string, payment: { id: string; status: string; paymentDate?: string }) {
    const pagamento = await prisma.pagamento.findUnique({ where: { asaasId: payment.id } });
    if (!pagamento) return null;

    // Asaas envia event=PAYMENT_RECEIVED e payment.status=RECEIVED — mapear os dois
    const eventMap: Record<string, string> = {
      PAYMENT_RECEIVED: 'RECEIVED',
      PAYMENT_CONFIRMED: 'RECEIVED',
      PAYMENT_OVERDUE: 'OVERDUE',
      PAYMENT_REFUNDED: 'REFUNDED',
      PAYMENT_DELETED: 'REFUNDED',
    };
    const statusMap: Record<string, string> = {
      RECEIVED: 'RECEIVED',
      CONFIRMED: 'RECEIVED',
      OVERDUE: 'OVERDUE',
      REFUNDED: 'REFUNDED',
      PENDING: 'PENDING',
    };

    const novoStatus = eventMap[event] || statusMap[payment.status] || pagamento.status;
    const paymentDate =
      payment.paymentDate
        ? new Date(payment.paymentDate)
        : novoStatus === 'RECEIVED' && !pagamento.paymentDate
          ? new Date()
          : undefined;

    const updated = await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: {
        status: novoStatus,
        ...(paymentDate ? { paymentDate } : {}),
      },
      include: { cliente: true },
    });

    if (novoStatus === 'RECEIVED') {
      await confirmarPagamentoRecebido(updated.id).catch((err) =>
        console.warn('[Asaas webhook] confirmar pagamento:', err)
      );
    }

    return updated;
  }
}

export const asaasService = new AsaasService();
