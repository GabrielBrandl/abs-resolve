import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';
import { toNumber } from '../utils/helpers.js';
import {
  PRECO_FIXO_INTERRUPTOR,
  PRECO_FIXO_TOMADA,
  PONTUACAO_SERVICO,
  UPSELLS,
} from '../config/catalogo.js';
import { CATEGORIAS, PONTUACAO_POR_SLUG } from '../config/catalogo-servicos.js';
import { type FluxoServico, type RespostasFluxo } from '../config/fluxo-servicos.js';
import { fluxoConfigService } from './fluxo-config.service.js';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { calcularPrecoFixo, calcularPrecoVariavel, getConfigPrecificacao } from '../engines/pricing.engine.js';
import { listarHorariosDisponiveis, reservarCapacidade } from '../engines/capacity.engine.js';
import { analisarFotos, custosParaServico } from '../services/ia-diagnostico.service.js';
import { notificacaoService } from './notificacao.service.js';
import { descricaoServicosDaSolicitacao } from '../utils/solicitacao-descricao.js';
import { storageService } from './storage.service.js';
import { pagamentosService } from './pagamentos.service.js';

function chaveOpcoesTomada(opcoes: { tipo?: string; amperagem?: string }) {
  return `${opcoes.tipo || 'simples'}_${opcoes.amperagem || '10a'}`.toLowerCase();
}

function pontosSolicitacao(sol: { opcoes: unknown; servico: { slug: string; pontos: number } }) {
  const opcoes = sol.opcoes as { pontosTotal?: number };
  if (opcoes.pontosTotal) return opcoes.pontosTotal;
  return PONTUACAO_POR_SLUG[sol.servico.slug] || PONTUACAO_SERVICO[sol.servico.slug] || sol.servico.pontos;
}

function perguntasVisiveis(fluxo: FluxoServico, respostas: RespostasFluxo) {
  return fluxo.perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    const selected = Array.isArray(val) ? val.map(String) : val != null && val !== '' ? [String(val)] : [];
    return p.showIf.opcaoIds.some((id) => selected.includes(id));
  });
}

function validarRespostasFluxo(slug: string, respostas: RespostasFluxo) {
  const fluxo = fluxoConfigService.getFluxoEfetivo(slug);
  if (!fluxo) return;
  for (const p of perguntasVisiveis(fluxo, respostas)) {
    const val = respostas[p.id];
    if (val === undefined || val === null || val === '') {
      throw new Error(`Resposta obrigatória (${fluxo.nome}): ${p.titulo}`);
    }
  }
}

function descricaoPedido(sol: { opcoes: unknown; servico: { nome: string } }) {
  const opcoes = sol.opcoes as { itens?: Array<{ nome: string; quantidade: number }> };
  if (opcoes.itens?.length) {
    return opcoes.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', ');
  }
  return sol.servico.nome;
}

function buildTimeline(
  pedido: { status: string; createdAt: Date; ordemServico?: { etapa: string } | null },
  pagamento?: { status: string; paymentDate: Date | null } | null,
  agendamento?: { data: Date; horarioInicio: string; status: string } | null
) {
  const steps = [
    { key: 'pedido', label: 'Pedido criado', done: true, date: pedido.createdAt },
    {
      key: 'pagamento',
      label: pagamento?.status === 'RECEIVED' ? 'Pagamento confirmado' : 'Aguardando pagamento',
      done: pagamento?.status === 'RECEIVED',
      date: pagamento?.paymentDate,
    },
    {
      key: 'agendamento',
      label: agendamento ? `Agendado ${agendamento.horarioInicio}` : 'Aguardando agendamento',
      done: !!agendamento && agendamento.status === 'confirmado',
      date: agendamento?.data,
    },
    {
      key: 'execucao',
      label: 'Em execução',
      done: ['em_execucao', 'finalizado'].includes(pedido.status) || pedido.ordemServico?.etapa === 'execucao',
    },
    {
      key: 'concluido',
      label: 'Concluído',
      done: pedido.status === 'finalizado' || pedido.ordemServico?.etapa === 'conclusao',
    },
  ];
  return steps;
}

export class SolicitacaoService {
  async listarCatalogo() {
    const servicos = await prisma.catalogoServico.findMany({
      where: { ativo: true },
      include: { precosFixos: true },
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });

    const categorias = CATEGORIAS.map((cat) => ({
      ...cat,
      servicos: servicos.filter((s) => s.categoria === cat.slug),
    })).filter((c) => c.servicos.length > 0);

    return { categorias, total: servicos.length, servicos };
  }

