import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { nfseService } from './nfse.service.js';

export class NfseAdminService {
  private get mockMode() {
    return !process.env.FOCUS_NFE_TOKEN || process.env.NFSE_MOCK === 'true';
  }

  private get ambiente() {
    return process.env.FOCUS_NFE_AMBIENTE === 'producao' ? 'producao' : 'homologacao';
  }

  async dashboard() {
    const [total, autorizadas, processando, erro, valorAgg] = await Promise.all([
      prisma.nfse.count(),
      prisma.nfse.count({ where: { status: 'autorizada' } }),
      prisma.nfse.count({ where: { status: 'processando' } }),
      prisma.nfse.count({ where: { status: 'erro' } }),
      prisma.nfse.findMany({
        where: { status: 'autorizada' },
        include: { pagamento: { select: { valor: true } } },
      }),
    ]);

    const valorEmitido = valorAgg.reduce((sum, n) => sum + toNumber(n.pagamento?.valor), 0);

    return {
      total,
      autorizadas,
      processando,
      erro,
      valorEmitido: Math.round(valorEmitido * 100) / 100,
      mockMode: this.mockMode,
      ambiente: this.ambiente,
      provider: 'Focus NFe',
    };
  }

  async listar(filters: { status?: string; busca?: string; de?: string; ate?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.de || filters.ate) {
      where.createdAt = {
        ...(filters.de ? { gte: new Date(filters.de) } : {}),
        ...(filters.ate ? { lte: new Date(`${filters.ate}T23:59:59.999`) } : {}),
      };
    }
    if (filters.busca) {
      where.OR = [
        { numero: { contains: filters.busca, mode: 'insensitive' } },
        { providerRef: { contains: filters.busca, mode: 'insensitive' } },
        { pedido: { numero: { contains: filters.busca, mode: 'insensitive' } } },
        { pedido: { cliente: { nome: { contains: filters.busca, mode: 'insensitive' } } } },
      ];
    }

    return prisma.nfse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        pedido: {
          select: {
            id: true,
            numero: true,
            descricao: true,
            valor: true,
            cliente: { select: { id: true, nome: true, email: true, cpf: true, cnpj: true } },
          },
        },
        pagamento: { select: { id: true, valor: true, metodo: true, status: true, paymentDate: true } },
      },
    });
  }

  async buscar(id: string) {
    const nf = await prisma.nfse.findUnique({
      where: { id },
      include: {
        pedido: {
          include: {
            cliente: true,
            solicitacao: { include: { servico: true } },
          },
        },
        pagamento: true,
      },
    });
    if (!nf) throw new Error('Nota fiscal não encontrada');
    return nf;
  }

  async consultar(id: string) {
    const nf = await this.buscar(id);
    if (!nf.providerRef || this.mockMode) return nf;

    const token = process.env.FOCUS_NFE_TOKEN!;
    const auth = Buffer.from(`${token}:`).toString('base64');
    const base =
      this.ambiente === 'producao'
        ? 'https://api.focusnfe.com.br'
        : 'https://homologacao.focusnfe.com.br';

    const { data } = await axios.get(`${base}/v2/nfse/${encodeURIComponent(nf.providerRef)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    const status =
      data.status === 'autorizado'
        ? 'autorizada'
        : data.status === 'erro_autorizacao'
          ? 'erro'
          : 'processando';

    return prisma.nfse.update({
      where: { id },
      data: {
        status,
        numero: data.numero ? String(data.numero) : nf.numero,
        codigoVerificacao: data.codigo_verificacao || nf.codigoVerificacao,
        pdfUrl: data.url_danfse || nf.pdfUrl,
        xmlUrl: data.caminho_xml_nota_fiscal || nf.xmlUrl,
        erro: data.erros ? JSON.stringify(data.erros) : null,
      },
      include: {
        pedido: { include: { cliente: true } },
        pagamento: true,
      },
    });
  }

  async reemitir(id: string) {
    const nf = await this.buscar(id);
    if (!nf.pagamentoId) throw new Error('Pagamento não vinculado à nota');
    if (nf.status === 'autorizada') throw new Error('Nota já autorizada');

    await prisma.nfse.update({
      where: { id },
      data: { status: 'processando', erro: null },
    });

    return nfseService.emitirParaPagamento(nf.pagamentoId);
  }

  async emitirPorPagamento(pagamentoId: string) {
    return nfseService.emitirParaPagamento(pagamentoId);
  }

  config() {
    return {
      mockMode: this.mockMode,
      ambiente: this.ambiente,
      provider: 'Focus NFe',
      cnpjPrestador: process.env.NFSE_CNPJ_PRESTADOR || process.env.ASAAS_CNPJ || '',
      codigoMunicipio: process.env.NFSE_CODIGO_MUNICIPIO || '',
      itemListaServico: process.env.NFSE_ITEM_LISTA_SERVICO || '14.01',
      aliquota: process.env.NFSE_ALIQUOTA || '2',
      tokenConfigurado: Boolean(process.env.FOCUS_NFE_TOKEN),
    };
  }
}

export const nfseAdminService = new NfseAdminService();
