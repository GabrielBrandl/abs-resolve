import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';

export const TIPOS_CALCULO = ['metragem', 'quantidade', 'fixo', 'bloco'] as const;
export type TipoCalculo = (typeof TIPOS_CALCULO)[number];

export const UNIDADES_MATERIAL = [
  'metro',
  'unidade',
  'rolo',
  'kit',
  'peca',
  'pacote',
] as const;

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function parseNumeroResposta(raw: string | undefined | null): number {
  if (raw == null || raw === '') return 0;
  const s = String(raw).trim().replace(',', '.');
  // opções tipo "3", "3-metros", "mais-de-4" → tenta extrair número
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) return Number(m[1]) || 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Extrai respostas mescladas + quantidade de aparelhos/unidades a partir da solicitação. */
export function extrairRespostasDoPedido(sol: {
  opcoes?: unknown;
  servico?: { slug?: string } | null;
}): { respostas: Record<string, string>; quantidadeUnidades: number; slug?: string } {
  const opcoes = (sol.opcoes || {}) as Record<string, unknown>;
  const respostas: Record<string, string> = {};
  let quantidadeUnidades = 1;

  const itens = Array.isArray(opcoes.itens) ? (opcoes.itens as Array<Record<string, unknown>>) : [];
  if (itens.length) {
    for (const item of itens) {
      if (item.tipo === 'peca') continue;
      const r = (item.respostas || {}) as Record<string, string>;
      Object.assign(respostas, r);
      const qLinha = Number(item.quantidade) || 1;
      const qFluxo = parseNumeroResposta(r.quantidade);
      quantidadeUnidades = Math.max(quantidadeUnidades, qFluxo || qLinha);
    }
  } else {
    // formato antigo: respostas no root
    for (const [k, v] of Object.entries(opcoes)) {
      if (typeof v === 'string') respostas[k] = v;
    }
    quantidadeUnidades = Math.max(1, parseNumeroResposta(respostas.quantidade) || 1);
  }

  if (!respostas.quantidade && quantidadeUnidades > 1) {
    respostas.quantidade = String(quantidadeUnidades);
  }

  return { respostas, quantidadeUnidades, slug: sol.servico?.slug };
}

function receitaBateCondicoes(
  condicoes: Array<{ perguntaId: string; opcaoIds: unknown }>,
  respostas: Record<string, string>
): boolean {
  if (!condicoes.length) return true;
  return condicoes.every((c) => {
    const ids = asStringArray(c.opcaoIds);
    if (!ids.length) return true;
    const resp = respostas[c.perguntaId];
    return resp != null && ids.includes(resp);
  });
}

function absForneceMaterial(
  receita: { perguntaFornecimentoId: string | null; opcoesAbsFornece: unknown },
  respostas: Record<string, string>
): boolean | null {
  if (!receita.perguntaFornecimentoId) return null; // não configurado → sempre gerar
  const resp = respostas[receita.perguntaFornecimentoId];
  if (resp == null || resp === '') return null;
  const ops = asStringArray(receita.opcoesAbsFornece);
  if (!ops.length) return null;
  return ops.includes(resp);
}