  obterFluxoServico(slug: string) {
    const fluxo = fluxoConfigService.getFluxoEfetivo(slug);
    if (!fluxo) throw new Error(`Questionário não disponível para "${slug}"`);
    return fluxo;
  }

  calcularPrecoServico(slug: string, respostas: RespostasFluxo = {}, quantidade = 1) {
    validarRespostasFluxo(slug, respostas);
    return calcularPrecoFluxo(slug, respostas, quantidade);
  }

  async criarCarrinho(
    clienteId: string,
    itens: Array<{ slug: string; quantidade: number; respostas?: RespostasFluxo; fotos?: string[] }>,
    express = false,
    aceiteIaDiagnostico = false
  ) {
    if (!itens.length) throw new Error('Adicione pelo menos um serviço ao carrinho');

    const detalhes: Array<{
      slug: string;
      nome: string;
      categoria: string;
      quantidade: number;
      precoUnitario: number;
      precoTexto: string | null;
      subtotal: number;
      respostas?: RespostasFluxo;
      breakdown?: Array<{ label: string; valor: number }>;
      requerValidacaoTecnica?: boolean;
      mensagemValidacao?: string;
      fotos?: string[];
    }> = [];

    let precoSubtotal = 0;
    let pontosTotal = 0;
    let requerValidacaoTecnica = false;

    for (const item of itens) {
      const servico = await prisma.catalogoServico.findUnique({ where: { slug: item.slug } });
      if (!servico?.ativo) throw new Error(`Serviço "${item.slug}" não encontrado`);
      if (servico.tipoPreco === 'sob_orcamento') {
        throw new Error(`${servico.nome} requer orçamento personalizado. Fale conosco pelo WhatsApp.`);
      }
      if (item.quantidade < 1) continue;

      const fluxo = fluxoConfigService.getFluxoEfetivo(item.slug);
      let subtotal: number;
      let precoUnit: number;
      let breakdown: Array<{ label: string; valor: number }> | undefined;
      let itemValidacao = false;
      let mensagemValidacao: string | undefined;

      if (fluxo) {
        if (!item.respostas || !Object.keys(item.respostas).length) {
          throw new Error(`Complete o questionário de "${servico.nome}" antes de pagar`);
        }
        validarRespostasFluxo(item.slug, item.respostas);
        const calculo = calcularPrecoFluxo(item.slug, item.respostas, item.quantidade);
        subtotal = calculo.preco;
        precoUnit = item.quantidade > 0 ? subtotal / item.quantidade : subtotal;
        breakdown = calculo.breakdown;
        itemValidacao = calculo.requerValidacaoTecnica;
        mensagemValidacao = calculo.mensagemValidacao;
        if (itemValidacao) requerValidacaoTecnica = true;
      } else {
        precoUnit = toNumber(servico.precoMinimo || 0);
        subtotal = precoUnit * item.quantidade;
      }

      precoSubtotal += subtotal;
      pontosTotal += servico.pontos * item.quantidade;

      detalhes.push({
        slug: servico.slug,
        nome: servico.nome,
        categoria: servico.categoria,
        quantidade: item.quantidade,
        precoUnitario: precoUnit,
        precoTexto: servico.precoTexto,
        subtotal,
        ...(item.respostas ? { respostas: item.respostas } : {}),
        ...(breakdown ? { breakdown } : {}),
        ...(itemValidacao ? { requerValidacaoTecnica: true, mensagemValidacao } : {}),
        ...(item.fotos?.length ? { fotos: item.fotos } : {}),
      });
    }

    if (requerValidacaoTecnica) {
      throw new Error(
        'Seu pedido requer validação técnica da ABS antes do pagamento. Entre em contato pelo WhatsApp para continuar.'
      );
    }

    const config = await getConfigPrecificacao();
    const expressValor = express ? toNumber(config.expressValor) : 0;
    const precoFinal = precoSubtotal + expressValor;

    const anchor = await prisma.catalogoServico.findUnique({ where: { slug: itens[0].slug } });
    if (!anchor) throw new Error('Serviço inválido');

    const fotosTodas = itens.flatMap((i) => i.fotos || []);

    return prisma.solicitacaoServico.create({
      data: {
        clienteId,
        servicoId: anchor.id,
        tipo: 'C',
        opcoes: {
          itens: detalhes,
          pontosTotal,
          requerValidacaoTecnica: false,
          aceiteIaDiagnostico,
          aceiteIaEm: aceiteIaDiagnostico ? new Date().toISOString() : undefined,
        },
        fotos: fotosTodas,
        precoBase: precoSubtotal,
        precoFinal,
        express,
        status: 'checkout',
      },
      include: { servico: true },
    });
  }

