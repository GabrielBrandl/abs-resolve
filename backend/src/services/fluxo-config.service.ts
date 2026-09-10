import { Prisma } from '@prisma/client';
import {
  FLUXOS_SERVICO,
  getFluxo,
  SLUGS_FLUXO_SERVICO,
  type FluxoServico,
  type FluxoPerguntaShowIf,
  type RegraValidacaoFluxo,
} from '../config/fluxo-servicos.js';
import {
  defaultPrecoCompostoArSplit,
  normalizarPrecoComposto,
  precoCompostoEfetivo,
  PRECO_COMPOSTO_VAZIO,
  type PrecoCompostoConfig,
} from '../config/preco-composto.js';
import { prisma } from '../utils/prisma.js';
import { storageService } from './storage.service.js';
import path from 'path';
import { randomUUID } from 'crypto';
import { precoMinimoVitrineDeFluxo, textoPrecoAPartirDe } from '../utils/preco-vitrine.js';
import { normalizarShowIf } from '../utils/show-if.js';

export type { PrecoCompostoConfig, FaixaPrecoComposto } from '../config/preco-composto.js';

export interface FluxoPerguntaOpcaoConfig {
  id: string;
  label: string;
  precoAdicional?: number;
  modoCobranca?: 'fixo' | 'por_unidade';
  /** Só cobra o adicional se as respostas baterem (ex.: ABS fornece material) */
  when?: Record<string, string[]>;
  imagemUrl?: string;
  usarComoImagemPrincipal?: boolean;
}

export interface FluxoPerguntaConfig {
  id: string;
  titulo: string;
  opcoes: FluxoPerguntaOpcaoConfig[];
  showIf?: FluxoPerguntaShowIf;
  papel?: 'quantidade' | 'numero' | 'normal';
  numeroMin?: number;
  numeroMax?: number;
  numeroPasso?: number;
  numeroUnidade?: string;
  /** Preço total da mão de obra por qtd (substitui preço-base quando preenchido) */
  precosPorQuantidade?: Record<string, number>;
  /** Repete a pergunta para cada unidade (respostas id__uN) */
  replicarPorUnidade?: boolean;
}

export interface ItemPrecoConfig {
  id: string;
  label: string;
  valor: number;
  when?: Record<string, string[]>;
  modoCobranca?: 'fixo' | 'por_unidade';
}

export interface FluxoConfigAdmin {
  slug: string;
  nome: string;
  perguntas: FluxoPerguntaConfig[];
  fotosObrigatorias: string[];
  regrasValidacao: RegraValidacaoFluxo[];
  modoPreco: 'padrao' | 'personalizado';
  precoBase: number | null;
  itensPreco: ItemPrecoConfig[];
  precoComposto: PrecoCompostoConfig;
  perguntaQuantidadeId: string | null;
  multiplicarBasePorQuantidade: boolean;
}

export interface PrecoConfigCache {
  modoPreco: string;
  precoBase: number | null;
  itensPreco: ItemPrecoConfig[];
  precoComposto: PrecoCompostoConfig;
  perguntaQuantidadeId: string | null;
  multiplicarBasePorQuantidade: boolean;
}

const fluxoCache = new Map<string, FluxoServico>();
const precoCache = new Map<string, PrecoConfigCache>();

function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function fromJson<T>(value: unknown): T {
  return value as T;
}

function rowToFluxo(slug: string, row: {
  perguntas: unknown;
  fotosObrigatorias: unknown;
  regrasValidacao: unknown;
}): FluxoServico {
  const padrao = getFluxo(slug);
  return {
    slug: slug as FluxoServico['slug'],
    nome: padrao?.nome ?? slug,
    perguntas: fromJson<FluxoServico['perguntas']>(row.perguntas),
    fotosObrigatorias: fromJson<string[]>(row.fotosObrigatorias),
    regrasValidacao: fromJson<RegraValidacaoFluxo[]>(row.regrasValidacao),
  };
}

function compostoDoRow(slug: string, row: { precoComposto?: unknown; perguntas: unknown }): PrecoCompostoConfig {
  const perguntas = fromJson<FluxoPerguntaConfig[]>(row.perguntas) || [];
  return precoCompostoEfetivo(slug, row.precoComposto, perguntas);
}

