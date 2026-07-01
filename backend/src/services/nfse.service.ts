import axios, { isAxiosError } from 'axios';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { documentosService } from './documentos.service.js';
import { descricaoServicosDaSolicitacao } from '../utils/solicitacao-descricao.js';

const FOCUS_BASE = {
  homologacao: 'https://homologacao.focusnfe.com.br',
  producao: 'https://api.focusnfe.com.br',
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function gerarHtmlNfseMock(data: {
  numero: string;
  codigoVerificacao: string;
  prestadorCnpj: string;
  tomadorNome: string;
  tomadorDoc: string;
  discriminacao: string;
  valor: number;
  dataEmissao: string;
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>NFSe ${data.numero}</title>
<style>
  body{font-family:Arial,sans-serif;color:#1e293b;max-width:720px;margin:24px auto;padding:16px}
  h1{font-size:18px;color:#0f2744;margin:0 0 8px}
  .box{border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin:12px 0}
  .row{display:flex;justify-content:space-between;margin:6px 0;font-size:14px}
  .label{color:#64748b}
  .total{font-size:16px;font-weight:bold;color:#0f2744}
  .footer{font-size:11px;color:#64748b;margin-top:24px;text-align:center}
</style></head>
<body>
  <h1>Nota Fiscal de Serviço Eletrônica — NFS-e</h1>
  <p style="font-size:13px;color:#64748b">Documento auxiliar para comprovação do serviço prestado pela ABS Resolve.</p>
  <div class="box">
    <div class="row"><span class="label">Número</span><span>${data.numero}</span></div>
    <div class="row"><span class="label">Código de verificação</span><span>${data.codigoVerificacao}</span></div>
    <div class="row"><span class="label">Data de emissão</span><span>${data.dataEmissao}</span></div>
  </div>
  <div class="box">
    <strong>Prestador</strong>
    <div class="row"><span class="label">CNPJ</span><span>${data.prestadorCnpj}</span></div>
    <div class="row"><span class="label">Razão social</span><span>ABS Resolve Já Serviços Ltda.</span></div>
  </div>
  <div class="box">
    <strong>Tomador</strong>
    <div class="row"><span class="label">Nome</span><span>${data.tomadorNome}</span></div>
    <div class="row"><span class="label">CPF/CNPJ</span><span>${data.tomadorDoc}</span></div>
  </div>
  <div class="box">
    <strong>Discriminação dos serviços</strong>
    <p style="margin:8px 0 0;font-size:14px">${data.discriminacao}</p>
    <div class="row total" style="margin-top:12px"><span>Valor total</span><span>${formatarMoeda(data.valor)}</span></div>
  </div>
  <p class="footer">Emitida automaticamente após confirmação do pagamento. Consulte também o portal do cliente em Documentos.</p>
</body></html>`;
}

export class NfseService {
  private get mockMode() {
    return !process.env.FOCUS_NFE_TOKEN || process.env.NFSE_MOCK === 'true';
  }

  private get baseUrl() {
    const amb = process.env.FOCUS_NFE_AMBIENTE === 'producao' ? 'producao' : 'homologacao';
    return FOCUS_BASE[amb];
  }

  private get cnpjPrestador() {
    return onlyDigits(process.env.NFSE_CNPJ_PRESTADOR || process.env.ASAAS_CNPJ || '');
  }

  async emitirParaPagamento(pagamentoId: string) {
    const pagamento = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        cliente: true,
        pedido: {
          include: {
            nfse: true,
            solicitacao: { include: { servico: true } },
          },
        },
      },
    });

    if (!pagamento?.pedidoId || !pagamento.pedido) return null;
    if (pagamento.pedido.nfse?.status === 'autorizada') return pagamento.pedido.nfse;

    const pedido = pagamento.pedido;
    const valor = toNumber(pagamento.valor);
    const discriminacao =
      pedido.descricao ||
      (pedido.solicitacao ? descricaoServicosDaSolicitacao(pedido.solicitacao) : 'Serviços de manutenção e instalação residencial');

    const registro = await prisma.nfse.upsert({
      where: { pedidoId: pedido.id },
      create: {
        pedidoId: pedido.id,
        pagamentoId: pagamento.id,
        status: 'processando',
        providerRef: `ABS-${pedido.numero}`,
      },
      update: {
        pagamentoId: pagamento.id,
        status: 'processando',
        erro: null,
      },
    });

    try {
      if (this.mockMode) {
        return this.emitirMock(registro.id, {
          pedidoNumero: pedido.numero,
          clienteId: pagamento.clienteId,
          clienteNome: pagamento.cliente.nome,
          clienteDoc: pagamento.cliente.cpf || pagamento.cliente.cnpj || '—',
          discriminacao,
          valor,
        });
      }

      return this.emitirFocus(registro.id, {
        ref: registro.providerRef || `ABS-${pedido.numero}`,
        cliente: pagamento.cliente,
        discriminacao,
        valor,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao emitir NFSe';
      await prisma.nfse.update({
        where: { id: registro.id },
        data: { status: 'erro', erro: msg },
      });
      throw err;
    }
  }

  private async emitirMock(
    nfseId: string,
    data: {
      pedidoNumero: string;
      clienteId: string;
      clienteNome: string;
      clienteDoc: string;
      discriminacao: string;
      valor: number;
    }
  ) {
    const numero = `${Date.now().toString().slice(-8)}`;
    const codigoVerificacao = `${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const dataEmissao = formatarData(new Date());
    const cnpj = this.cnpjPrestador || '58981264000153';

    const html = gerarHtmlNfseMock({
      numero,
      codigoVerificacao,
      prestadorCnpj: cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
      tomadorNome: data.clienteNome,
      tomadorDoc: data.clienteDoc,
      discriminacao: data.discriminacao,
      valor: data.valor,
      dataEmissao,
    });

    const buffer = Buffer.from(html, 'utf-8');
    const doc = await documentosService.registrarArquivo(
      data.clienteId,
      `NFSe-${data.pedidoNumero}.html`,
      buffer,
      'text/html'
    );

    return prisma.nfse.update({
      where: { id: nfseId },
      data: {
        status: 'autorizada',
        numero,
        codigoVerificacao,
        pdfUrl: doc.url,
        documentoId: doc.id,
      },
    });
  }

  private async emitirFocus(
    nfseId: string,
    data: {
      ref: string;
      cliente: {
        id: string;
        nome: string;
        email: string;
        cpf: string | null;
        cnpj: string | null;
        endereco: unknown;
      };
      discriminacao: string;
      valor: number;
    }
  ) {
    const token = process.env.FOCUS_NFE_TOKEN!;
    const doc = onlyDigits(data.cliente.cpf || data.cliente.cnpj || '');
    const endereco = (data.cliente.endereco || {}) as Record<string, string>;

    const payload = {
      data_emissao: new Date().toISOString().slice(0, 10),
      prestador: { cnpj: this.cnpjPrestador },
      tomador: {
        cpf: data.cliente.cpf ? doc : undefined,
        cnpj: data.cliente.cnpj ? doc : undefined,
        razao_social: data.cliente.nome,
        email: data.cliente.email,
        logradouro: endereco.logradouro || endereco.rua,
        numero: endereco.numero || 'S/N',
        bairro: endereco.bairro,
        codigo_municipio: process.env.NFSE_CODIGO_MUNICIPIO,
        uf: endereco.uf || endereco.estado,
        cep: onlyDigits(endereco.cep || ''),
      },
      servico: {
        aliquota: parseFloat(process.env.NFSE_ALIQUOTA || '2'),
        discriminacao: data.discriminacao,
        iss_retido: false,
        item_lista_servico: process.env.NFSE_ITEM_LISTA_SERVICO || '14.01',
        codigo_municipio: process.env.NFSE_CODIGO_MUNICIPIO,
        valor_servicos: data.valor,
      },
    };

    const auth = Buffer.from(`${token}:`).toString('base64');

    try {
      await axios.post(`${this.baseUrl}/v2/nfse?ref=${encodeURIComponent(data.ref)}`, payload, {
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as { mensagem?: string; erros?: Array<{ mensagem?: string }> } | undefined;
        const msg =
          body?.mensagem ||
          body?.erros?.map((e) => e.mensagem).filter(Boolean).join('; ') ||
          `Focus NFe HTTP ${err.response?.status}`;
        throw new Error(msg);
      }
      throw err;
    }

    const resultado = await this.consultarFocus(data.ref, auth);
    const pdfUrl = resultado.url_danfse || resultado.caminho_xml_nota_fiscal;

    let documentoId: string | undefined;
    let urlSalva = pdfUrl;
    if (pdfUrl) {
      try {
        const res = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const doc = await documentosService.registrarArquivo(
          data.cliente.id,
          `NFSe-${data.ref}.pdf`,
          Buffer.from(res.data),
          'application/pdf'
        );
        documentoId = doc.id;
        urlSalva = doc.url;
      } catch {
        // mantém URL externa se download falhar
      }
    }

    return prisma.nfse.update({
      where: { id: nfseId },
      data: {
        status: resultado.status === 'autorizado' ? 'autorizada' : 'processando',
        numero: resultado.numero ? String(resultado.numero) : undefined,
        codigoVerificacao: resultado.codigo_verificacao,
        pdfUrl: urlSalva,
        xmlUrl: resultado.caminho_xml_nota_fiscal,
        documentoId,
        erro: resultado.erros ? JSON.stringify(resultado.erros) : null,
      },
    });
  }

  private async consultarFocus(ref: string, auth: string, tentativas = 8) {
    for (let i = 0; i < tentativas; i++) {
      const { data } = await axios.get(`${this.baseUrl}/v2/nfse/${encodeURIComponent(ref)}`, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (data.status === 'autorizado' || data.status === 'erro_autorizacao') {
        return data as {
          status: string;
          numero?: number;
          codigo_verificacao?: string;
          url_danfse?: string;
          caminho_xml_nota_fiscal?: string;
          erros?: unknown;
        };
      }

      await new Promise((r) => setTimeout(r, 1500));
    }

    throw new Error('NFSe em processamento na Focus NFe — tente consultar mais tarde');
  }
}

export const nfseService = new NfseService();
