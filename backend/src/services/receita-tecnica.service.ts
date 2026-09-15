import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';

export const TIPOS_CALCULO = ['metragem', 'quantidade', 'fixo', 'bloco'] as const;
export type TipoCalculo = (typeof TIPOS_CALCULO)[number];

export const TIPOS_RECEITA = ['materiais', 'pendencia_tecnica'] as const;
export type TipoReceita = (typeof TIPOS_RECEITA)[number];

export const UNIDADES_MATERIAL = [
  'metro',
  'unidade',
  'rolo',
  'kit',
  'peca',
  'pacote',
] as const;

type OpcaoResolucao = { id: string; label: string };

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function asOpcoesResolucao(v: unknown): OpcaoResolucao[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      const o = x as Record<string, unknown>;
      const id = String(o.id || '').trim();
      const label = String(o.label || o.id || '').trim();
      if (!id) return null;
      return { id, label: label || id };
    })
    .filter((x): x is OpcaoResolucao => Boolean(x));
}

function dadosTecnicosObj(raw: unknown): {
  respostasConfirmadas: Record<string, string>;
  historico: Array<Record<string, unknown>>;
} {
  const base = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const resp = (base.respostasConfirmadas && typeof base.respostasConfirmadas === 'object'
    ? base.respostasConfirmadas
    : {}) as Record<string, string>;
  const historico = Array.isArray(base.historico) ? (base.historico as Array<Record<string, unknown>>) : [];
  return { respostasConfirmadas: { ...resp }, historico };
}

/** Aplica confirmações técnicas da OS sobre as respostas do cliente (sem mutar o pedido). */
function mesclarRespostasTecnicas(
  respostasCliente: Record<string, string>,
  dadosTecnicos: unknown
): Record<string, string> {
  const { respostasConfirmadas } = dadosTecnicosObj(dadosTecnicos);
  const merged = { ...respostasCliente };
  for (const [k, v] of Object.entries(respostasConfirmadas)) {
    if (!v) continue;
    merged[k] = v;
    // também atualiza chaves por unidade (campo__u1) quando existirem no cliente
    for (const ck of Object.keys(respostasCliente)) {
      if (ck === k) continue;
      if (ck.startsWith(`${k}__u`)) merged[ck] = v;
    }
  }
  return merged;
}

