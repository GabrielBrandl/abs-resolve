import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { estoqueService } from './estoque.service.js';
import { notificacaoService } from './notificacao.service.js';
import { nfseService } from './nfse.service.js';
import { descricaoServicosDaSolicitacao } from '../utils/solicitacao-descricao.js';
import { gerarComissaoDoPagamento } from './parceiros.service.js';

function chaveOpcoesTomada(opcoes: { tipo?: string; amperagem?: string }) {
  return `${opcoes.tipo || 'simples'}_${opcoes.amperagem || '10a'}`.toLowerCase();
}

async function anexoDocumentoNfse(documentoId?: string | null) {
  if (!documentoId) return undefined;
  const doc = await prisma.documento.findUnique({ where: { id: documentoId } });
  if (!doc) return undefined;

  if (doc.url.startsWith('http')) {
    try {
      const res = await fetch(doc.url);
      if (res.ok) {
        return {
          filename: doc.nome,
          content: Buffer.from(await res.arrayBuffer()),
          contentType: doc.mimetype,
        };
      }
    } catch {
      return undefined;
    }
  }

  const filepath = path.join(process.env.UPLOAD_DIR || 'uploads', doc.filename);
  if (!fs.existsSync(filepath)) return undefined;

  return {
    filename: doc.nome,
    content: fs.readFileSync(filepath),
    contentType: doc.mimetype,
  };
}

/** Confirma pagamento recebido: libera agendamento, reserva estoque, emite NFS-e e notifica cliente */
export async function confirmarPagamentoRecebido(pagamentoId: string) {
  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: { cliente: true, pedido: { include: { solicitacao: { include: { servico: true } } } } },
  });
  if (!pagamento || pagamento.status !== 'RECEIVED') return null;

  if (!pagamento.pedidoId) {
    if (pagamento.cliente) {
      await notificacaoService
        .notificarPagamentoComNfse({
          clienteNome: pagamento.cliente.nome,
          email: pagamento.cliente.email,
          telefone: pagamento.cliente.telefone,
          whatsapp: pagamento.cliente.whatsapp,
          pedidoNumero: '—',
          servicos: 'Cobrança ABS Resolve',
          valor: toNumber(pagamento.valor),
          metodo: pagamento.metodo,
          dataPagamento: pagamento.paymentDate,
          linkComprovante: pagamento.invoiceUrl,
        })
        .catch(() => {});
    }
    return pagamento;
  }

  const pedido = pagamento.pedido!;
  const sol = pedido.solicitacao;

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: { status: 'em_execucao' },
  });

  if (sol && sol.status === 'aguardando_pagamento') {
    const opcoes = sol.opcoes as { itens?: Array<{ slug: string }> };
    if (opcoes.itens?.length) {
      for (const item of opcoes.itens) {
        await estoqueService.reservarPorServico(item.slug, 'padrao').catch(() => {});
      }
    } else {
      const op = sol.opcoes as Record<string, string>;
      const chave =
        sol.servico.slug === 'troca-tomada' || sol.servico.slug === 'tomada'
          ? chaveOpcoesTomada(op)
          : op.tipo || 'padrao';
      await estoqueService.reservarPorServico(sol.servico.slug, chave).catch(() => {});
    }

    await prisma.solicitacaoServico.update({
      where: { id: sol.id },
      data: { status: 'pago' },
    });
  }

  const osExistente = await prisma.ordemServico.findUnique({ where: { pedidoId: pedido.id } });
  if (!osExistente) {
    await prisma.ordemServico.create({
      data: { pedidoId: pedido.id, etapa: 'execucao' },
    });
  }

  let nfse = null;
  try {
    nfse = await nfseService.emitirParaPagamento(pagamentoId);
  } catch (err) {
    console.warn('[NFSe] emissão falhou:', err instanceof Error ? err.message : err);
  }

  const descricaoServico = sol ? descricaoServicosDaSolicitacao(sol) : pedido.descricao || 'Serviço ABS Resolve';

  // Comissão de parceiro (se o cliente foi indicado)
  await gerarComissaoDoPagamento({
    clienteId: pedido.clienteId,
    pedidoId: pedido.id,
    valor: toNumber(pagamento.valor),
    descricao: `${pedido.numero} — ${descricaoServico}`,
  }).catch((err) => console.warn('[comissao] falha ao gerar:', err instanceof Error ? err.message : err));

  if (pagamento.cliente) {
    const servicos = descricaoServico;
    const anexo = nfse ? await anexoDocumentoNfse(nfse.documentoId) : undefined;

    await notificacaoService
      .notificarPagamentoComNfse({
        clienteNome: pagamento.cliente.nome,
        email: pagamento.cliente.email,
        telefone: pagamento.cliente.telefone,
        whatsapp: pagamento.cliente.whatsapp,
        pedidoNumero: pedido.numero,
        servicos,
        valor: toNumber(pagamento.valor),
        metodo: pagamento.metodo,
        dataPagamento: pagamento.paymentDate,
        linkComprovante: pagamento.invoiceUrl,
        nfse: nfse
          ? {
              numero: nfse.numero,
              codigoVerificacao: nfse.codigoVerificacao,
              pdfUrl: nfse.pdfUrl,
              anexo,
            }
          : null,
      })
      .catch(() => {});
  }

  return pagamento;
}

export async function confirmarPagamentoPorPedido(pedidoId: string) {
  const pagamento = await prisma.pagamento.findFirst({
    where: { pedidoId, status: 'RECEIVED' },
    orderBy: { createdAt: 'desc' },
  });
  if (!pagamento) return null;
  return confirmarPagamentoRecebido(pagamento.id);
}