  async atualizarCheckout(id: string, clienteId: string, express: boolean) {
    const sol = await prisma.solicitacaoServico.findFirst({ where: { id, clienteId } });
    if (!sol) throw new Error('Solicitação não encontrada');
    if (sol.status !== 'checkout') throw new Error('Checkout indisponível');

    const opcoes = sol.opcoes as { itens?: unknown[]; pontosTotal?: number };
    const config = await getConfigPrecificacao();
    const base = toNumber(sol.precoBase || 0);
    const expressValor = express ? toNumber(config.expressValor) : 0;

    return prisma.solicitacaoServico.update({
      where: { id },
      data: {
        express,
        precoFinal: base + expressValor,
        opcoes: { ...opcoes, pontosTotal: opcoes.pontosTotal } as Prisma.InputJsonValue,
        status: 'checkout',
      },
      include: { servico: true },
    });
  }

  calcularPrecoTipoA(slug: string, opcoes: Record<string, string>, upsells: string[] = [], express = false) {
    let precoBase = 0;
    if (slug === 'tomada') {
      precoBase = PRECO_FIXO_TOMADA[chaveOpcoesTomada(opcoes)] || 149;
    } else if (slug === 'interruptor') {
      precoBase = PRECO_FIXO_INTERRUPTOR[opcoes.tipo || 'simples'] || 149;
    }

    const upsellItems = (UPSELLS[slug] || []).filter((u) => upsells.includes(u.id));
    return { precoBase, upsellItems };
  }

  async calcularPrecoFinalTipoA(slug: string, opcoes: Record<string, string>, upsells: string[], express: boolean) {
    const { precoBase, upsellItems } = this.calcularPrecoTipoA(slug, opcoes, upsells);
    const config = await getConfigPrecificacao();
    const precoFinal = calcularPrecoFixo(precoBase, upsellItems, express, toNumber(config.expressValor));
    return { precoBase, precoFinal, upsellItems };
  }

  async criar(clienteId: string, servicoSlug: string, opcoes: Record<string, string> = {}) {
    const servico = await prisma.catalogoServico.findUnique({ where: { slug: servicoSlug } });
    if (!servico) throw new Error('Serviço não encontrado');

    const solicitacao = await prisma.solicitacaoServico.create({
      data: {
        clienteId,
        servicoId: servico.id,
        tipo: servico.tipo,
        opcoes,
        status: servico.tipo === 'A' ? 'preco_calculado' : 'aguardando_fotos',
      },
      include: { servico: true },
    });

    if (servico.tipo === 'A') {
      const { precoBase, precoFinal } = await this.calcularPrecoFinalTipoA(servicoSlug, opcoes, [], false);
      return prisma.solicitacaoServico.update({
        where: { id: solicitacao.id },
        data: { precoBase, precoFinal, status: 'orcamento' },
        include: { servico: true },
      });
    }

    return solicitacao;
  }

  async uploadFotos(id: string, clienteId: string, files: Express.Multer.File[], servicoSlug?: string) {
    if (!files.length) throw new Error('Nenhuma foto enviada');

    const urls: string[] = [];
    for (const file of files) {
      const { url } = await storageService.upload(clienteId, file);
      urls.push(url);
    }

    return this.enviarFotos(id, clienteId, urls, servicoSlug);
  }

  async enviarFotos(id: string, clienteId: string, fotos: string[], servicoSlug?: string) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');

    if (sol.tipo === 'C') {
      const opcoes = sol.opcoes as Record<string, unknown> & {
        fotosPorItem?: Record<string, string[]>;
        fotosCliente?: string[];
      };
      const slugItem = servicoSlug;
      const fotosPorItem = { ...(opcoes.fotosPorItem || {}) };
      if (slugItem) fotosPorItem[slugItem] = fotos;
      const fotosTodas = [...new Set(Object.values(fotosPorItem).flat())];
      return prisma.solicitacaoServico.update({
        where: { id },
        data: {
          fotos: fotosTodas,
          opcoes: { ...opcoes, fotosCliente: fotosTodas, fotosPorItem } as Prisma.InputJsonValue,
        },
        include: { servico: true },
      });
    }

    if (sol.servico.tipo !== 'B') throw new Error('Este serviço não exige fotos');

