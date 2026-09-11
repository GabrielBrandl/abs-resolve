import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { toNumber, gerarNumeroPedido } from '../utils/helpers.js';
import { normalizarOrigem } from '../utils/periodo.js';
import { registrarAuditoria } from '../middlewares/audit.middleware.js';
import { solicitacaoService } from './solicitacao.service.js';

export const CANAIS_VENDA = [
  'whatsapp',
  'site',
  'instagram',
  'meta_ads',
  'google',
  'indicacao',
  'recorrente',
  'parceiro',
  'outros',
] as const;

export type CanalVenda = (typeof CANAIS_VENDA)[number];

type ItemVenda = {
  slug: string;
  quantidade: number;
  respostas?: Record<string, string>;
  fotos?: string[];
  materialSku?: string;
  materialCor?: string;
  materialModeloId?: string;
};

export type VendaAssistidaInput = {
  clienteId: string;
  itens: ItemVenda[];
  canal: string;
  campanha?: string | null;
  anuncio?: string | null;
  responsavel: string;
  modo: 'orcamento' | 'pedido';
  leadId?: string | null;
  /** Desconto em R$ — apenas admin. */
  descontoValor?: number | null;
  /** Motivo do ajuste/desconto (auditoria). */
  motivoAjuste?: string | null;
  observacoes?: string | null;
  usuarioId: string;
  isAdmin: boolean;
  ip?: string;
};

function mapCanal(canal: string): string {
  const c = (canal || '').toLowerCase().trim();
  if (c === 'facebook' || c === 'facebook_meta' || c === 'meta') return 'meta_ads';
  if (c === 'indicação') return 'indicacao';
  if (c === 'cliente_recorrente' || c === 'recorrente') return 'recorrente';
  if (CANAIS_VENDA.includes(c as CanalVenda)) return c;
  return normalizarOrigem(c);
}

