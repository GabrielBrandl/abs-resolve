import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { estoqueService } from './estoque.service.js';
import { notificacaoService } from './notificacao.service.js';
import { descricaoServicosDaSolicitacao } from '../utils/solicitacao-descricao.js';

function chaveOpcoesTomada(opcoes: { tipo?: string; amperagem?: string }) {
  return `${opcoes.tipo || 'simples'}_${opcoes.amperagem || '10a'}`.toLowerCase();
}

/** Confirma pagamento recebido: libera agendamento, reserva estoque e cria OS */
export async function confirmarPagamentoRecebido(pagamentoId: string) {
  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: { cliente: true, pedido: { include: { solicitacao: { include: { servico: true } } } } },
  });
  if (!pagamento || pagamento.status !== 'RECEIVED') return null;

  if (!pagamento.pedidoId) {
    if (pagamento.cliente) {
      await notificacaoService
        .notificarPagamentoRecebido(
          pagamento.cliente.nome,
          toNumber(pagamento.valor),
          pagamento.cliente.email,
          pagamento.cliente.telefone
        )
        .catch(() => {});
    }
    return pagamento;
  }

  const pedido = pagamento.pedido!;
  const sol = pedido.solicitacao;

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: { status: 'em_processamento' },
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

  if (pagamento.cliente) {
    const servicos = sol ? descricaoServicosDaSolicitacao(sol) : 'Serviço ABS Resolve';
    await notificacaoService
      .notificarServicoConfirmado({
        clienteNome: pagamento.cliente.nome,
        email: pagamento.cliente.email,
        telefone: pagamento.cliente.telefone,
        whatsapp: pagamento.cliente.whatsapp,
        pedidoNumero: pedido.numero,
        servicos,
        valor: toNumber(pagamento.valor),
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