/** Exposto para testes do motor (sem DB). */
export function calcularQuantidade(
  mat: {
    tipoCalculo: string;
    fator: unknown;
    perguntaRefId: string | null;
    blocoX: unknown;
    blocoY: unknown;
    fixoEscopo: string | null;
    quantidadeFixa: unknown;
  },
  respostas: Record<string, string>,
  quantidadeUnidades: number
): number {
  const fator = toNumber(mat.fator) || 1;
  const tipo = mat.tipoCalculo;

  if (tipo === 'metragem') {
    const ref = mat.perguntaRefId || 'metragem';
    const valor = parseNumeroResposta(respostas[ref]);
    return Math.round(valor * fator * 10000) / 10000;
  }

  if (tipo === 'quantidade') {
    const ref = mat.perguntaRefId || 'quantidade';
    const valor = parseNumeroResposta(respostas[ref]) || quantidadeUnidades;
    return Math.round(valor * fator * 10000) / 10000;
  }

  if (tipo === 'fixo') {
    const base = toNumber(mat.quantidadeFixa) || fator || 1;
    if (mat.fixoEscopo === 'por_unidade') {
      return Math.round(base * quantidadeUnidades * 10000) / 10000;
    }
    return Math.round(base * 10000) / 10000; // por_os
  }

  if (tipo === 'bloco') {
    const ref = mat.perguntaRefId || 'metragem';
    const valor = parseNumeroResposta(respostas[ref]);
    const x = toNumber(mat.blocoX) || 1;
    const y = toNumber(mat.blocoY) || 1;
    if (x <= 0) return 0;
    return Math.ceil(valor / x) * y;
  }

  return 0;
}