function sanearItensPreco(
  itens: ItemPrecoConfig[] | null | undefined,
  perguntas: FluxoPerguntaConfig[]
): ItemPrecoConfig[] {
  const ids = new Set(perguntas.map((p) => p.id));
  return (itens || []).filter((item) => {
    if (!item.when || !Object.keys(item.when).length) return true;
    return Object.keys(item.when).every((k) => ids.has(k));
  });
}

function resolverQtdId(
  perguntas: FluxoPerguntaConfig[],
  configurada?: string | null
): string | null {
  if (configurada && perguntas.some((p) => p.id === configurada)) return configurada;
  const porPapel = perguntas.find((p) => p.papel === 'quantidade');
  if (porPapel) return porPapel.id;
  const porId = perguntas.find((p) => p.id === 'quantidade');
  return porId?.id ?? null;
}

function precoCacheDoRow(row: {
  slug: string;
  modoPreco: string;
  precoBase: { toString(): string } | number | null;
  itensPreco: unknown;
  precoComposto?: unknown;
  perguntas: unknown;
  perguntaQuantidadeId: string | null;
  multiplicarBasePorQuantidade: boolean;
}): PrecoConfigCache {
  const perguntas = fromJson<FluxoPerguntaConfig[]>(row.perguntas) || [];
  const itens = sanearItensPreco(fromJson<ItemPrecoConfig[]>(row.itensPreco) ?? [], perguntas);
  return {
    modoPreco: row.modoPreco,
    precoBase: row.precoBase != null ? Number(row.precoBase) : null,
    itensPreco: itens,
    precoComposto: compostoDoRow(row.slug, row),
    perguntaQuantidadeId: resolverQtdId(perguntas, row.perguntaQuantidadeId),
    multiplicarBasePorQuantidade: row.multiplicarBasePorQuantidade,
  };
}

function validarPerguntas(perguntas: FluxoPerguntaConfig[]) {
  if (!Array.isArray(perguntas) || perguntas.length === 0) {
    throw new Error('Informe ao menos uma pergunta');
  }
  const ids = new Set<string>();
  for (const p of perguntas) {
    if (!p.id?.trim() || !p.titulo?.trim()) {
      throw new Error('Cada pergunta precisa de id e título');
    }
    if (ids.has(p.id)) throw new Error(`Pergunta duplicada: ${p.id}`);
    ids.add(p.id);
    const papel = p.papel || 'normal';
    if (papel !== 'numero' && papel !== 'quantidade') {
      if (!p.opcoes?.length) throw new Error(`Pergunta "${p.titulo}" precisa de opções`);
      const opIds = new Set<string>();
      for (const op of p.opcoes) {
        if (!op.id?.trim() || !op.label?.trim()) {
          throw new Error(`Opção inválida na pergunta "${p.titulo}"`);
        }
        if (opIds.has(op.id)) throw new Error(`Opção duplicada (${op.id}) em "${p.titulo}"`);
        opIds.add(op.id);
      }
    }
  }
  for (const p of perguntas) {
    for (const cond of normalizarShowIf(p.showIf)) {
      if (!perguntas.some((q) => q.id === cond.perguntaId)) {
        throw new Error(
          `Condição de exibição inválida na pergunta "${p.titulo}" (ref: ${cond.perguntaId})`
        );
      }
    }
  }
}

export class FluxoConfigService {
  getFluxoEfetivo(slug: string): FluxoServico | undefined {
    return fluxoCache.get(slug) ?? getFluxo(slug);
  }

  getPrecoConfig(slug: string): PrecoConfigCache | undefined {
    return precoCache.get(slug);
  }

  /**
   * Recarrega um slug do banco para o cache em memória.
   * Evita preço antigo na loja quando outro worker salvou no admin, ou se o cache
   * ficou desatualizado após falha de init.
   */
  async refreshSlug(slug: string): Promise<void> {
    const row = await prisma.fluxoServicoConfig.findUnique({ where: { slug } });
    if (!row) {
      fluxoCache.delete(slug);
      precoCache.delete(slug);
      return;
    }
    fluxoCache.set(row.slug, rowToFluxo(row.slug, row));
    precoCache.set(row.slug, precoCacheDoRow(row));
  }

  async initCache() {
    try {
      await this.seedDefaults();
      await this.reloadCache();
    } catch (err) {
      console.warn('Fluxo config: cache não inicializado —', err instanceof Error ? err.message : err);
    }
  }

