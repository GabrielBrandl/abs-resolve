import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';
import { solicitacaoService } from './solicitacao.service.js';
import { pagamentosService } from './pagamentos.service.js';
import { getConfigPrecificacao } from '../engines/pricing.engine.js';
import { toNumber } from '../utils/helpers.js';

export class ClientePortalService {
  async pedidosComTimeline(clienteId: string) {
    return solicitacaoService.acompanhamentoPedidos(clienteId);
  }

  async garantias(clienteId: string) {
    const garantias = await prisma.garantia.findMany({
      where: { clienteId },
      orderBy: { dataInicio: 'desc' },
    });
    const hoje = new Date();
    return garantias.map((g) => ({
      ...g,
      ativa: g.dataFim >= hoje,
      diasRestantes: Math.max(0, Math.ceil((g.dataFim.getTime() - hoje.getTime()) / 86400000)),
    }));
  }

  async avaliar(ordemServicoId: string, clienteId: string, nota: number, comentario?: string) {
    if (nota < 1 || nota > 5) throw new Error('Nota deve ser entre 1 e 5');

    const os = await prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: { pedido: true },
    });
    if (!os || os.pedido.clienteId !== clienteId) throw new Error('Ordem de serviço não encontrada');
    if (!['conclusao', 'avaliacao'].includes(os.etapa)) {
      throw new Error('Serviço ainda não concluído');
    }

    const avaliacao = await prisma.avaliacao.upsert({
      where: { ordemServicoId },
      update: { nota, comentario: comentario || null },
      create: { ordemServicoId, clienteId, nota, comentario: comentario || null },
    });

    await prisma.ordemServico.update({
      where: { id: ordemServicoId },
      data: { etapa: 'avaliacao' },
    });

    return avaliacao;
  }

  async pendenteAvaliacao(clienteId: string) {
    return prisma.ordemServico.findMany({
      where: {
        pedido: { clienteId },
        etapa: 'conclusao',
        avaliacao: null,
      },
      include: { pedido: { select: { numero: true, descricao: true } } },
    });
  }

  async configPublica() {
    const config = await getConfigPrecificacao();
    return {
      expressValor: toNumber(config.expressValor),
      taxaCancelamento: toNumber(config.taxaCancelamento),
      taxaAusencia: toNumber(config.taxaAusencia),
    };
  }

  async solicitarOrcamento(clienteId: string, slug: string, descricao: string, endereco?: Record<string, string>) {
    return solicitacaoService.solicitarOrcamento(clienteId, slug, descricao, endereco);
  }

  async atualizarEndereco(clienteId: string, endereco: Record<string, string>) {
    return prisma.cliente.update({
      where: { id: clienteId },
      data: { endereco: endereco as Prisma.InputJsonValue },
    });
  }

  async simularPagamento(pagamentoId: string, clienteId: string) {
    if (process.env.NODE_ENV === 'production' && process.env.ASAAS_MOCK !== 'true') {
      throw new Error('Indisponível em produção');
    }
    return pagamentosService.simularConfirmacao(pagamentoId, clienteId);
  }
}

export const clientePortalService = new ClientePortalService();
