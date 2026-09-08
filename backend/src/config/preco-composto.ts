/** Preço dependente de duas respostas (ex.: BTUs × metragem). Configurável no admin. */

export interface FaixaPrecoComposto {
  /** ID da opção da pergunta de capacidade (ex.: ate-12000) */
  opcaoId: string;
  label?: string;
  /** Metros de material inclusos no preço-base desta faixa */
  metrosInclusos: number;
  /** R$ por metro adicional além dos inclusos */
  precoPorMetroExtra: number;
}

export interface PrecoCompostoConfig {
  /** Só aplica quando true — outros serviços ficam intactos */
  ativo: boolean;
  perguntaCapacidadeId: string;
  perguntaMetrosId: string;
  /**
   * Mapa opção → metros (quando a metragem é categórica).
   * Ex.: { "ate-3m": 3, "3m-5m": 5 }
   */
  mapaMetrosOpcao?: Record<string, number>;
  /** Se true, lê a resposta de metros como número livre */
  metrosNumericos?: boolean;
  metrosInclusosPadrao?: number;
  labelMaoDeObra?: string;
  labelMaterialIncluso?: string;
  labelMetrosExtras?: string;
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
    mapaMetrosOpcao: {
      'ate-3m': 3,
      '3m-5m': 5,
      '5m-7m': 7,
      'acima-7m': 8,
      'nao-sei': 3,
    },
    metrosInclusosPadrao: 3,
    labelMaoDeObra: 'Mão de obra — instalação split',
    labelMaterialIncluso: 'Material incluso (até metros padrão)',
    labelMetrosExtras: 'Metros adicionais de material',
    faixas: [
      { opcaoId: 'ate-12000', label: 'Até 12.000 BTUs', metrosInclusos: 3, precoPorMetroExtra: 55 },
      { opcaoId: '12001-18000', label: '12.001 a 18.000 BTUs', metrosInclusos: 3, precoPorMetroExtra: 70 },
      { opcaoId: '18001-24000', label: '18.001 a 24.000 BTUs', metrosInclusos: 3, precoPorMetroExtra: 85 },
      { opcaoId: 'acima-24000', label: 'Acima de 24.000 BTUs', metrosInclusos: 3, precoPorMetroExtra: 100 },
      { opcaoId: 'nao-sei', label: 'Não sei a capacidade', metrosInclusos: 3, precoPorMetroExtra: 70 },
    ],
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

  return {
    ativo: Boolean(o.ativo),
    perguntaCapacidadeId: String(o.perguntaCapacidadeId || '').trim(),
    perguntaMetrosId: String(o.perguntaMetrosId || '').trim(),
    mapaMetrosOpcao: mapa,
    metrosNumericos: Boolean(o.metrosNumericos),
    metrosInclusosPadrao:
      o.metrosInclusosPadrao != null ? Math.max(0, Number(o.metrosInclusosPadrao) || 0) : undefined,
    labelMaoDeObra: o.labelMaoDeObra != null ? String(o.labelMaoDeObra) : undefined,
    labelMaterialIncluso: o.labelMaterialIncluso != null ? String(o.labelMaterialIncluso) : undefined,
    labelMetrosExtras: o.labelMetrosExtras != null ? String(o.labelMetrosExtras) : undefined,
    faixas,
  };
}