export class VendaAssistidaService {
  /**
   * Finaliza venda assistida: reutiliza criarCarrinho (mesmas regras de preço)
   * e grava como orçamento ou pedido.
   */
  async finalizar(input: VendaAssistidaInput) {
    if (!input.clienteId) throw new Error('Selecione o cliente');
    if (!input.itens?.length) throw new Error('Adicione pelo menos um serviço');
    if (!input.canal) throw new Error('Informe o canal da venda');
    if (!input.responsavel?.trim()) throw new Error('Informe o responsável pela venda');
    if (!['orcamento', 'pedido'].includes(input.modo)) {
      throw new Error('Modo inválido: use orcamento ou pedido');
    }

    const cliente = await prisma.cliente.findUnique({ where: { id: input.clienteId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const canal = mapCanal(input.canal);

    // Atualiza origem do cliente (atribuição comercial)
    await prisma.cliente.update({
      where: { id: input.clienteId },
      data: { origem: canal },
    });

    // Mesma precificação do site — se houver só sob_orcamento, monta solicitação de orçamento
    const slugs = input.itens.map((i) => i.slug);
    const servicosDb = await prisma.catalogoServico.findMany({
      where: { slug: { in: slugs } },
    });
    const bySlug = new Map(servicosDb.map((s) => [s.slug, s]));
    const todosSobOrcamento = input.itens.every((i) => bySlug.get(i.slug)?.tipoPreco === 'sob_orcamento');

    let sol;
    if (todosSobOrcamento) {
      const first = bySlug.get(input.itens[0].slug);
      if (!first) throw new Error('Serviço não encontrado no catálogo');
      const detalhes = input.itens.map((i) => {
        const s = bySlug.get(i.slug)!;
        return {
          slug: s.slug,
          nome: s.nome,
          categoria: s.categoria,
          quantidade: i.quantidade,
          precoUnitario: 0,
          precoTexto: s.precoTexto,
          subtotal: 0,
          respostas: i.respostas || {},
          tipo: 'servico' as const,
          imagemUrl: s.imagemUrl,
        };
      });
      sol = await prisma.solicitacaoServico.create({
        data: {
          clienteId: input.clienteId,
          servicoId: first.id,
          tipo: first.tipo || 'C',
          opcoes: {
            itens: detalhes,
            pontosTotal: 0,
            precoSubtotalItens: 0,
          },
          precoBase: null,
          precoFinal: null,
          status: 'orcamento_pendente',
          leadId: input.leadId || undefined,
        },
        include: { servico: true },
      });
      if (input.modo === 'pedido') {
        throw new Error('Serviço sob orçamento: salve como orçamento; converta em pedido após definir o preço');
      }
    } else {
      const itensPrecificaveis = input.itens.filter((i) => bySlug.get(i.slug)?.tipoPreco !== 'sob_orcamento');
      if (!itensPrecificaveis.length) {
        throw new Error('Nenhum serviço com preço automático no pedido');
      }
      sol = await solicitacaoService.criarCarrinho(
        input.clienteId,
        itensPrecificaveis.map((i) => ({
          slug: i.slug,
          quantidade: i.quantidade,
          respostas: i.respostas,
          fotos: i.fotos,
          materialSku: i.materialSku,
          materialCor: i.materialCor,
          materialModeloId: i.materialModeloId,
        })),
        false,
        false
      );
    }

    const opcoes = (sol.opcoes || {}) as Record<string, unknown>;
    const subtotal = toNumber(sol.precoBase ?? sol.precoFinal);
    let precoFinal = toNumber(sol.precoFinal);
    let descontoAplicado = 0;

    if (input.descontoValor != null && input.descontoValor > 0) {
      if (!input.isAdmin) {
        throw new Error('Apenas administradores podem aplicar desconto/ajuste manual');
      }
      if (precoFinal <= 0) throw new Error('Não há valor para aplicar desconto');
      descontoAplicado = Math.min(input.descontoValor, precoFinal);
      precoFinal = Math.round((precoFinal - descontoAplicado) * 100) / 100;
      await registrarAuditoria(
        input.usuarioId,
        'ajuste_preco',
        'venda_assistida',
        sol.id,
        {
          descontoValor: descontoAplicado,
          subtotal,
          precoFinal,
          motivo: input.motivoAjuste || null,
          canal,
          campanha: input.campanha || null,
        },
        input.ip
      );
    }

    const atribuicao = {
      origem: 'venda_assistida',
      canal,
      campanha: input.campanha || null,
      anuncio: input.anuncio || null,
      responsavel: input.responsavel,
      criadoPorUserId: input.usuarioId,
      observacoes: input.observacoes || null,
      descontoValor: descontoAplicado || null,
      motivoAjuste: input.motivoAjuste || null,
      custos: {
        material: null as number | null,
        prestador: null as number | null,
        taxasPagamento: null as number | null,
        impostos: null as number | null,
        margemContribuicao: null as number | null,
        margemPct: null as number | null,
      },
    };

    const status =
      input.modo === 'orcamento' || todosSobOrcamento ? 'orcamento_pendente' : 'checkout';

    sol = await prisma.solicitacaoServico.update({
      where: { id: sol.id },
      data: {
        ...(precoFinal > 0 ? { precoFinal } : {}),
        status,
        leadId: input.leadId || undefined,
        opcoes: {
          ...opcoes,
          vendaAssistida: atribuicao,
          tipoSolicitacao: status === 'orcamento_pendente' ? 'orcamento_venda_assistida' : 'venda_assistida',
        } as Prisma.InputJsonValue,
      },
      include: {
        servico: true,
        cliente: { select: { id: true, nome: true, telefone: true, email: true, endereco: true } },
      },
    });

    if (input.leadId) {
      try {
        const { leadsService } = await import('./leads.service.js');
        await leadsService.vincularOrcamento(input.leadId, sol.id, input.usuarioId);
      } catch (err) {
        console.warn('[venda-assistida] vínculo lead falhou:', err instanceof Error ? err.message : err);
      }
    }

    if (input.modo === 'orcamento' || todosSobOrcamento) {
      await registrarAuditoria(
        input.usuarioId,
        'criar',
        'orcamento',
        sol.id,
        { canal, campanha: input.campanha, precoFinal, clienteId: input.clienteId },
        input.ip
      );
      return {
        tipo: 'orcamento' as const,
        solicitacao: sol,
        pedido: null,
        precoFinal,
        subtotal,
        desconto: descontoAplicado,
      };
    }

    if (precoFinal <= 0) throw new Error('Valor do pedido inválido');

    // Criar pedido (mesma estrutura do checkout do site)
    const numero = await gerarNumeroPedido();
    const pedido = await prisma.pedido.create({
      data: {
        numero,
        clienteId: input.clienteId,
        valor: precoFinal,
        responsavel: input.responsavel,
        status: 'recebido',
        descricao: this.descricaoItens(opcoes),
      },
      include: { cliente: true },
    });

    await prisma.solicitacaoServico.update({
      where: { id: sol.id },
      data: { pedidoId: pedido.id },
    });

    if (input.leadId) {
      try {
        await prisma.lead.update({
          where: { id: input.leadId },
          data: {
            pedidoId: pedido.id,
            solicitacaoId: sol.id,
            clienteId: input.clienteId,
            etapa: 'negociacao',
            statusComercial: 'em_andamento',
            probabilidade: 75,
            valorEstimado: precoFinal,
            dataUltimaInteracao: new Date(),
          },
        });
      } catch {
        /* lead opcional */
      }
    }

    await registrarAuditoria(
      input.usuarioId,
      'criar',
      'pedido',
      pedido.id,
      {
        canal,
        campanha: input.campanha,
        solicitacaoId: sol.id,
        precoFinal,
        origem: 'venda_assistida',
      },
      input.ip
    );

    return {
      tipo: 'pedido' as const,
      solicitacao: { ...sol, pedidoId: pedido.id },
      pedido,
      precoFinal,
      subtotal,
      desconto: descontoAplicado,
    };
  }

  /** Converte orçamento (já precificado) em Pedido sem redigitar. */
  async converterOrcamentoEmPedido(solicitacaoId: string, usuarioId: string, ip?: string) {
    const sol = await prisma.solicitacaoServico.findUnique({
      where: { id: solicitacaoId },
      include: { servico: true, cliente: true, pedido: true },
    });
    if (!sol) throw new Error('Orçamento não encontrado');
    if (sol.pedidoId && sol.pedido) {
      return { solicitacao: sol, pedido: sol.pedido, jaExistia: true };
    }

    const opcoes = (sol.opcoes || {}) as Record<string, unknown>;
    const va = (opcoes.vendaAssistida || {}) as Record<string, unknown>;
    const valor = toNumber(sol.precoFinal);
    if (valor <= 0) throw new Error('Orçamento sem valor — responda o preço antes de converter');

    // Aceita orçamento_pendente (já com preço da venda assistida) ou checkout pós-resposta
    if (!['orcamento_pendente', 'orcamento', 'checkout', 'aprovado'].includes(sol.status)) {
      throw new Error('Este orçamento não pode ser convertido no status atual');
    }

    const numero = await gerarNumeroPedido();
    const pedido = await prisma.pedido.create({
      data: {
        numero,
        clienteId: sol.clienteId,
        valor,
        responsavel: String(va.responsavel || 'Comercial'),
        status: 'recebido',
        descricao: this.descricaoItens(opcoes) || sol.servico?.nome || 'Pedido a partir de orçamento',
      },
      include: { cliente: true },
    });

    const updated = await prisma.solicitacaoServico.update({
      where: { id: sol.id },
      data: {
        pedidoId: pedido.id,
        status: 'checkout',
        opcoes: {
          ...opcoes,
          convertidoEmPedidoEm: new Date().toISOString(),
          convertidoPorUserId: usuarioId,
        } as Prisma.InputJsonValue,
      },
      include: { servico: true, cliente: true },
    });

    if (sol.leadId) {
      await prisma.lead
        .update({
          where: { id: sol.leadId },
          data: {
            pedidoId: pedido.id,
            solicitacaoId: sol.id,
            etapa: 'negociacao',
            statusComercial: 'em_andamento',
            probabilidade: 75,
            valorEstimado: valor,
            dataUltimaInteracao: new Date(),
          },
        })
        .catch(() => {});
    }

    await registrarAuditoria(
      usuarioId,
      'converter',
      'orcamento_pedido',
      pedido.id,
      { solicitacaoId: sol.id },
      ip
    );

    return { solicitacao: updated, pedido, jaExistia: false };
  }

  private descricaoItens(opcoes: Record<string, unknown>): string {
    const itens = opcoes.itens as Array<{ nome?: string; quantidade?: number; subtotal?: number }> | undefined;
    if (!itens?.length) return 'Venda assistida';
    return itens
      .map((i) => `${i.nome || 'Item'}${i.quantidade && i.quantidade > 1 ? ` x${i.quantidade}` : ''}`)
      .join(' · ');
  }
}

export const vendaAssistidaService = new VendaAssistidaService();
