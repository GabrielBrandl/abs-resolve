import { Prisma } from '@prisma/client';
import {
  FLUXOS_SERVICO,
  getFluxo,
  SLUGS_FLUXO_SERVICO,
  type FluxoServico,
  type RegraValidacaoFluxo,
} from '../config/fluxo-servicos.js';
import { prisma } from '../utils/prisma.js';

export interface FluxoPerguntaOpcaoConfig {
  id: string;
  label: string;
  precoAdicional?: number;
}

export interface FluxoPerguntaConfig {
  id: string;
  titulo: string;
  opcoes: FluxoPerguntaOpcaoConfig[];
  showIf?: { perguntaId: string; opcaoIds: string[] };
}

export interface ItemPrecoConfig {
  id: string;
  label: string;
  valor: number;
  when?: Record<string, string[]>;
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
}

export interface PrecoConfigCache {
  modoPreco: string;
  precoBase: number | null;
  itensPreco: ItemPrecoConfig[];
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
    if (!p.opcoes?.length) throw new Error(`Pergunta "${p.titulo}" precisa de opções`);
    const opIds = new Set<string>();
    for (const op of p.opcoes) {
      if (!op.id?.trim() || !op.label?.trim()) {
        throw new Error(`Opção inválida na pergunta "${p.titulo}"`);
      }
      if (opIds.has(op.id)) throw new Error(`Opção duplicada (${op.id}) em "${p.titulo}"`);
      opIds.add(op.id);
    }
    if (p.showIf && !perguntas.some((q) => q.id === p.showIf!.perguntaId)) {
      throw new Error(`Condição showIf inválida na pergunta "${p.titulo}"`);
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
      await prisma.fluxoServicoConfig.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          perguntas: toJson(fluxo.perguntas),
          fotosObrigatorias: fluxo.fotosObrigatorias,
          regrasValidacao: toJson(fluxo.regrasValidacao),
          modoPreco: 'padrao',
          itensPreco: [],
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
      precoCache.set(row.slug, {
        modoPreco: row.modoPreco,
        precoBase: row.precoBase != null ? Number(row.precoBase) : null,
        itensPreco: fromJson<ItemPrecoConfig[]>(row.itensPreco) ?? [],
      });
    }
  }

  async listar(): Promise<Array<{ slug: string; nome: string; totalPerguntas: number; modoPreco: string }>> {
    await this.ensureSeeded();
    const rows = await prisma.fluxoServicoConfig.findMany({ orderBy: { slug: 'asc' } });
    return rows.map((row) => {
      const padrao = getFluxo(row.slug);
      const perguntas = fromJson<FluxoPerguntaConfig[]>(row.perguntas);
      return {
        slug: row.slug,
        nome: padrao?.nome ?? row.slug,
        totalPerguntas: perguntas.length,
        modoPreco: row.modoPreco,
      };
    });
  }

  async obter(slug: string): Promise<FluxoConfigAdmin> {
    await this.ensureSeeded();
    const row = await prisma.fluxoServicoConfig.findUnique({ where: { slug } });
    if (!row) throw new Error('Questionário não encontrado');
    const padrao = getFluxo(slug);
    return {
      slug: row.slug,
      nome: padrao?.nome ?? row.slug,
      perguntas: fromJson<FluxoPerguntaConfig[]>(row.perguntas),
      fotosObrigatorias: fromJson<string[]>(row.fotosObrigatorias),
      regrasValidacao: fromJson<RegraValidacaoFluxo[]>(row.regrasValidacao),
      modoPreco: row.modoPreco === 'personalizado' ? 'personalizado' : 'padrao',
      precoBase: row.precoBase != null ? Number(row.precoBase) : null,
      itensPreco: fromJson<ItemPrecoConfig[]>(row.itensPreco),
    };
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
    }
  ) {
    if (!getFluxo(slug)) throw new Error('Serviço sem questionário padrão');
    validarPerguntas(data.perguntas);

    const row = await prisma.fluxoServicoConfig.upsert({
      where: { slug },
      update: {
        perguntas: toJson(data.perguntas),
        fotosObrigatorias: data.fotosObrigatorias,
        regrasValidacao: toJson(data.regrasValidacao),
        ...(data.modoPreco !== undefined && { modoPreco: data.modoPreco }),
        ...(data.precoBase !== undefined && { precoBase: data.precoBase }),
        ...(data.itensPreco !== undefined && { itensPreco: toJson(data.itensPreco) }),
      },
      create: {
        slug,
        perguntas: toJson(data.perguntas),
        fotosObrigatorias: data.fotosObrigatorias,
        regrasValidacao: toJson(data.regrasValidacao),
        modoPreco: data.modoPreco ?? 'padrao',
        precoBase: data.precoBase ?? null,
        itensPreco: toJson(data.itensPreco ?? []),
      },
    });

    await this.reloadCache();
    return this.obterFromRow(row);
  }

  async restaurarPadrao(slug: string) {
    const fluxo = getFluxo(slug);
    if (!fluxo) throw new Error('Serviço sem questionário padrão');

    const row = await prisma.fluxoServicoConfig.upsert({
      where: { slug },
      update: {
        perguntas: toJson(fluxo.perguntas),
        fotosObrigatorias: fluxo.fotosObrigatorias,
        regrasValidacao: toJson(fluxo.regrasValidacao),
        modoPreco: 'padrao',
        precoBase: null,
        itensPreco: [],
      },
      create: {
        slug,
        perguntas: toJson(fluxo.perguntas),
        fotosObrigatorias: fluxo.fotosObrigatorias,
        regrasValidacao: toJson(fluxo.regrasValidacao),
        modoPreco: 'padrao',
        itensPreco: [],
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
  }): FluxoConfigAdmin {
    const padrao = getFluxo(row.slug);
    return {
      slug: row.slug,
      nome: padrao?.nome ?? row.slug,
      perguntas: fromJson<FluxoPerguntaConfig[]>(row.perguntas),
      fotosObrigatorias: fromJson<string[]>(row.fotosObrigatorias),
      regrasValidacao: fromJson<RegraValidacaoFluxo[]>(row.regrasValidacao),
      modoPreco: row.modoPreco === 'personalizado' ? 'personalizado' : 'padrao',
      precoBase: row.precoBase != null ? Number(row.precoBase) : null,
      itensPreco: fromJson<ItemPrecoConfig[]>(row.itensPreco) ?? [],
    };
  }
}

export const fluxoConfigService = new FluxoConfigService();
