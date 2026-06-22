import { prisma } from '../utils/prisma.js';
import { notificacaoService } from './notificacao.service.js';

const ETAPAS_OS = [
  'solicitacao',
  'analise',
  'orcamento',
  'aprovacao',
  'execucao',
  'conclusao',
  'avaliacao',
];

export class OrdemServicoService {
  async listar(filters: { etapa?: string; parceiro?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.etapa) where.etapa = filters.etapa;
    if (filters.parceiro) where.parceiro = filters.parceiro;

    return prisma.ordemServico.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        pedido: {
          include: { cliente: { select: { nome: true } } },
        },
      },
    });
  }

  async buscarPorId(id: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: { pedido: { include: { cliente: true } } },
    });
    if (!os) throw new Error('Ordem de serviço não encontrada');
    return os;
  }

  async criar(pedidoId: string, data: { observacoes?: string; parceiro?: string }) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { ordemServico: true },
    });
    if (!pedido) throw new Error('Pedido não encontrado');
    if (pedido.ordemServico) throw new Error('Pedido já possui ordem de serviço');

    return prisma.ordemServico.create({
      data: { pedidoId, ...data },
      include: { pedido: { include: { cliente: true } } },
    });
  }

  async atualizarEtapa(id: string, etapa: string) {
    if (!ETAPAS_OS.includes(etapa)) throw new Error('Etapa inválida');

    const os = await prisma.ordemServico.update({
      where: { id },
      data: { etapa },
      include: { pedido: { include: { cliente: true } } },
    });

    notificacaoService
      .notificarMudancaStatus('OS', os.pedido.numero, etapa, os.pedido.cliente.email)
      .catch(() => {});

    return os;
  }

  async atualizar(id: string, data: { observacoes?: string; parceiro?: string }) {
    return prisma.ordemServico.update({
      where: { id },
      data,
      include: { pedido: { include: { cliente: true } } },
    });
  }

  getEtapas() {
    return ETAPAS_OS;
  }

  async atualizarChecklist(id: string, checklist: Record<string, unknown>) {
    const required = ['fotoAntes', 'fotoDepois', 'materiais', 'observacoes', 'assinaturaCliente'];
    const completo = required.every((k) => Boolean(checklist[k]));

    const os = await prisma.ordemServico.update({
      where: { id },
      data: { checklist: checklist as object, checklistCompleto: completo },
      include: { pedido: { include: { cliente: true } } },
    });

    if (completo) {
      await this.finalizarComGarantia(os.id);
    }

    return os;
  }

  async finalizarComGarantia(osId: string) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: osId },
      include: { pedido: { include: { cliente: true, solicitacao: { include: { servico: true } } } } },
    });
    if (!os || !os.checklistCompleto) throw new Error('Checklist incompleto');

    const numero = `GAR-${Date.now().toString().slice(-8)}`;
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setFullYear(dataFim.getFullYear() + 1);

    const servicoNome = os.pedido.solicitacao?.servico?.nome || os.pedido.descricao || 'Serviço';
    const produto = servicoNome;

    const garantia = await prisma.garantia.create({
      data: {
        numero,
        clienteId: os.pedido.clienteId,
        pedidoId: os.pedidoId,
        servico: servicoNome,
        produto,
        dataInicio,
        dataFim,
      },
    });

    await prisma.produtoInstalado.create({
      data: {
        clienteId: os.pedido.clienteId,
        nome: produto,
        servico: servicoNome,
        garantiaId: garantia.id,
      },
    });

    await prisma.ordemServico.update({
      where: { id: osId },
      data: { etapa: 'conclusao', garantiaId: garantia.id },
    });

    const slug = os.pedido.solicitacao?.servico?.slug;
    if (slug) {
      const opcoes = (os.pedido.solicitacao?.opcoes || {}) as Record<string, string>;
      const chave = slug === 'tomada' ? `${opcoes.tipo || 'simples'}_${opcoes.amperagem || '10a'}`.toLowerCase() : opcoes.tipo;
      const { estoqueService } = await import('./estoque.service.js');
      await estoqueService.baixaPorServico(slug, chave).catch(() => {});

      const { campanhaCrmService } = await import('./campanha-crm.service.js');
      await campanhaCrmService.agendarPosServico(os.pedido.clienteId, slug).catch(() => {});
    }

    await notificacaoService.notificarServicoFinalizado(os.pedido.cliente.email, os.pedido.cliente.telefone);
    await notificacaoService.notificarGarantiaEmitida(numero, os.pedido.cliente.email, os.pedido.cliente.telefone);

    return garantia;
  }
}

export const ordemServicoService = new OrdemServicoService();
