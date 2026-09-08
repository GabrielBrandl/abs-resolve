/** Preço dependente de respostas (ex.: BTUs × metragem × quem fornece). Configurável no admin. */

export interface FaixaPrecoComposto {
  /** ID da opção da pergunta de capacidade (ex.: ate-12000) */
  opcaoId: string;
  label?: string;
  /** Ajuste de mão de obra por capacidade (somado ao preço-base) */
  ajusteCapacidade?: number;
  /** Valor do kit/material inicial ABS para esta capacidade */
  valorKitInicial?: number;
  /** Metros de material inclusos no kit ABS desta faixa */
  metrosInclusos: number;
  /** R$ por metro adicional além dos inclusos no kit */
  precoPorMetroExtra: number;
}

export interface PrecoCompostoConfig {
  /** Só aplica quando true — outros serviços ficam intactos */
  ativo: boolean;
  perguntaCapacidadeId: string;
  perguntaMetrosId: string;
  /**
   * Pergunta “quem fornece o material?”.
   * Se vazia, o material continua sendo cobrado (compatível com configs antigas).
   */
  perguntaFornecimentoId?: string;
  /** Opções em que a ABS fornece o material (ex.: abs-fornece-kit) */
  opcoesAbsFornece?: string[];
  /**
   * Mapa opção → metros (quando a metragem é categórica).
   * Ex.: { "ate-3m": 3, "3m-5m": 5 }
   */
  mapaMetrosOpcao?: Record<string, number>;
  /** Se true, lê a resposta de metros como número livre */
  metrosNumericos?: boolean;
  metrosInclusosPadrao?: number;
  labelMaoDeObra?: string;
  labelAjusteCapacidade?: string;
  labelKitInicial?: string;
  labelMaterialIncluso?: string;
  labelMetrosExtras?: string;
  labelClienteFornece?: string;
  faixas: FaixaPrecoComposto[];
}

export const PRECO_COMPOSTO_VAZIO: PrecoCompostoConfig = {
  ativo: false,
  perguntaCapacidadeId: '',
  perguntaMetrosId: '',
  faixas: [],
};

/** Default para instalação de ar split — editável no painel. */
export function defaultPrecoCompostoArSplit(): PrecoCompostoConfig {
  return {
    ativo: true,
    perguntaCapacidadeId: 'capacidadeBtu',
    perguntaMetrosId: 'distanciaEvapCond',
    perguntaFornecimentoId: 'materiaisInstalacaoAr',
    opcoesAbsFornece: ['abs-fornece-kit'],
    metrosNumericos: true,
    mapaMetrosOpcao: {},
    metrosInclusosPadrao: 2,
    labelMaoDeObra: 'Mão de obra — instalação split',
    labelAjusteCapacidade: 'Ajuste por capacidade',
    labelKitInicial: 'Kit/material inicial ABS',
    labelMaterialIncluso: 'Metros inclusos no kit de material',
    labelMetrosExtras: 'Metros adicionais de material',
    labelClienteFornece: 'Material do cliente (sem cobrança de kit/metros)',
    faixas: [
      {
        opcaoId: 'ate-12000',
        label: 'Até 12.000 BTUs',
        ajusteCapacidade: 0,
        valorKitInicial: 200,
        metrosInclusos: 2,
        precoPorMetroExtra: 55,
      },
      {
        opcaoId: '12001-18000',
        label: '12.001 a 18.000 BTUs',
        ajusteCapacidade: 100,
        valorKitInicial: 200,
        metrosInclusos: 2,
        precoPorMetroExtra: 70,
      },
      {
        opcaoId: '18001-24000',
        label: '18.001 a 24.000 BTUs',
        ajusteCapacidade: 200,
        valorKitInicial: 250,
        metrosInclusos: 2,
        precoPorMetroExtra: 85,
      },
      {
        opcaoId: 'acima-24000',
        label: 'Acima de 24.000 BTUs',
        ajusteCapacidade: 200,
        valorKitInicial: 250,
        metrosInclusos: 2,
        precoPorMetroExtra: 100,
      },
      {
        opcaoId: 'nao-sei',
        label: 'Não sei a capacidade',
        ajusteCapacidade: 0,
        valorKitInicial: 200,
        metrosInclusos: 2,
        precoPorMetroExtra: 70,
      },
    ],
  };
}

