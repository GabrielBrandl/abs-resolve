import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import {
  PRECO_FIXO_INTERRUPTOR,
  PRECO_FIXO_TOMADA,
  PONTUACAO_SERVICO,
  UPSELLS,
} from '../config/catalogo.js';
import { calcularPrecoFixo, calcularPrecoVariavel, getConfigPrecificacao } from '../engines/pricing.engine.js';
import { listarHorariosDisponiveis, reservarCapacidade } from '../engines/capacity.engine.js';
import { analisarFotos, custosParaServico } from '../services/ia-diagnostico.service.js';
import { estoqueService } from './estoque.service.js';
import { notificacaoService } from './notificacao.service.js';
import { storageService } from './storage.service.js';
import { pagamentosService } from './pagamentos.service.js';

function chaveOpcoesTomada(opcoes: { tipo?: string; amperagem?: string }) {
  return `${opcoes.tipo || 'simples'}_${opcoes.amperagem || '10a'}`.toLowerCase();
}

export class SolicitacaoService {
  async listarCatalogo() {
    return prisma.catalogoServico.findMany({
      where: { ativo: true },
      include: { precosFixos: true },
      orderBy: { nome: 'asc' },
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

  async uploadFotos(id: string, clienteId: string, files: Express.Multer.File[]) {
    if (!files.length) throw new Error('Nenhuma foto enviada');

    const urls: string[] = [];
    for (const file of files) {
      const { url } = await storageService.upload(clienteId, file);
      urls.push(url);
    }

    return this.enviarFotos(id, clienteId, urls);
  }

  async enviarFotos(id: string, clienteId: string, fotos: string[]) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');
    if (sol.servico.tipo !== 'B') throw new Error('Este serviço não exige fotos');

    const opcoes = sol.opcoes as Record<string, string>;
    const analise = await analisarFotos(sol.servico.slug, fotos, opcoes);

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

    const pontos = PONTUACAO_SERVICO[sol.servico.slug] || sol.servico.pontos;
    return listarHorariosDisponiveis(pontos);
  }

  async agendar(
    id: string,
    clienteId: string,
    data: { data: string; horarioInicio: string; horarioFim: string }
  ) {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true, cliente: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');
    if (!['aprovado', 'orcamento'].includes(sol.status)) {
      throw new Error('Aprove o orçamento antes de agendar');
    }

    const pontos = PONTUACAO_SERVICO[sol.servico.slug] || sol.servico.pontos;
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

    await prisma.solicitacaoServico.update({
      where: { id },
      data: { status: 'agendado' },
    });

    await notificacaoService.notificarTecnicoAgendado(
      sol.cliente.nome,
      sol.cliente.email,
      sol.cliente.telefone,
      `${data.data} ${data.horarioInicio}-${data.horarioFim}`
    );

    return agendamento;
  }

  async finalizarPagamento(id: string, clienteId: string, metodo: 'PIX' | 'BOLETO' | 'CARTAO') {
    const sol = await prisma.solicitacaoServico.findFirst({
      where: { id, clienteId },
      include: { servico: true, cliente: true, agendamento: true },
    });
    if (!sol) throw new Error('Solicitação não encontrada');
    if (sol.status !== 'agendado') throw new Error('Agende antes de pagar');

    const valor = toNumber(sol.precoFinal || 0);
    const numero = `ABS-${Date.now().toString().slice(-8)}`;

    const pedido = await prisma.pedido.create({
      data: {
        numero,
        clienteId,
        valor,
        responsavel: 'Automático',
        status: 'recebido',
        descricao: `${sol.servico.nome} — solicitação ${id.slice(0, 8)}`,
      },
    });

    await prisma.solicitacaoServico.update({
      where: { id },
      data: { pedidoId: pedido.id, status: 'pago' },
    });

    if (sol.agendamento) {
      await prisma.agendamento.update({
        where: { id: sol.agendamento.id },
        data: { pedidoId: pedido.id },
      });
    }

    const opcoes = sol.opcoes as Record<string, string>;
    const chave = sol.servico.slug === 'tomada' ? chaveOpcoesTomada(opcoes) : opcoes.tipo;
    await estoqueService.reservarPorServico(sol.servico.slug, chave).catch(() => {});

    await prisma.ordemServico.create({
      data: { pedidoId: pedido.id, etapa: 'execucao' },
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const pagamento = await pagamentosService.criarCobranca({
      clienteId,
      pedidoId: pedido.id,
      valor,
      metodo,
      dueDate: dueDate.toISOString().split('T')[0],
    });

    await notificacaoService.notificarPedidoCriado(sol.cliente.nome, numero, sol.cliente.email, sol.cliente.telefone);

    return { pedido, pagamento, solicitacao: sol };
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