  async seedDefaults() {
    for (const slug of SLUGS_FLUXO_SERVICO) {
      const fluxo = FLUXOS_SERVICO[slug];
      const precoComposto =
        slug === 'instalacao-ar-split' ? defaultPrecoCompostoArSplit() : PRECO_COMPOSTO_VAZIO;
      await prisma.fluxoServicoConfig.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          perguntas: toJson(fluxo.perguntas),
          fotosObrigatorias: fluxo.fotosObrigatorias,
          regrasValidacao: toJson(fluxo.regrasValidacao),
          modoPreco: slug === 'instalacao-ar-split' ? 'personalizado' : 'padrao',
          precoBase: slug === 'instalacao-ar-split' ? 699 : null,
          multiplicarBasePorQuantidade: slug !== 'instalacao-ar-split',
          itensPreco:
            slug === 'instalacao-ar-split'
              ? toJson([
                  {
                    id: 'ponto-eletrico',
                    label: 'Instalação de ponto elétrico exclusivo',
                    valor: 250,
                    when: { pontoEletricoExclusivo: ['nao'] },
                    modoCobranca: 'fixo',
                  },
                  {
                    id: 'suporte-parede',
                    label: 'Suporte de parede para condensadora',
                    valor: 80,
                    when: { localCondensadora: ['suporte-parede'] },
                    modoCobranca: 'por_unidade',
                  },
                ])
              : [],
          precoComposto: toJson(precoComposto),
        },
      });
    }
  }

  async reloadCache() {
    fluxoCache.clear();
    precoCache.clear();
    const rows = await prisma.fluxoServicoConfig.findMany();
    for (const row of rows) {
      fluxoCache.set(row.slug, rowToFluxo(row.slug, row));
      precoCache.set(row.slug, precoCacheDoRow(row));
    }
  }

  /** Fluxo mínimo para serviços novos do catálogo (preço fixo, sem questionário). */
  async criarFluxoPrecoFixo(slug: string, precoBase: number | null) {
    await prisma.fluxoServicoConfig.upsert({
      where: { slug },
      update: {
        modoPreco: 'personalizado',
        precoBase,
        perguntas: [],
        fotosObrigatorias: [],
        regrasValidacao: [],
        itensPreco: [],
        precoComposto: toJson(PRECO_COMPOSTO_VAZIO),
      },
      create: {
        slug,
        modoPreco: 'personalizado',
        precoBase,
        perguntas: [],
        fotosObrigatorias: [],
        regrasValidacao: [],
        itensPreco: [],
        precoComposto: toJson(PRECO_COMPOSTO_VAZIO),
      },
    });
    await this.reloadCache();
  }

  async listar(): Promise<Array<{ slug: string; nome: string; totalPerguntas: number; modoPreco: string }>> {
    await this.ensureSeeded();
    const rows = await prisma.fluxoServicoConfig.findMany({ orderBy: { slug: 'asc' } });
    const catalogo = await prisma.catalogoServico.findMany({ select: { slug: true, nome: true } });
    const nomes = Object.fromEntries(catalogo.map((s) => [s.slug, s.nome]));
    return rows.map((row) => {
      const padrao = getFluxo(row.slug);
      const perguntas = fromJson<FluxoPerguntaConfig[]>(row.perguntas);
      return {
        slug: row.slug,
        nome: padrao?.nome ?? nomes[row.slug] ?? row.slug,
        totalPerguntas: perguntas.length,
        modoPreco: row.modoPreco,
      };
    });
  }

  async obter(slug: string): Promise<FluxoConfigAdmin> {
    await this.ensureSeeded();
    const row = await prisma.fluxoServicoConfig.findUnique({ where: { slug } });
    if (!row) throw new Error('Questionário não encontrado');
    return this.obterFromRow(row);
  }

  private async ensureSeeded() {
    const count = await prisma.fluxoServicoConfig.count();
    if (count === 0) await this.seedDefaults();
  }

  async atualizar(
    slug: string,
    data: {
      perguntas: FluxoPerguntaConfig[];
      fotosObrigatorias: string[];
      regrasValidacao: RegraValidacaoFluxo[];
      modoPreco?: 'padrao' | 'personalizado';
      precoBase?: number | null;
      itensPreco?: ItemPrecoConfig[];
      precoComposto?: PrecoCompostoConfig;
      perguntaQuantidadeId?: string | null;
      multiplicarBasePorQuantidade?: boolean;
    }
  ) {
    const existe =
      getFluxo(slug) ||
      (await prisma.catalogoServico.findUnique({ where: { slug }, select: { id: true } }));
    if (!existe) throw new Error('Serviço não encontrado no catálogo');
    validarPerguntas(data.perguntas);

    const itensSaneados =
      data.itensPreco !== undefined ? sanearItensPreco(data.itensPreco, data.perguntas) : undefined;
    const qtdId =
      data.perguntaQuantidadeId !== undefined
        ? resolverQtdId(data.perguntas, data.perguntaQuantidadeId)
        : resolverQtdId(data.perguntas, null);

    // Em perguntas compartilhadas com adicional, default = 1× atendimento (não por unidade)
    const perguntasNorm = data.perguntas.map((p) => {
      if (p.replicarPorUnidade || p.papel === 'quantidade') return p;
      return {
        ...p,
        opcoes: (p.opcoes || []).map((op) => {
          if (!(Number(op.precoAdicional) > 0) || op.modoCobranca) return op;
          return { ...op, modoCobranca: 'fixo' as const };
        }),
      };
    });

    const compostoRaw =
      data.precoComposto !== undefined ? normalizarPrecoComposto(data.precoComposto) : undefined;
    const composto =
      compostoRaw !== undefined
        ? precoCompostoEfetivo(slug, compostoRaw, perguntasNorm)
        : undefined;

    // Auto-persiste vínculos corrigidos (capacidade ≠ quantidade) para a loja nunca divergir do admin
    if (composto?.ativo) {
      const cap = data.perguntas.find((p) => p.id === composto.perguntaCapacidadeId);
      if (!cap || cap.papel === 'quantidade' || !(cap.opcoes?.length)) {
        throw new Error(
          'Preço composto: selecione a pergunta de CAPACIDADE (BTUs), não a de quantidade de aparelhos.'
        );
      }
    }

    const row = await prisma.fluxoServicoConfig.upsert({
      where: { slug },
      update: {
        perguntas: toJson(perguntasNorm),
        fotosObrigatorias: data.fotosObrigatorias,
        regrasValidacao: toJson(data.regrasValidacao),
        ...(data.modoPreco !== undefined && { modoPreco: data.modoPreco }),
        ...(data.precoBase !== undefined && { precoBase: data.precoBase }),
        ...(itensSaneados !== undefined && { itensPreco: toJson(itensSaneados) }),
        ...(composto !== undefined && { precoComposto: toJson(composto) }),
        perguntaQuantidadeId: qtdId,
        ...(data.multiplicarBasePorQuantidade !== undefined && {
          multiplicarBasePorQuantidade: data.multiplicarBasePorQuantidade,
        }),
      },
      create: {
        slug,
        perguntas: toJson(perguntasNorm),
        fotosObrigatorias: data.fotosObrigatorias,
        regrasValidacao: toJson(data.regrasValidacao),
        modoPreco: data.modoPreco ?? 'padrao',
        precoBase: data.precoBase ?? null,
        itensPreco: toJson(itensSaneados ?? []),
        precoComposto: toJson(composto ?? PRECO_COMPOSTO_VAZIO),
        perguntaQuantidadeId: qtdId,
        multiplicarBasePorQuantidade: data.multiplicarBasePorQuantidade ?? true,
      },
    });

    await this.reloadCache();
    await this.sincronizarPrecoVitrineCatalogo(
      slug,
      perguntasNorm,
      data.precoBase !== undefined
        ? data.precoBase
        : row.precoBase != null
          ? Number(row.precoBase)
          : null
    );
    return this.obterFromRow(row);
  }

  /** Atualiza “A partir de” no card do catálogo com base no questionário (faixas / precoBase). */
  private async sincronizarPrecoVitrineCatalogo(
    slug: string,
    perguntas: FluxoPerguntaConfig[],
    precoBase?: number | null
  ) {
    const vitrine = precoMinimoVitrineDeFluxo({ perguntas, precoBase });
    if (vitrine == null || vitrine <= 0) return;
    try {
      await prisma.catalogoServico.updateMany({
        where: { slug },
        data: {
          precoMinimo: vitrine,
          precoTexto: textoPrecoAPartirDe(vitrine),
          tipoPreco: 'a_partir',
        },
      });
    } catch (err) {
      console.warn(
        '[fluxo] não foi possível sincronizar preço de vitrine:',
        err instanceof Error ? err.message : err
      );
    }
  }

  async restaurarPadrao(slug: string) {
    const fluxo = getFluxo(slug);
    if (!fluxo) throw new Error('Serviço sem questionário padrão');

    const composto = slug === 'instalacao-ar-split' ? defaultPrecoCompostoArSplit() : PRECO_COMPOSTO_VAZIO;
    const row = await prisma.fluxoServicoConfig.upsert({
      where: { slug },
      update: {
        perguntas: toJson(fluxo.perguntas),
        fotosObrigatorias: fluxo.fotosObrigatorias,
        regrasValidacao: toJson(fluxo.regrasValidacao),
        modoPreco: slug === 'instalacao-ar-split' ? 'personalizado' : 'padrao',
        precoBase: slug === 'instalacao-ar-split' ? 699 : null,
        multiplicarBasePorQuantidade: slug !== 'instalacao-ar-split',
        itensPreco:
          slug === 'instalacao-ar-split'
            ? toJson([
                {
                  id: 'ponto-eletrico',
                  label: 'Instalação de ponto elétrico exclusivo',
                  valor: 250,
                  when: { pontoEletricoExclusivo: ['nao'] },
                  modoCobranca: 'fixo',
                },
                {
                  id: 'suporte-parede',
                  label: 'Suporte de parede para condensadora',
                  valor: 80,
                  when: { localCondensadora: ['suporte-parede'] },
                  modoCobranca: 'por_unidade',
                },
              ])
            : [],
        precoComposto: toJson(composto),
        perguntaQuantidadeId: 'quantidade',
      },
      create: {
        slug,
        perguntas: toJson(fluxo.perguntas),
        fotosObrigatorias: fluxo.fotosObrigatorias,
        regrasValidacao: toJson(fluxo.regrasValidacao),
        modoPreco: slug === 'instalacao-ar-split' ? 'personalizado' : 'padrao',
        precoBase: slug === 'instalacao-ar-split' ? 699 : null,
        multiplicarBasePorQuantidade: slug !== 'instalacao-ar-split',
        itensPreco: [],
        precoComposto: toJson(composto),
        perguntaQuantidadeId: 'quantidade',
      },
    });

    await this.reloadCache();
    return this.obterFromRow(row);
  }

  private obterFromRow(row: {
    slug: string;
    perguntas: unknown;
    fotosObrigatorias: unknown;
    regrasValidacao: unknown;
    modoPreco: string;
    precoBase: Prisma.Decimal | null;
    itensPreco: unknown;
    precoComposto?: unknown;
    perguntaQuantidadeId: string | null;
    multiplicarBasePorQuantidade: boolean;
  }): FluxoConfigAdmin {
    const padrao = getFluxo(row.slug);
    const perguntas = fromJson<FluxoPerguntaConfig[]>(row.perguntas);
    const preco = precoCacheDoRow(row);
    return {
      slug: row.slug,
      nome: padrao?.nome ?? row.slug,
      perguntas,
      fotosObrigatorias: fromJson<string[]>(row.fotosObrigatorias),
      regrasValidacao: fromJson<RegraValidacaoFluxo[]>(row.regrasValidacao),
      modoPreco: row.modoPreco === 'personalizado' ? 'personalizado' : 'padrao',
      precoBase: preco.precoBase,
      itensPreco: preco.itensPreco,
      precoComposto: preco.precoComposto,
      perguntaQuantidadeId: preco.perguntaQuantidadeId,
      multiplicarBasePorQuantidade: row.multiplicarBasePorQuantidade,
    };
  }

  /**
   * Upload de imagem de opção do questionário (Supabase/local).
   * Path inclui slug + perguntaId + opcaoId para vínculo estável pelo ID.
   * Não altera preço — só retorna a URL para o admin gravar na opção.
   */
  async uploadImagemOpcao(
    slug: string,
    perguntaId: string,
    opcaoId: string,
    file: Express.Multer.File
  ): Promise<{ url: string }> {
    const pid = String(perguntaId || '').trim();
    const oid = String(opcaoId || '').trim();
    if (!pid || !oid) throw new Error('Informe perguntaId e opcaoId');
    const ext = path.extname(file.originalname || '') || '.webp';
    const safeName = `${oid}-${randomUUID()}${ext}`;
    const folder = `fluxo-opcoes/${slug}/${pid}`;
    const renamed = {
      ...file,
      originalname: safeName,
    } as Express.Multer.File;
    const { url } = await storageService.upload(folder, renamed);
    return { url };
  }
}

export const fluxoConfigService = new FluxoConfigService();