export class ReceitaTecnicaService {
  async listarPorServico(catalogoServicoId: string) {
    return prisma.receitaTecnica.findMany({
      where: { catalogoServicoId },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      include: {
        condicoes: true,
        materiais: { orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] },
      },
    });
  }

  async buscar(id: string) {
    const r = await prisma.receitaTecnica.findUnique({
      where: { id },
      include: {
        condicoes: true,
        materiais: { orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] },
        catalogoServico: { select: { id: true, slug: true, nome: true } },
      },
    });
    if (!r) throw new Error('Receita técnica não encontrada');
    return r;
  }

  async criar(data: {
    catalogoServicoId: string;
    nome: string;
    ativo?: boolean;
    ordem?: number;
    perguntaFornecimentoId?: string | null;
    opcoesAbsFornece?: string[];
    condicoes?: Array<{ perguntaId: string; opcaoIds: string[] }>;
  }) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id: data.catalogoServicoId } });
    if (!servico) throw new Error('Serviço do catálogo não encontrado');
    if (!data.nome?.trim()) throw new Error('Informe o nome da receita');

    return prisma.receitaTecnica.create({
      data: {
        catalogoServicoId: data.catalogoServicoId,
        nome: data.nome.trim(),
        ativo: data.ativo !== false,
        ordem: data.ordem ?? 0,
        perguntaFornecimentoId: data.perguntaFornecimentoId || null,
        opcoesAbsFornece: (data.opcoesAbsFornece || []) as Prisma.InputJsonValue,
        condicoes: data.condicoes?.length
          ? {
              create: data.condicoes.map((c) => ({
                perguntaId: c.perguntaId,
                opcaoIds: c.opcaoIds as Prisma.InputJsonValue,
              })),
            }
          : undefined,
      },
      include: { condicoes: true, materiais: true },
    });
  }

  async atualizar(
    id: string,
    data: Partial<{
      nome: string;
      ativo: boolean;
      ordem: number;
      perguntaFornecimentoId: string | null;
      opcoesAbsFornece: string[];
      condicoes: Array<{ perguntaId: string; opcaoIds: string[] }>;
    }>
  ) {
    await this.buscar(id);
    if (data.condicoes) {
      await prisma.receitaCondicao.deleteMany({ where: { receitaId: id } });
      if (data.condicoes.length) {
        await prisma.receitaCondicao.createMany({
          data: data.condicoes.map((c) => ({
            receitaId: id,
            perguntaId: c.perguntaId,
            opcaoIds: c.opcaoIds as Prisma.InputJsonValue,
          })),
        });
      }
    }
    return prisma.receitaTecnica.update({
      where: { id },
      data: {
        ...(data.nome != null ? { nome: data.nome.trim() } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
        ...(data.perguntaFornecimentoId !== undefined
          ? { perguntaFornecimentoId: data.perguntaFornecimentoId }
          : {}),
        ...(data.opcoesAbsFornece !== undefined
          ? { opcoesAbsFornece: data.opcoesAbsFornece as Prisma.InputJsonValue }
          : {}),
      },
      include: { condicoes: true, materiais: { orderBy: { ordem: 'asc' } } },
    });
  }

  async duplicar(id: string) {
    const orig = await this.buscar(id);
    return prisma.receitaTecnica.create({
      data: {
        catalogoServicoId: orig.catalogoServicoId,
        nome: `${orig.nome} (cópia)`,
        ativo: false,
        ordem: orig.ordem + 1,
        perguntaFornecimentoId: orig.perguntaFornecimentoId,
        opcoesAbsFornece: orig.opcoesAbsFornece as Prisma.InputJsonValue,
        condicoes: {
          create: orig.condicoes.map((c) => ({
            perguntaId: c.perguntaId,
            opcaoIds: c.opcaoIds as Prisma.InputJsonValue,
          })),
        },
        materiais: {
          create: orig.materiais.map((m) => ({
            nome: m.nome,
            especificacao: m.especificacao,
            bitolaModelo: m.bitolaModelo,
            unidade: m.unidade,
            tipoCalculo: m.tipoCalculo,
            fator: m.fator,
            perguntaRefId: m.perguntaRefId,
            blocoX: m.blocoX,
            blocoY: m.blocoY,
            fixoEscopo: m.fixoEscopo,
            quantidadeFixa: m.quantidadeFixa,
            observacaoInterna: m.observacaoInterna,
            custoUnitario: m.custoUnitario,
            consumivelOperacional: m.consumivelOperacional,
            produtoEstoqueId: m.produtoEstoqueId,
            ativo: m.ativo,
            ordem: m.ordem,
          })),
        },
      },
      include: { condicoes: true, materiais: true },
    });
  }

  async adicionarMaterial(
    receitaId: string,
    data: {
      nome: string;
      especificacao?: string | null;
      bitolaModelo?: string | null;
      unidade?: string;
      tipoCalculo: string;
      fator?: number;
      perguntaRefId?: string | null;
      blocoX?: number | null;
      blocoY?: number | null;
      fixoEscopo?: string | null;
      quantidadeFixa?: number | null;
      observacaoInterna?: string | null;
      custoUnitario?: number | null;
      consumivelOperacional?: boolean;
      produtoEstoqueId?: string | null;
      ativo?: boolean;
      ordem?: number;
    }
  ) {
    await this.buscar(receitaId);
    if (!data.nome?.trim()) throw new Error('Informe o nome do material');
    if (!TIPOS_CALCULO.includes(data.tipoCalculo as TipoCalculo)) {
      throw new Error('Tipo de cálculo inválido');
    }
    return prisma.receitaMaterial.create({
      data: {
        receitaId,
        nome: data.nome.trim(),
        especificacao: data.especificacao || null,
        bitolaModelo: data.bitolaModelo || null,
        unidade: data.unidade || 'unidade',
        tipoCalculo: data.tipoCalculo,
        fator: data.fator ?? 1,
        perguntaRefId: data.perguntaRefId || null,
        blocoX: data.blocoX ?? null,
        blocoY: data.blocoY ?? null,
        fixoEscopo: data.fixoEscopo || (data.tipoCalculo === 'fixo' ? 'por_os' : null),
        quantidadeFixa: data.quantidadeFixa ?? null,
        observacaoInterna: data.observacaoInterna || null,
        custoUnitario: data.custoUnitario ?? null,
        consumivelOperacional: data.consumivelOperacional === true,
        produtoEstoqueId: data.produtoEstoqueId || null,
        ativo: data.ativo !== false,
        ordem: data.ordem ?? 0,
      },
    });
  }

  async atualizarMaterial(
    materialId: string,
    data: Partial<{
      nome: string;
      especificacao: string | null;
      bitolaModelo: string | null;
      unidade: string;
      tipoCalculo: string;
      fator: number;
      perguntaRefId: string | null;
      blocoX: number | null;
      blocoY: number | null;
      fixoEscopo: string | null;
      quantidadeFixa: number | null;
      observacaoInterna: string | null;
      custoUnitario: number | null;
      consumivelOperacional: boolean;
      produtoEstoqueId: string | null;
      ativo: boolean;
      ordem: number;
    }>
  ) {
    const mat = await prisma.receitaMaterial.findUnique({ where: { id: materialId } });
    if (!mat) throw new Error('Material da receita não encontrado');
    if (data.tipoCalculo && !TIPOS_CALCULO.includes(data.tipoCalculo as TipoCalculo)) {
      throw new Error('Tipo de cálculo inválido');
    }
    return prisma.receitaMaterial.update({
      where: { id: materialId },
      data: {
        ...(data.nome != null ? { nome: data.nome.trim() } : {}),
        ...(data.especificacao !== undefined ? { especificacao: data.especificacao } : {}),
        ...(data.bitolaModelo !== undefined ? { bitolaModelo: data.bitolaModelo } : {}),
        ...(data.unidade != null ? { unidade: data.unidade } : {}),
        ...(data.tipoCalculo != null ? { tipoCalculo: data.tipoCalculo } : {}),
        ...(data.fator !== undefined ? { fator: data.fator } : {}),
        ...(data.perguntaRefId !== undefined ? { perguntaRefId: data.perguntaRefId } : {}),
        ...(data.blocoX !== undefined ? { blocoX: data.blocoX } : {}),
        ...(data.blocoY !== undefined ? { blocoY: data.blocoY } : {}),
        ...(data.fixoEscopo !== undefined ? { fixoEscopo: data.fixoEscopo } : {}),
        ...(data.quantidadeFixa !== undefined ? { quantidadeFixa: data.quantidadeFixa } : {}),
        ...(data.observacaoInterna !== undefined ? { observacaoInterna: data.observacaoInterna } : {}),
        ...(data.custoUnitario !== undefined ? { custoUnitario: data.custoUnitario } : {}),
        ...(data.consumivelOperacional !== undefined
          ? { consumivelOperacional: data.consumivelOperacional }
          : {}),
        ...(data.produtoEstoqueId !== undefined ? { produtoEstoqueId: data.produtoEstoqueId } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
      },
    });
  }

  async removerMaterial(materialId: string) {
    const mat = await prisma.receitaMaterial.findUnique({ where: { id: materialId } });
    if (!mat) throw new Error('Material da receita não encontrado');
    return prisma.receitaMaterial.update({
      where: { id: materialId },
      data: { ativo: false },
    });
  }

  /**
   * Gera lista de materiais na OS a partir das receitas do catálogo + respostas do pedido.
   * Idempotente: se já houver snapshot e linhas automáticas, não regenera (salvo force).
   */
  async gerarMateriaisParaOs(ordemServicoId: string, opts?: { force?: boolean }) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        materiais: true,
        pedido: {
          include: {
            solicitacao: { include: { servico: true } },
          },
        },
      },
    });
    if (!os) throw new Error('OS não encontrada');
    if (os.materiaisSnapshot && !opts?.force && os.materiais.some((m) => m.origem === 'automatico')) {
      return os;
    }

    const sol = os.pedido.solicitacao;
    if (!sol?.servicoId) {
      await prisma.ordemServico.update({
        where: { id: ordemServicoId },
        data: {
          materiaisSnapshot: {
            geradoEm: new Date().toISOString(),
            aviso: 'Pedido sem solicitação/catálogo — nenhuma receita aplicada',
            linhas: [],
          } as Prisma.InputJsonValue,
        },
      });
      return this.buscarOsComMateriais(ordemServicoId);
    }

    const { respostas, quantidadeUnidades } = extrairRespostasDoPedido(sol);
    const receitas = await prisma.receitaTecnica.findMany({
      where: { catalogoServicoId: sol.servicoId, ativo: true },
      include: {
        condicoes: true,
        materiais: { where: { ativo: true }, orderBy: { ordem: 'asc' } },
      },
      orderBy: { ordem: 'asc' },
    });

    const aplicaveis = receitas.filter((r) => receitaBateCondicoes(r.condicoes, respostas));
    const linhas: Array<{
      receitaId: string;
      receitaNome: string;
      receitaMaterialId: string;
      nome: string;
      especificacao: string | null;
      bitolaModelo: string | null;
      unidade: string;
      quantidade: number;
      custoUnitario: number | null;
      custoPrevisto: number | null;
      observacao: string | null;
      consumivelOperacional: boolean;
    }> = [];

    const avisos: string[] = [];

    for (const receita of aplicaveis) {
      const fornece = absForneceMaterial(receita, respostas);
      if (fornece === false) {
        avisos.push(
          `Receita "${receita.nome}": material principal fornecido pelo cliente — gerando apenas consumíveis operacionais.`
        );
      }

      for (const mat of receita.materiais) {
        if (fornece === false && !mat.consumivelOperacional) continue;
        const qtd = calcularQuantidade(mat, respostas, quantidadeUnidades);
        if (qtd <= 0) continue;
        const custoUnit = mat.custoUnitario != null ? toNumber(mat.custoUnitario) : null;
        const custoPrev = custoUnit != null ? Math.round(custoUnit * qtd * 100) / 100 : null;
        linhas.push({
          receitaId: receita.id,
          receitaNome: receita.nome,
          receitaMaterialId: mat.id,
          nome: mat.nome,
          especificacao: mat.especificacao,
          bitolaModelo: mat.bitolaModelo,
          unidade: mat.unidade,
          quantidade: qtd,
          custoUnitario: custoUnit,
          custoPrevisto: custoPrev,
          observacao: mat.observacaoInterna,
          consumivelOperacional: mat.consumivelOperacional,
        });
      }
    }

    const custoPrevistoTotal = linhas.reduce((s, l) => s + (l.custoPrevisto || 0), 0);

    const snapshot = {
      geradoEm: new Date().toISOString(),
      catalogoServicoId: sol.servicoId,
      servicoSlug: sol.servico?.slug,
      servicoNome: sol.servico?.nome,
      respostas,
      quantidadeUnidades,
      receitasAplicadas: aplicaveis.map((r) => ({
        id: r.id,
        nome: r.nome,
        condicoes: r.condicoes.map((c) => ({
          perguntaId: c.perguntaId,
          opcaoIds: asStringArray(c.opcaoIds),
        })),
      })),
      avisos,
      materialClienteFornece: aplicaveis.some((r) => absForneceMaterial(r, respostas) === false),
      linhas,
      custoPrevistoTotal,
    };

    await prisma.$transaction(async (tx) => {
      await tx.osMaterial.deleteMany({
        where: { ordemServicoId, origem: 'automatico' },
      });
      if (linhas.length) {
        await tx.osMaterial.createMany({
          data: linhas.map((l, idx) => ({
            ordemServicoId,
            receitaId: l.receitaId,
            receitaMaterialId: l.receitaMaterialId,
            nome: l.nome,
            especificacao: l.especificacao,
            bitolaModelo: l.bitolaModelo,
            unidade: l.unidade,
            quantidade: l.quantidade,
            custoUnitario: l.custoUnitario,
            custoPrevisto: l.custoPrevisto,
            observacao: l.observacao,
            origem: 'automatico',
            ativo: true,
            ordem: idx,
          })),
        });
      }
      await tx.ordemServico.update({
        where: { id: ordemServicoId },
        data: {
          materiaisSnapshot: snapshot as Prisma.InputJsonValue,
          materiaisAjusteManual: false,
        },
      });
    });

    return this.buscarOsComMateriais(ordemServicoId);
  }

  async buscarOsComMateriais(ordemServicoId: string) {
    return prisma.ordemServico.findUniqueOrThrow({
      where: { id: ordemServicoId },
      include: {
        materiais: { where: { ativo: true }, orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] },
        pedido: {
          include: {
            cliente: { select: { id: true, nome: true } },
            solicitacao: { include: { servico: true } },
          },
        },
      },
    });
  }

  async listarMateriaisOs(ordemServicoId: string) {
    const os = await this.buscarOsComMateriais(ordemServicoId);
    const ativos = os.materiais;
    const custoPrevistoTotal = ativos.reduce((s, m) => s + toNumber(m.custoPrevisto), 0);
    return {
      materiais: ativos,
      snapshot: os.materiaisSnapshot,
      ajusteManual: os.materiaisAjusteManual,
      custoPrevistoTotal: Math.round(custoPrevistoTotal * 100) / 100,
    };
  }

  async adicionarMaterialOs(
    ordemServicoId: string,
    data: {
      nome: string;
      especificacao?: string | null;
      bitolaModelo?: string | null;
      unidade?: string;
      quantidade: number;
      custoUnitario?: number | null;
      observacao?: string | null;
    }
  ) {
    await prisma.ordemServico.findUniqueOrThrow({ where: { id: ordemServicoId } });
    if (!data.nome?.trim()) throw new Error('Informe o nome');
    if (!(data.quantidade > 0)) throw new Error('Quantidade inválida');
    const custoUnit = data.custoUnitario ?? null;
    const custoPrev =
      custoUnit != null ? Math.round(custoUnit * data.quantidade * 100) / 100 : null;
    const linha = await prisma.osMaterial.create({
      data: {
        ordemServicoId,
        nome: data.nome.trim(),
        especificacao: data.especificacao || null,
        bitolaModelo: data.bitolaModelo || null,
        unidade: data.unidade || 'unidade',
        quantidade: data.quantidade,
        custoUnitario: custoUnit,
        custoPrevisto: custoPrev,
        observacao: data.observacao || null,
        origem: 'manual',
        ativo: true,
      },
    });
    await prisma.ordemServico.update({
      where: { id: ordemServicoId },
      data: { materiaisAjusteManual: true },
    });
    return linha;
  }

  async atualizarMaterialOs(
    materialId: string,
    data: Partial<{
      nome: string;
      especificacao: string | null;
      bitolaModelo: string | null;
      unidade: string;
      quantidade: number;
      custoUnitario: number | null;
      observacao: string | null;
      ativo: boolean;
    }>
  ) {
    const mat = await prisma.osMaterial.findUnique({ where: { id: materialId } });
    if (!mat) throw new Error('Material da OS não encontrado');
    const quantidade = data.quantidade !== undefined ? data.quantidade : toNumber(mat.quantidade);
    const custoUnit =
      data.custoUnitario !== undefined
        ? data.custoUnitario
        : mat.custoUnitario != null
          ? toNumber(mat.custoUnitario)
          : null;
    const custoPrev =
      custoUnit != null ? Math.round(custoUnit * quantidade * 100) / 100 : null;

    const updated = await prisma.osMaterial.update({
      where: { id: materialId },
      data: {
        ...(data.nome != null ? { nome: data.nome.trim() } : {}),
        ...(data.especificacao !== undefined ? { especificacao: data.especificacao } : {}),
        ...(data.bitolaModelo !== undefined ? { bitolaModelo: data.bitolaModelo } : {}),
        ...(data.unidade != null ? { unidade: data.unidade } : {}),
        ...(data.quantidade !== undefined ? { quantidade: data.quantidade } : {}),
        ...(data.custoUnitario !== undefined ? { custoUnitario: data.custoUnitario } : {}),
        custoPrevisto: custoPrev,
        ...(data.observacao !== undefined ? { observacao: data.observacao } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        origem: mat.origem === 'automatico' ? 'ajustado' : mat.origem,
      },
    });
    await prisma.ordemServico.update({
      where: { id: mat.ordemServicoId },
      data: { materiaisAjusteManual: true },
    });
    return updated;
  }

  async removerMaterialOs(materialId: string) {
    return this.atualizarMaterialOs(materialId, { ativo: false });
  }
}

export const receitaTecnicaService = new ReceitaTecnicaService();
