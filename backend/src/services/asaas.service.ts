import axios from 'axios';
import { prisma } from '../utils/prisma.js';

const asaasApi = axios.create({
  baseURL: process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3',
  headers: {
    access_token: process.env.ASAAS_API_KEY || '',
    'Content-Type': 'application/json',
  },
});

export class AsaasService {
  private get mockMode() {
    return !process.env.ASAAS_API_KEY;
  }

  async criarCobranca(data: {
    customer: string;
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
  }) {
    if (this.mockMode) {
      const mockId = `pay_mock_${Date.now()}`;
      return {
        id: mockId,
        status: 'PENDING',
        invoiceUrl: `https://sandbox.asaas.com/i/${mockId}`,
        bankSlipUrl: `https://sandbox.asaas.com/b/${mockId}`,
        pixTransaction: { payload: `00020126MOCKPIX${mockId}` },
      };
    }

    const { data: response } = await asaasApi.post('/payments', data);
    return response;
  }

  async criarCliente(nome: string, email: string, cpfCnpj: string) {
    if (this.mockMode) {
      return { id: `cus_mock_${Date.now()}` };
    }

    const { data } = await asaasApi.post('/customers', {
      name: nome,
      email,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
    });
    return data;
  }

  async buscarCobranca(asaasId: string) {
    if (this.mockMode) {
      return { id: asaasId, status: 'PENDING' };
    }
    const { data } = await asaasApi.get(`/payments/${asaasId}`);
    return data;
  }

  async processarWebhook(event: string, payment: { id: string; status: string; paymentDate?: string }) {
    const pagamento = await prisma.pagamento.findUnique({ where: { asaasId: payment.id } });
    if (!pagamento) return null;

    const statusMap: Record<string, string> = {
      PAYMENT_RECEIVED: 'RECEIVED',
      PAYMENT_CONFIRMED: 'RECEIVED',
      PAYMENT_OVERDUE: 'OVERDUE',
      PAYMENT_REFUNDED: 'REFUNDED',
    };

    const novoStatus = statusMap[payment.status] || pagamento.status;

    return prisma.pagamento.update({
      where: { id: pagamento.id },
      data: {
        status: novoStatus,
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
      },
      include: { cliente: true },
    });
  }
}

export const asaasService = new AsaasService();