    const opcoes = sol.opcoes as Record<string, string>;
    const analise = await analisarFotos(sol.servico.slug, fotos, {
      ...opcoes,
      servicoCatalogoSlug: sol.servico.slug,
    });

    if (analise.acao === 'nao_gerar_orcamento') {
      return prisma.solicitacaoServico.update({
        where: { id },
        data: {
          fotos,
          analiseIa: analise as object,
          confiancaIa: analise.confianca,
          status: 'aguardando_fotos',
        },
        include: { servico: true },
      });
    }

    if (analise.acao === 'solicitar_nova_foto') {
      return prisma.solicitacaoServico.update({
        where: { id },
        data: {
          fotos,
          analiseIa: analise as object,
          confiancaIa: analise.confianca,
          status: 'aguardando_fotos',
        },
        include: { servico: true },
      });
    }

    const custos = custosParaServico(sol.servico.slug, analise.nivelComplexidade);
    const precoFinal = await calcularPrecoVariavel(custos);

    return prisma.solicitacaoServico.update({
      where: { id },
      data: {
        fotos,
        analiseIa: analise as object,
        confiancaIa: analise.confianca,
        nivelComplexidade: analise.nivelComplexidade,
        precoBase: precoFinal,
        precoFinal,
        status: 'orcamento',
      },
      include: { servico: true },
    });
  }

  async aplicarUpsells(id: string, clienteId: string, upsells: string[], express: boolean) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');

    const opcoes = sol.opcoes as Record<string, string>;
    let precoFinal = toNumber(sol.precoFinal || sol.precoBase || 0);

    if (sol.servico.tipo === 'A') {
      const calc = await this.calcularPrecoFinalTipoA(sol.servico.slug, opcoes, upsells, express);
      precoFinal = calc.precoFinal;
    } else {
      const upsellItems = (UPSELLS[sol.servico.slug] || []).filter((u) => upsells.includes(u.id));
      const config = await getConfigPrecificacao();
      precoFinal = calcularPrecoFixo(precoFinal, upsellItems, express, toNumber(config.expressValor));
    }

    return prisma.solicitacaoServico.update({
      where: { id },
      data: { upsellsSelecionados: upsells, express, precoFinal, status: 'aprovado' },
      include: { servico: true },
    });
  }

  async horariosDisponiveis(id: string, clienteId: string) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');

    const pontos = pontosSolicitacao(sol);
    return listarHorariosDisponiveis(pontos);
  }

  async agendar(
    id: string,
    clienteId: string,
    data: { data: string; horarioInicio: string; horarioFim: string }
  ) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true, cliente: true, pedido: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');
    if (sol.status !== 'pago') {
      const pag = sol.pedidoId
        ? await prisma.pagamento.findFirst({
            where: { pedidoId: sol.pedidoId, status: 'RECEIVED' },
            orderBy: { createdAt: 'desc' },
          })
        : null;
      if (pag) {
        await prisma.solicitacaoServico.update({
          where: { id: sol.id },
          data: { status: 'pago' },
        });
      } else {
        throw new Error('Realize o pagamento antes de agendar');
      }
    }

    const pontos = pontosSolicitacao(sol);
    const dataAgenda = new Date(data.data + 'T12:00:00');

    const agendamento = await reservarCapacidade(
      dataAgenda,
      pontos,
      clienteId,
      id,
      data.horarioInicio,
      data.horarioFim,
      sol.express
    );

    if (sol.pedidoId) {
      await prisma.agendamento.update({
        where: { id: agendamento.id },
        data: { pedidoId: sol.pedidoId },
      });
    }

    await prisma.solicitacaoServico.update({
      where: { id },
      data: { status: 'agendado' },
    });

    await notificacaoService.notificarAgendamentoConfirmado({
      clienteNome: sol.cliente.nome,
      email: sol.cliente.email,
      telefone: sol.cliente.telefone,
      whatsapp: sol.cliente.whatsapp,
      pedidoNumero: sol.pedido?.numero,
      data: data.data,
      horarioInicio: data.horarioInicio,
      horarioFim: data.horarioFim,
      servicoNome: sol.servico.nome,
    });

    return agendamento;
  }

  async finalizarPagamento(id: string, clienteId: string, metodo: 'PIX' | 'BOLETO' | 'CARTAO') {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true, cliente: true, agendamento: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');
    if (!['checkout', 'aprovado', 'orcamento'].includes(sol.status)) {
      throw new Error('Checkout inválido para pagamento');
    }

    const valor = toNumber(sol.precoFinal || 0);
    const numero = `ABS-${Date.now().toString().slice(-8)}`;

    const pedido = await prisma.pedido.create({
      data: {
        numero,
        clienteId,
        valor,
        responsavel: 'Automático',
        status: 'aguardando_pagamento',
        descricao: descricaoPedido(sol),
      },
    });

    await prisma.solicitacaoServico.update({
      where: { id },
      data: { pedidoId: pedido.id, status: 'aguardando_pagamento' },
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const pagamento = await pagamentosService.criarCobranca({
      clienteId,
      pedidoId: pedido.id,
      valor,
      metodo,
      dueDate: dueDate.toISOString().split('T')[0],
      solicitacaoId: id,
    });

    return { pedido, pagamento, solicitacao: { ...sol, status: 'aguardando_pagamento', pedidoId: pedido.id } };
  }

  async statusPagamento(id: string, clienteId: string) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: {
        pedido: {
          include: {
            pagamentos: { orderBy: { createdAt: 'desc' }, take: 1 },
            ordemServico: true,
          },
        },
        agendamento: true,
        servico: true,
      },
    });
    if (!sol) throw new Error('Solicitação não encontrada');

    let pagamento = sol.pedido?.pagamentos[0];

    // Se ainda pendente, consulta o Asaas (webhook pode ter falhado)
    if (pagamento && (pagamento.status === 'PENDING' || pagamento.status === 'OVERDUE') && pagamento.asaasId) {
      try {
        const { asaasService } = await import('./asaas.service.js');
        await asaasService.sincronizarPagamentoLocal(pagamento.id);
        const atualizado = await prisma.solicitacaoServico.findFirst({
          where: { id, clienteId },
          include: {
            pedido: {
              include: {
                pagamentos: { orderBy: { createdAt: 'desc' }, take: 1 },
                ordemServico: true,
              },
            },
            agendamento: true,
            servico: true,
          },
        });
        if (atualizado) {
          pagamento = atualizado.pedido?.pagamentos[0];
          Object.assign(sol, {
            status: atualizado.status,
            pedido: atualizado.pedido,
            agendamento: atualizado.agendamento,
          });
        }
      } catch (err) {
        console.warn('[statusPagamento] sync Asaas:', err instanceof Error ? err.message : err);
      }
    }

    return {
      solicitacaoId: sol.id,
      status: sol.status,
      pedidoId: sol.pedido?.id,
      pedidoNumero: sol.pedido?.numero,
      pagamento: pagamento
        ? {
            id: pagamento.id,
            status: pagamento.status,
            metodo: pagamento.metodo,
            invoiceUrl: pagamento.invoiceUrl,
            pixCode: pagamento.pixCode,
          }
        : null,
      podeAgendar: sol.status === 'pago' || pagamento?.status === 'RECEIVED',
      agendamento: sol.agendamento,
    };
  }

  async solicitarOrcamento(clienteId: string, slug: string, descricao: string, endereco?: Record<string, string>) {
    const servico = await prisma.catalogoServico.findUnique({ where: { slug } });
    if (!servico?.ativo) throw new Error('Serviço não encontrado');
    if (servico.tipoPreco !== 'sob_orcamento') throw new Error('Este serviço possui preço fixo — adicione ao carrinho');

    if (endereco && Object.keys(endereco).length) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { endereco: endereco as Prisma.InputJsonValue },
      });
    }

    return prisma.solicitacaoServico.create({
      data: {
        clienteId,
        servicoId: servico.id,
        tipo: 'C',
        opcoes: { descricaoCliente: descricao, tipoSolicitacao: 'orcamento_comercial' },
        status: 'orcamento_pendente',
      },
      include: { servico: true },
    });
  }

  async acompanhamentoPedidos(clienteId: string) {
    const pedidos = await prisma.pedido.findMany({
      where: { clienteId },
      include: {
        ordemServico: true,
        pagamentos: { orderBy: { createdAt: 'desc' }, take: 1 },
        solicitacao: { include: { servico: true, agendamento: true } },
        agendamentos: { orderBy: { data: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pedidos.map((p) => {
      const pag = p.pagamentos[0];
      const ag = p.solicitacao?.agendamento || p.agendamentos[0];
      const timeline = buildTimeline(p, pag, ag);
      return { ...p, timeline, agendamento: ag };
    });
  }

  async minhasSolicitacoes(clienteId: string) {
    return prisma.solicitacaoServico.findMany({
      where: { clienteId },
      include: { servico: true, agendamento: true, pedido: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getUpsells(slug: string) {
    return UPSELLS[slug] || [];
  }
}

export const solicitacaoService = new SolicitacaoService();