/** Completa configs antigas (sem fornecimento/kit) sem apagar valores já salvos. */
export function enriquecerPrecoComposto(slug: string, raw: unknown): PrecoCompostoConfig {
  const atual = normalizarPrecoComposto(raw);
  if (slug !== 'instalacao-ar-split' || !atual.ativo) return atual;

  const def = defaultPrecoCompostoArSplit();
  const prevFaixas = new Map(atual.faixas.map((f) => [f.opcaoId, f]));
  const faixas =
    atual.faixas.length > 0
      ? atual.faixas.map((f) => ({
          ...f,
          ajusteCapacidade: f.ajusteCapacidade ?? 0,
          valorKitInicial: f.valorKitInicial ?? 0,
          metrosInclusos: f.metrosInclusos > 0 ? f.metrosInclusos : def.metrosInclusosPadrao || 2,
        }))
      : def.faixas.map((f) => prevFaixas.get(f.opcaoId) || f);

  return {
    ...def,
    ...atual,
    perguntaCapacidadeId: atual.perguntaCapacidadeId || def.perguntaCapacidadeId,
    perguntaMetrosId: atual.perguntaMetrosId || def.perguntaMetrosId,
    perguntaFornecimentoId: atual.perguntaFornecimentoId || def.perguntaFornecimentoId,
    opcoesAbsFornece: atual.opcoesAbsFornece?.length ? atual.opcoesAbsFornece : def.opcoesAbsFornece,
    mapaMetrosOpcao: atual.mapaMetrosOpcao && Object.keys(atual.mapaMetrosOpcao).length
      ? atual.mapaMetrosOpcao
      : def.mapaMetrosOpcao,
    metrosInclusosPadrao: atual.metrosInclusosPadrao ?? def.metrosInclusosPadrao,
    labelMaoDeObra: atual.labelMaoDeObra || def.labelMaoDeObra,
    labelAjusteCapacidade: atual.labelAjusteCapacidade || def.labelAjusteCapacidade,
    labelKitInicial: atual.labelKitInicial || def.labelKitInicial,
    labelMaterialIncluso: 'Metros inclusos no kit de material',
    labelMetrosExtras: atual.labelMetrosExtras || def.labelMetrosExtras,
    labelClienteFornece: atual.labelClienteFornece || def.labelClienteFornece,
    faixas,
  };
}

export function normalizarPrecoComposto(raw: unknown): PrecoCompostoConfig {
  if (!raw || typeof raw !== 'object') return { ...PRECO_COMPOSTO_VAZIO };
  const o = raw as Record<string, unknown>;
  const faixasRaw = Array.isArray(o.faixas) ? o.faixas : [];
  const faixas: FaixaPrecoComposto[] = [];
  for (const f of faixasRaw) {
    const row = f as Record<string, unknown>;
    const opcaoId = String(row.opcaoId || '').trim();
    if (!opcaoId) continue;
    faixas.push({
      opcaoId,
      ...(row.label != null ? { label: String(row.label) } : {}),
      ajusteCapacidade: Math.max(0, Number(row.ajusteCapacidade) || 0),
      valorKitInicial: Math.max(0, Number(row.valorKitInicial) || 0),
      metrosInclusos: Math.max(0, Number(row.metrosInclusos) || 0),
      precoPorMetroExtra: Math.max(0, Number(row.precoPorMetroExtra) || 0),
    });
  }

  const mapa =
    o.mapaMetrosOpcao && typeof o.mapaMetrosOpcao === 'object'
      ? Object.fromEntries(
          Object.entries(o.mapaMetrosOpcao as Record<string, unknown>).map(([k, v]) => [
            k,
            Math.max(0, Number(v) || 0),
          ])
        )
      : undefined;

  const opcoesAbs = Array.isArray(o.opcoesAbsFornece)
    ? o.opcoesAbsFornece.map((x) => String(x).trim()).filter(Boolean)
    : undefined;

  return {
    ativo: Boolean(o.ativo),
    perguntaCapacidadeId: String(o.perguntaCapacidadeId || '').trim(),
    perguntaMetrosId: String(o.perguntaMetrosId || '').trim(),
    perguntaFornecimentoId: String(o.perguntaFornecimentoId || '').trim() || undefined,
    opcoesAbsFornece: opcoesAbs?.length ? opcoesAbs : undefined,
    mapaMetrosOpcao: mapa,
    metrosNumericos: Boolean(o.metrosNumericos),
    metrosInclusosPadrao:
      o.metrosInclusosPadrao != null ? Math.max(0, Number(o.metrosInclusosPadrao) || 0) : undefined,
    labelMaoDeObra: o.labelMaoDeObra != null ? String(o.labelMaoDeObra) : undefined,
    labelAjusteCapacidade: o.labelAjusteCapacidade != null ? String(o.labelAjusteCapacidade) : undefined,
    labelKitInicial: o.labelKitInicial != null ? String(o.labelKitInicial) : undefined,
    labelMaterialIncluso: o.labelMaterialIncluso != null ? String(o.labelMaterialIncluso) : undefined,
    labelMetrosExtras: o.labelMetrosExtras != null ? String(o.labelMetrosExtras) : undefined,
    labelClienteFornece: o.labelClienteFornece != null ? String(o.labelClienteFornece) : undefined,
    faixas,
  };
}
