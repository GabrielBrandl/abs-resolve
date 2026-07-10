import axios, { isAxiosError } from 'axios';
import { prisma } from '../utils/prisma.js';
import { confirmarPagamentoRecebido } from './pagamento-confirmacao.service.js';

const asaasApi = axios.create({
  baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
  headers: {
    access_token: process.env.ASAAS_API_KEY || '',
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
    return !process.env.ASAAS_API_KEY || process.env.ASAAS_MOCK === 'true';
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
