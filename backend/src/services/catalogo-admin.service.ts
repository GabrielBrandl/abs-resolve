import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';
import { estoqueService } from './estoque.service.js';
import { listarHorariosDisponiveis } from '../engines/capacity.engine.js';
import { storageService } from './storage.service.js';
import { CATEGORIAS } from '../config/catalogo-servicos.js';
import { fluxoConfigService } from './fluxo-config.service.js';
import { gerarNumeroPedido } from '../utils/helpers.js';
import { HORARIOS_PADRAO } from '../config/catalogo.js';
import { notificacaoService } from './notificacao.service.js';

export type CriarAgendamentoOperacionalInput = {
  clienteId: string;
  catalogoServicoId: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  tecnicoId?: string | null;
  valor?: number;
  /** O que o técnico precisa fazer no local */
  oQueFazer?: string;
  observacoes?: string;
  materiais?: string;
  acesso?: string;
  contatoNoLocal?: string;
  prioridade?: 'normal' | 'urgente';
  express?: boolean;
  pontosUsados?: number;
  notificarCliente?: boolean;
  responsavel?: string;
};

type TipoPreco = 'fixo' | 'a_partir' | 'sob_orcamento';

function formatPrecoBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizarPreco(data: {
  tipoPreco?: string;
  precoMinimo?: number | null;
  precoTexto?: string | null;
}): { tipoPreco?: TipoPreco; precoTexto?: string } {
  const result: { tipoPreco?: TipoPreco; precoTexto?: string } = {};
  let tipo = (data.tipoPreco as TipoPreco | undefined) ?? undefined;
  const preco = data.precoMinimo;

  if (tipo === 'sob_orcamento' && preco != null && preco > 0) {
    tipo = 'fixo';
  }

  if (tipo) result.tipoPreco = tipo;

  if (!data.precoTexto?.trim() && preco != null && preco > 0) {
    result.precoTexto =
      tipo === 'a_partir' ? `A partir de ${formatPrecoBRL(preco)}` : formatPrecoBRL(preco);
  }

  return result;
}