function recorteRespostasPendencia(
  respostas: Record<string, string>,
  condicoes: Array<{ perguntaId: string }>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of condicoes) {
    const id = c.perguntaId;
    if (respostas[id] != null) out[id] = respostas[id];
    for (const [k, v] of Object.entries(respostas)) {
      if (k.startsWith(`${id}__u`)) out[k] = v;
    }
  }
  return out;
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
    tipo?: string;
    ativo?: boolean;
    ordem?: number;
    perguntaFornecimentoId?: string | null;
    opcoesAbsFornece?: string[];
    pendenciaTitulo?: string | null;
    pendenciaMensagem?: string | null;
    pendenciaBloquearMateriais?: boolean;
    perguntaResolucaoId?: string | null;
    opcoesResolucao?: OpcaoResolucao[];
    condicoes?: Array<{ perguntaId: string; opcaoIds: string[] }>;
  }) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id: data.catalogoServicoId } });
    if (!servico) throw new Error('Serviço do catálogo não encontrado');
    if (!data.nome?.trim()) throw new Error('Informe o nome da receita');
    const tipo = (data.tipo || 'materiais') as string;
    if (!TIPOS_RECEITA.includes(tipo as TipoReceita)) throw new Error('Tipo de receita inválido');
    if (tipo === 'pendencia_tecnica' && !data.pendenciaTitulo?.trim()) {
      throw new Error('Informe o título da pendência técnica');
    }

    return prisma.receitaTecnica.create({
      data: {
        catalogoServicoId: data.catalogoServicoId,
        nome: data.nome.trim(),
        tipo,
        ativo: data.ativo !== false,
        ordem: data.ordem ?? 0,
        perguntaFornecimentoId: data.perguntaFornecimentoId || null,
        opcoesAbsFornece: (data.opcoesAbsFornece || []) as Prisma.InputJsonValue,
        pendenciaTitulo: data.pendenciaTitulo?.trim() || null,
        pendenciaMensagem: data.pendenciaMensagem?.trim() || null,
        pendenciaBloquearMateriais: data.pendenciaBloquearMateriais !== false,
        perguntaResolucaoId: data.perguntaResolucaoId || null,
        opcoesResolucao: (data.opcoesResolucao || []) as Prisma.InputJsonValue,
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
      tipo: string;
      ativo: boolean;
      ordem: number;
      perguntaFornecimentoId: string | null;
      opcoesAbsFornece: string[];
      pendenciaTitulo: string | null;
      pendenciaMensagem: string | null;
      pendenciaBloquearMateriais: boolean;
      perguntaResolucaoId: string | null;
      opcoesResolucao: OpcaoResolucao[];
      condicoes: Array<{ perguntaId: string; opcaoIds: string[] }>;
    }>
  ) {
    await this.buscar(id);
    if (data.tipo && !TIPOS_RECEITA.includes(data.tipo as TipoReceita)) {
      throw new Error('Tipo de receita inválido');
    }
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
        ...(data.tipo != null ? { tipo: data.tipo } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
        ...(data.perguntaFornecimentoId !== undefined
          ? { perguntaFornecimentoId: data.perguntaFornecimentoId }
          : {}),
        ...(data.opcoesAbsFornece !== undefined
          ? { opcoesAbsFornece: data.opcoesAbsFornece as Prisma.InputJsonValue }
          : {}),
        ...(data.pendenciaTitulo !== undefined
          ? { pendenciaTitulo: data.pendenciaTitulo?.trim() || null }
          : {}),
        ...(data.pendenciaMensagem !== undefined
          ? { pendenciaMensagem: data.pendenciaMensagem?.trim() || null }
          : {}),
        ...(data.pendenciaBloquearMateriais !== undefined
          ? { pendenciaBloquearMateriais: data.pendenciaBloquearMateriais }
          : {}),
        ...(data.perguntaResolucaoId !== undefined
          ? { perguntaResolucaoId: data.perguntaResolucaoId }
          : {}),
        ...(data.opcoesResolucao !== undefined
          ? { opcoesResolucao: data.opcoesResolucao as Prisma.InputJsonValue }
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
        tipo: orig.tipo,
        ativo: false,
        ordem: orig.ordem + 1,
        perguntaFornecimentoId: orig.perguntaFornecimentoId,
        opcoesAbsFornece: orig.opcoesAbsFornece as Prisma.InputJsonValue,
        pendenciaTitulo: orig.pendenciaTitulo,
        pendenciaMensagem: orig.pendenciaMensagem,
        pendenciaBloquearMateriais: orig.pendenciaBloquearMateriais,
        perguntaResolucaoId: orig.perguntaResolucaoId,
        opcoesResolucao: orig.opcoesResolucao as Prisma.InputJsonValue,
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
   * Também cria pendências técnicas aplicáveis.
   * Idempotente: se já houver snapshot e linhas automáticas, não regenera (salvo force).
   */
  async gerarMateriaisParaOs(ordemServicoId: string, opts?: { force?: boolean }) {
    const os = await prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        materiais: true,
        pendenciasTecnicas: true,
        pedido: {
          include: {
            solicitacao: { include: { servico: true } },
          },
        },
      },
    });
    if (!os) throw new Error('OS não encontrada');
    if (os.materiaisSnapshot && !opts?.force && os.materiais.some((m) => m.origem === 'automatico')) {
      return this.buscarOsComMateriais(ordemServicoId);
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

    const extraido = extrairRespostasDoPedido(sol);
    const respostasCliente = extraido.respostas;
    const quantidadeUnidades = extraido.quantidadeUnidades;
    const respostas = mesclarRespostasTecnicas(respostasCliente, os.dadosTecnicos);

    const receitas = await prisma.receitaTecnica.findMany({
      where: { catalogoServicoId: sol.servicoId, ativo: true },
      include: {
        condicoes: true,
        materiais: { where: { ativo: true }, orderBy: { ordem: 'asc' } },
      },
      orderBy: { ordem: 'asc' },
    });

    const aplicaveis = receitas.filter((r) => receitaBateCondicoes(r.condicoes, respostas));
    const pendenciasReceitas = aplicaveis.filter((r) => r.tipo === 'pendencia_tecnica');
    const materiaisReceitas = aplicaveis.filter((r) => r.tipo !== 'pendencia_tecnica');

    // Cria/atualiza pendências (não recria se já resolvida para a mesma receita)
    for (const receita of pendenciasReceitas) {
      const existente = os.pendenciasTecnicas.find((p) => p.receitaId === receita.id);
      if (existente?.status === 'resolvida') continue;
      const titulo = receita.pendenciaTitulo?.trim() || receita.nome;
      const mensagem =
        receita.pendenciaMensagem?.trim() ||
        'Confirmação técnica necessária antes de seguir com materiais.';
      const payload = {
        titulo,
        mensagem,
        bloquearMateriais: receita.pendenciaBloquearMateriais !== false,
        respostaOriginalCliente: recorteRespostasPendencia(
          respostasCliente,
          receita.condicoes
        ) as Prisma.InputJsonValue,
        perguntaResolucaoId: receita.perguntaResolucaoId || null,
        opcoesResolucao: (asOpcoesResolucao(receita.opcoesResolucao) ||
          []) as Prisma.InputJsonValue,
        status: 'pendente' as const,
      };
      if (existente) {
        await prisma.osPendenciaTecnica.update({
          where: { id: existente.id },
          data: payload,
        });
      } else {
        await prisma.osPendenciaTecnica.create({
          data: {
            ordemServicoId,
            receitaId: receita.id,
            ...payload,
          },
        });
      }
    }

    const pendentes = await prisma.osPendenciaTecnica.findMany({
      where: { ordemServicoId, status: 'pendente' },
    });
    const bloqueiaMateriais = pendentes.some((p) => p.bloquearMateriais);
    const avisos: string[] = [];
    if (bloqueiaMateriais) {
      avisos.push(
        'Aguardando confirmação técnica — compra/separação de materiais bloqueada até resolver as pendências.'
      );
    }

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

    if (!bloqueiaMateriais) {
      for (const receita of materiaisReceitas) {
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
    }

    const custoPrevistoTotal = linhas.reduce((s, l) => s + (l.custoPrevisto || 0), 0);

    const snapshot = {
      geradoEm: new Date().toISOString(),
      catalogoServicoId: sol.servicoId,
      servicoSlug: sol.servico?.slug,
      servicoNome: sol.servico?.nome,
      respostasCliente,
      respostasEfetivas: respostas,
      quantidadeUnidades,
      aguardandoConfirmacaoTecnica: bloqueiaMateriais,
      pendenciasAbertas: pendentes.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        bloquearMateriais: p.bloquearMateriais,
      })),
      receitasAplicadas: aplicaveis.map((r) => ({
        id: r.id,
        nome: r.nome,
        tipo: r.tipo,
        condicoes: r.condicoes.map((c) => ({
          perguntaId: c.perguntaId,
          opcaoIds: asStringArray(c.opcaoIds),
        })),
      })),
      avisos,
      materialClienteFornece: materiaisReceitas.some(
        (r) => absForneceMaterial(r, respostas) === false
      ),
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
        pendenciasTecnicas: { orderBy: { createdAt: 'asc' } },
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
    const pendentes = os.pendenciasTecnicas.filter((p) => p.status === 'pendente');
    const bloqueiaMateriais = pendentes.some((p) => p.bloquearMateriais);
    return {
      materiais: ativos,
      snapshot: os.materiaisSnapshot,
      ajusteManual: os.materiaisAjusteManual,
      custoPrevistoTotal: Math.round(custoPrevistoTotal * 100) / 100,
      dadosTecnicos: os.dadosTecnicos,
      pendencias: os.pendenciasTecnicas,
      aguardandoConfirmacaoTecnica: bloqueiaMateriais,
      statusMateriais: bloqueiaMateriais
        ? 'Aguardando confirmação técnica'
        : ativos.length
          ? 'Materiais gerados'
          : 'Sem materiais',
    };
  }

  /**
   * Admin resolve pendência: grava confirmação técnica na OS (sem alterar pedido/cliente)
   * e regenera materiais com as respostas efetivas.
   */
  async resolverPendenciaOs(
    pendenciaId: string,
    data: { opcaoId: string; userId?: string | null }
  ) {
    const pendencia = await prisma.osPendenciaTecnica.findUnique({
      where: { id: pendenciaId },
      include: { ordemServico: true },
    });
    if (!pendencia) throw new Error('Pendência não encontrada');
    if (pendencia.status === 'resolvida') throw new Error('Pendência já resolvida');

    const opcoes = asOpcoesResolucao(pendencia.opcoesResolucao);
    const escolhida = opcoes.find((o) => o.id === data.opcaoId);
    if (!escolhida) throw new Error('Opção de resolução inválida');

    const perguntaId = pendencia.perguntaResolucaoId;
    if (!perguntaId) throw new Error('Receita sem pergunta de resolução configurada');

    const atual = dadosTecnicosObj(pendencia.ordemServico.dadosTecnicos);
    atual.respostasConfirmadas[perguntaId] = escolhida.id;
    atual.historico.push({
      pendenciaId: pendencia.id,
      perguntaId,
      opcaoId: escolhida.id,
      opcaoLabel: escolhida.label,
      respostaOriginalCliente: pendencia.respostaOriginalCliente,
      resolvidoEm: new Date().toISOString(),
      resolvidoPorUserId: data.userId || null,
    });

    await prisma.$transaction(async (tx) => {
      await tx.osPendenciaTecnica.update({
        where: { id: pendencia.id },
        data: {
          status: 'resolvida',
          resolucaoOpcaoId: escolhida.id,
          resolucaoOpcaoLabel: escolhida.label,
          resolvidoEm: new Date(),
          resolvidoPorUserId: data.userId || null,
        },
      });
      await tx.ordemServico.update({
        where: { id: pendencia.ordemServicoId },
        data: { dadosTecnicos: atual as Prisma.InputJsonValue },
      });
    });

    await this.gerarMateriaisParaOs(pendencia.ordemServicoId, { force: true });
    return this.listarMateriaisOs(pendencia.ordemServicoId);
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