function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function slugUnico(base: string): Promise<string> {
  let slug = base || 'servico';
  let n = 0;
  while (await prisma.catalogoServico.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export class CatalogoAdminService {
  async sincronizarTiposPreco() {
    const r = await prisma.catalogoServico.updateMany({
      where: { tipoPreco: 'sob_orcamento', precoMinimo: { gt: 0 } },
      data: { tipoPreco: 'fixo' },
    });
    if (r.count > 0) {
      console.log(`[catalogo] ${r.count} serviço(s) corrigido(s): sob_orcamento → fixo (tinham preço definido)`);
    }
    return r.count;
  }

  async listarServicos() {
    return prisma.catalogoServico.findMany({
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
      include: { precosFixos: true },
    });
  }

  listarCategorias() {
    return CATEGORIAS.map((c) => ({ slug: c.slug, nome: c.nome, icone: c.icone }));
  }

  async criarServico(data: {
    nome: string;
    slug?: string;
    categoria: string;
    descricao?: string;
    precoMinimo?: number | null;
    precoTexto?: string;
    tipoPreco?: string;
    pontos?: number;
    garantiaDias?: number;
    ordem?: number;
    imagemUrl?: string;
    ativo?: boolean;
  }) {
    if (!data.nome?.trim()) throw new Error('Nome é obrigatório');

    const categoriaValida = CATEGORIAS.some((c) => c.slug === data.categoria);
    if (!categoriaValida) throw new Error('Categoria inválida');

    const slugBase = data.slug?.trim()
      ? gerarSlug(data.slug.trim())
      : gerarSlug(data.nome);
    if (!slugBase) throw new Error('Não foi possível gerar o identificador (slug) do serviço');

    const slug = await slugUnico(slugBase);
    const precoMinimo = data.precoMinimo ?? null;
    let tipoPreco = (data.tipoPreco as TipoPreco) || 'fixo';
    if (tipoPreco === 'sob_orcamento' && precoMinimo != null && precoMinimo > 0) {
      tipoPreco = 'fixo';
    }

    const normalizado = normalizarPreco({
      tipoPreco,
      precoMinimo,
      precoTexto: data.precoTexto ?? null,
    });
    const tipoFinal = normalizado.tipoPreco ?? tipoPreco;

    const maxOrdem = await prisma.catalogoServico.aggregate({
      where: { categoria: data.categoria },
      _max: { ordem: true },
    });
    const ordem = data.ordem ?? (maxOrdem._max.ordem ?? 0) + 1;

    const servico = await prisma.catalogoServico.create({
      data: {
        slug,
        nome: data.nome.trim(),
        categoria: data.categoria,
        tipo: 'C',
        pontos: data.pontos ?? 1,
        descricao: data.descricao?.trim() || null,
        precoMinimo,
        precoTexto: data.precoTexto?.trim() || normalizado.precoTexto || null,
        tipoPreco: tipoFinal,
        garantiaDias: data.garantiaDias ?? 90,
        imagemUrl: data.imagemUrl?.trim() || null,
        ordem,
        upsells: [],
        ativo: data.ativo ?? true,
      },
      include: { precosFixos: true },
    });

    await fluxoConfigService.criarFluxoPrecoFixo(
      slug,
      precoMinimo != null && precoMinimo > 0 ? precoMinimo : null
    );

    return servico;
  }

  async atualizarServico(id: string, data: Partial<{
    nome: string;
    precoMinimo: number;
    precoTexto: string;
    tipoPreco: string;
    descricao: string;
    pontos: number;
    garantiaDias: number;
    ativo: boolean;
    ordem: number;
    imagemUrl: string;
    relacionados: string[];
  }>) {
    const atual = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!atual) throw new Error('Serviço não encontrado');

    const precoMinimo =
      data.precoMinimo !== undefined ? data.precoMinimo : Number(atual.precoMinimo) || null;
    const tipoPreco = data.tipoPreco ?? atual.tipoPreco;
    const precoTexto = data.precoTexto ?? atual.precoTexto;
    const normalizado = normalizarPreco({ tipoPreco, precoMinimo, precoTexto });

    return prisma.catalogoServico.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.precoMinimo !== undefined && { precoMinimo: data.precoMinimo }),
        ...(data.precoTexto !== undefined && { precoTexto: data.precoTexto }),
        ...(data.tipoPreco !== undefined && { tipoPreco: data.tipoPreco }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.pontos !== undefined && { pontos: data.pontos }),
        ...(data.garantiaDias !== undefined && { garantiaDias: data.garantiaDias }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.ordem !== undefined && { ordem: data.ordem }),
        ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
        ...(data.relacionados !== undefined && {
          relacionados: Array.isArray(data.relacionados)
            ? data.relacionados.filter((s) => typeof s === 'string' && s && s !== atual.slug)
            : [],
        }),
        ...(normalizado.tipoPreco && { tipoPreco: normalizado.tipoPreco }),
        ...(normalizado.precoTexto && !data.precoTexto?.trim() && { precoTexto: normalizado.precoTexto }),
      },
    });
  }

  async atualizarImagem(id: string, file: Express.Multer.File) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');

    const { url } = await storageService.upload(`catalogo`, file);
    return prisma.catalogoServico.update({ where: { id }, data: { imagemUrl: url } });
  }

  /** Desativa o serviço (mantém histórico). */
  async excluirServico(id: string) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');
    return prisma.catalogoServico.update({ where: { id }, data: { ativo: false } });
  }

  /** Exclusão permanente — só permitida quando não há solicitações vinculadas. */
  async excluirServicoPermanente(id: string) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');

    const solicitacoes = await prisma.solicitacaoServico.count({ where: { servicoId: id } });
    if (solicitacoes > 0) {
      throw new Error(
        'Este serviço já tem solicitações de clientes vinculadas. Use "Desativar" para removê-lo do catálogo sem apagar o histórico.'
      );
    }

    await prisma.$transaction([
      prisma.precoFixo.deleteMany({ where: { servicoId: id } }),
      prisma.fluxoServicoConfig.deleteMany({ where: { slug: servico.slug } }),
      prisma.catalogoServico.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  async getConfig() {
    return prisma.configSistema.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  async updateConfig(data: Record<string, number>) {
    const num = (key: string) => (data[key] !== undefined && Number.isFinite(Number(data[key])) ? Number(data[key]) : undefined);
    return prisma.configSistema.update({
      where: { id: 'default' },
      data: {
        ...(num('expressValor') !== undefined && { expressValor: num('expressValor') }),
        ...(num('taxaCancelamento') !== undefined && { taxaCancelamento: num('taxaCancelamento') }),
        ...(num('taxaAusencia') !== undefined && { taxaAusencia: num('taxaAusencia') }),
        ...(num('impostos') !== undefined && { impostos: num('impostos') }),
        ...(num('taxaCartao') !== undefined && { taxaCartao: num('taxaCartao') }),
        ...(num('lucro') !== undefined && { lucro: num('lucro') }),
        ...(num('overhead') !== undefined && { overhead: num('overhead') }),
        ...(num('cashbackPercent') !== undefined && { cashbackPercent: num('cashbackPercent') }),
        ...(num('bonusIndicacao') !== undefined && { bonusIndicacao: num('bonusIndicacao') }),
        ...(num('garantiaPadraoDias') !== undefined && { garantiaPadraoDias: Math.round(num('garantiaPadraoDias')!) }),
        ...(num('descontoNovoClientePercent') !== undefined && { descontoNovoClientePercent: num('descontoNovoClientePercent') }),
      },
    });
  }

  async listarEstoque() {
    return estoqueService.listarComFiltros();
  }

  async atualizarEstoque(id: string, quantidade: number, minimo?: number) {
    const produto = await prisma.produtoEstoque.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');
    if (quantidade !== produto.quantidade) {
      await estoqueService.movimentar(id, {
        tipo: 'ajuste',
        quantidade,
        motivo: 'Ajuste via catálogo admin',
        responsavel: 'admin',
      });
    }
    if (minimo !== undefined && minimo !== produto.minimo) {
      return estoqueService.atualizar(id, { minimo });
    }
    return estoqueService.buscarPorId(id);
  }

  async listarTecnicos() {
    return prisma.tecnico.findMany({ orderBy: { nome: 'asc' } });
  }

  async criarTecnico(nome: string, capacidadeDiaria = 6) {
    return prisma.tecnico.create({ data: { nome, capacidadeDiaria } });
  }

  async agendaOperacional(dataInicio?: string, dias = 14) {
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : new Date();
    inicio.setHours(0, 0, 0, 0);
    const janela = Math.max(1, Math.min(31, Number(dias) || 14));
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + janela - 1);
    fim.setHours(23, 59, 59, 999);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        data: { gte: inicio, lte: fim },
        status: { in: ['confirmado', 'reagendado', 'a_caminho', 'em_execucao'] },
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, email: true, endereco: true } },
        tecnico: { select: { id: true, nome: true } },
        pedido: {
          select: {
            id: true,
            numero: true,
            descricao: true,
            valor: true,
            status: true,
            ordemServico: { select: { id: true, observacoes: true, etapa: true } },
          },
        },
        solicitacao: {
          select: {
            id: true,
            opcoes: true,
            tipo: true,
            express: true,
            servico: { select: { id: true, nome: true, slug: true, categoria: true, descricao: true } },
          },
        },
      },
      orderBy: [{ data: 'asc' }, { horarioInicio: 'asc' }],
    });

    const tecnicos = await prisma.tecnico.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, capacidadeDiaria: true },
      orderBy: { nome: 'asc' },
    });

    return {
      agendamentos: agendamentos.map((ag) => {
        const opcoes = (ag.solicitacao?.opcoes || {}) as Record<string, unknown>;
        return {
          ...ag,
          servicoNome: ag.solicitacao?.servico?.nome || ag.pedido?.descricao || 'Serviço',
          detalhes: {
            oQueFazer: String(opcoes.oQueFazer || ag.pedido?.descricao || ''),
            observacoes: String(opcoes.observacoes || ag.pedido?.ordemServico?.observacoes || ''),
            materiais: String(opcoes.materiais || ''),
            acesso: String(opcoes.acesso || ''),
            contatoNoLocal: String(opcoes.contatoNoLocal || ''),
            prioridade: String(opcoes.prioridade || 'normal'),
            categoria: ag.solicitacao?.servico?.categoria || '',
            valor: ag.pedido?.valor != null ? Number(ag.pedido.valor) : null,
          },
        };
      }),
      tecnicos,
      periodo: { inicio, fim },
      slotsPadrao: HORARIOS_PADRAO,
    };
  }

  async criarAgendamentoOperacional(input: CriarAgendamentoOperacionalInput) {
    const {
      clienteId,
      catalogoServicoId,
      data,
      horarioInicio,
      horarioFim,
      tecnicoId,
      valor,
      oQueFazer,
      observacoes,
      materiais,
      acesso,
      contatoNoLocal,
      prioridade = 'normal',
      express = false,
      pontosUsados,
      notificarCliente = true,
      responsavel = 'Operacional',
    } = input;

    if (!clienteId || !catalogoServicoId || !data || !horarioInicio || !horarioFim) {
      throw new Error('Cliente, serviço, data e horário são obrigatórios');
    }

    const slotOk = HORARIOS_PADRAO.some((s) => s.inicio === horarioInicio && s.fim === horarioFim);
    if (!slotOk) throw new Error('Horário inválido. Use um dos turnos padrão da operação.');

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const servico = await prisma.catalogoServico.findFirst({
      where: { id: catalogoServicoId, ativo: true },
    });
    if (!servico) throw new Error('Serviço do catálogo não encontrado ou inativo');

    if (tecnicoId) {
      const tecnico = await prisma.tecnico.findFirst({ where: { id: tecnicoId, ativo: true } });
      if (!tecnico) throw new Error('Técnico não encontrado ou inativo');
    }

    const pontos = Math.max(1, Number(pontosUsados) || servico.pontos || 2);
    const valorPedido =
      valor != null && !Number.isNaN(Number(valor))
        ? Number(valor)
        : servico.precoMinimo != null
          ? Number(servico.precoMinimo)
          : 0;

    const descricaoPedido = [servico.nome, oQueFazer?.trim()].filter(Boolean).join(' — ').slice(0, 500);
    const numero = await gerarNumeroPedido();

    const opcoes: Record<string, unknown> = {
      origem: 'agenda_operacional',
      oQueFazer: oQueFazer?.trim() || '',
      observacoes: observacoes?.trim() || '',
      materiais: materiais?.trim() || '',
      acesso: acesso?.trim() || '',
      contatoNoLocal: contatoNoLocal?.trim() || '',
      prioridade,
      criadoEm: new Date().toISOString(),
    };

    const result = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({
        data: {
          numero,
          clienteId,
          valor: valorPedido,
          responsavel,
          descricao: descricaoPedido || servico.nome,
          status: 'em_processamento',
        },
      });

      const solicitacao = await tx.solicitacaoServico.create({
        data: {
          clienteId,
          servicoId: servico.id,
          tipo: servico.tipo || 'padrao',
          status: 'agendado',
          precoBase: valorPedido || null,
          precoFinal: valorPedido || null,
          express,
          pedidoId: pedido.id,
          opcoes: opcoes as Prisma.InputJsonValue,
        },
      });

      const dataAgenda = new Date(`${data}T12:00:00`);
      const capacidade = await tx.tecnico.findMany({ where: { ativo: true } });
      const capTotal = capacidade.reduce((s, t) => s + t.capacidadeDiaria, 0);
      const inicioDia = new Date(dataAgenda);
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date(inicioDia);
      fimDia.setDate(fimDia.getDate() + 1);
      const usadosAgg = await tx.agendamento.findMany({
        where: {
          data: { gte: inicioDia, lt: fimDia },
          status: { notIn: ['cancelado'] },
        },
      });
      const usados = usadosAgg.reduce((s, a) => s + a.pontosUsados, 0);
      if (usados + pontos > capTotal) {
        throw new Error('Horário indisponível. Capacidade operacional atingida.');
      }

      const agendamento = await tx.agendamento.create({
        data: {
          clienteId,
          solicitacaoId: solicitacao.id,
          pedidoId: pedido.id,
          tecnicoId: tecnicoId || undefined,
          data: inicioDia,
          horarioInicio,
          horarioFim,
          pontosUsados: pontos,
          express,
          status: 'confirmado',
        },
      });

      await tx.ordemServico.create({
        data: {
          pedidoId: pedido.id,
          etapa: 'execucao',
          tecnicoId: tecnicoId || undefined,
          observacoes: [oQueFazer, observacoes, materiais ? `Materiais: ${materiais}` : '', acesso ? `Acesso: ${acesso}` : '']
            .filter(Boolean)
            .join('\n')
            .slice(0, 2000) || null,
        },
      });

      return { agendamento, pedido, solicitacao, servico };
    });

    if (notificarCliente) {
      notificacaoService
        .notificarAgendamentoConfirmado({
          clienteNome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          whatsapp: cliente.whatsapp,
          pedidoNumero: result.pedido.numero,
          data,
          horarioInicio,
          horarioFim,
          servicoNome: servico.nome,
        })
        .catch(() => {});
    }

    return {
      ...result.agendamento,
      pedido: { numero: result.pedido.numero, id: result.pedido.id },
      servicoNome: servico.nome,
    };
  }

  async atualizarDetalhesAgendamento(
    agendamentoId: string,
    data: {
      oQueFazer?: string;
      observacoes?: string;
      materiais?: string;
      acesso?: string;
      contatoNoLocal?: string;
      prioridade?: 'normal' | 'urgente';
      tecnicoId?: string | null;
      valor?: number;
    }
  ) {
    const ag = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        solicitacao: true,
        pedido: { include: { ordemServico: true } },
      },
    });
    if (!ag) throw new Error('Agendamento não encontrado');

    const opcoesAtuais = ((ag.solicitacao?.opcoes || {}) as Record<string, unknown>) || {};
    const opcoes = {
      ...opcoesAtuais,
      ...(data.oQueFazer !== undefined && { oQueFazer: data.oQueFazer }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      ...(data.materiais !== undefined && { materiais: data.materiais }),
      ...(data.acesso !== undefined && { acesso: data.acesso }),
      ...(data.contatoNoLocal !== undefined && { contatoNoLocal: data.contatoNoLocal }),
      ...(data.prioridade !== undefined && { prioridade: data.prioridade }),
    };

    if (ag.solicitacaoId) {
      await prisma.solicitacaoServico.update({
        where: { id: ag.solicitacaoId },
        data: { opcoes: opcoes as Prisma.InputJsonValue },
      });
    }

    if (ag.pedidoId) {
      const oQue = data.oQueFazer ?? String(opcoes.oQueFazer || '');
      await prisma.pedido.update({
        where: { id: ag.pedidoId },
        data: {
          ...(oQue && { descricao: oQue.slice(0, 500) }),
          ...(data.valor != null && !Number.isNaN(Number(data.valor)) && { valor: Number(data.valor) }),
        },
      });

      if (ag.pedido?.ordemServico) {
        const mat = data.materiais ?? String(opcoes.materiais || '');
        const obs = data.observacoes ?? String(opcoes.observacoes || '');
        const obsOs = [oQue, obs, mat ? `Materiais: ${mat}` : '']
          .filter(Boolean)
          .join('\n')
          .slice(0, 2000);
        await prisma.ordemServico.update({
          where: { id: ag.pedido.ordemServico.id },
          data: {
            observacoes: obsOs || null,
            ...(data.tecnicoId !== undefined && { tecnicoId: data.tecnicoId }),
          },
        });
      }
    }

    if (data.tecnicoId !== undefined) {
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { tecnicoId: data.tecnicoId },
      });
    }

    return this.agendaOperacional(
      ag.data.toISOString().slice(0, 10),
      1
    ).then((r) => r.agendamentos.find((a) => a.id === agendamentoId) || { id: agendamentoId });
  }

  async orcamentosPendentes() {
    return prisma.solicitacaoServico.findMany({
      where: { status: 'orcamento_pendente' },
      include: { servico: true, cliente: { select: { id: true, nome: true, email: true, telefone: true, endereco: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async responderOrcamento(id: string, precoFinal: number, observacao?: string) {
    const sol = await prisma.solicitacaoServico.findUnique({ where: { id } });
    if (!sol || sol.status !== 'orcamento_pendente') throw new Error('Orçamento não encontrado');

    const opcoes = sol.opcoes as Record<string, unknown>;
    return prisma.solicitacaoServico.update({
      where: { id },
      data: {
        precoBase: precoFinal,
        precoFinal,
        status: 'checkout',
        opcoes: { ...opcoes, respostaComercial: observacao } as Prisma.InputJsonValue,
      },
      include: { servico: true, cliente: true },
    });
  }

  async horariosCapacidade(pontos = 2) {
    return listarHorariosDisponiveis(pontos);
  }
}

export const catalogoAdminService = new CatalogoAdminService();
