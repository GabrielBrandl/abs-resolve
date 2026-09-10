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

export const IDS_ABS_FORNECE_CONHECIDOS = [
  'abs-fornece-kit',
  'nao',
  'nao-abs',
  'abs',
  'abs-padrao',
  'abs-premium',
] as const;

export function idsAbsForneceConfigurados(composto: PrecoCompostoConfig): string[] {
  return (composto.opcoesAbsFornece || []).map((x) => String(x).trim()).filter(Boolean);
}

/**
 * Resolve qual pergunta de fornecimento usar e se a resposta atual cobra kit/metros.
 * Usa apenas IDs (opcoesAbsFornece), nunca o texto/label da opção.
 * Evita confundir com outras perguntas sim/não (ex.: aparelho já comprado).
 */
export function resolverCobrancaMaterialAbs(
  composto: PrecoCompostoConfig,
  perguntas: Array<{ id: string; titulo?: string; opcoes: Array<{ id: string }> }>,
  respostas: Record<string, unknown>
): { cobraMaterial: boolean; respondeuFornecimento: boolean; perguntaId?: string; respostaId?: string } {
  const configurados = idsAbsForneceConfigurados(composto);

  const lerResposta = (perguntaId: string): string => {
    const v = respostas[perguntaId];
    if (v == null || v === '') return '';
    if (Array.isArray(v)) return String(v[0] ?? '').trim();
    return String(v).trim();
  };

  const opcaoExiste = (
    p: { opcoes: Array<{ id: string }> },
    id: string
  ) => p.opcoes.some((o) => o.id === id);

  const scorePergunta = (p: { id: string; titulo?: string; opcoes: Array<{ id: string }> }) => {
    let score = 0;
    const key = `${p.id} ${p.titulo || ''}`.toLowerCase();
    if (/material|forne/.test(key)) score += 10;
    if (/aparelho|comprado|equipamento/.test(key) && !/material|forne/.test(key)) score -= 5;
    const hits = configurados.filter((id) => opcaoExiste(p, id)).length;
    score += hits * 3;
    // Pergunta ambígua só com sim/nao: preferir a de material
    const soSimNao =
      p.opcoes.length > 0 && p.opcoes.every((o) => o.id === 'sim' || o.id === 'nao');
    if (soSimNao && /material|forne/.test(key)) score += 5;
    return score;
  };

  const configuradaId = composto.perguntaFornecimentoId?.trim();
  let pergunta =
    (configuradaId && perguntas.find((p) => p.id === configuradaId)) || undefined;

  // Se a pergunta configurada não contém nenhum ID marcado como ABS, tenta achar a certa
  if (pergunta && configurados.length > 0) {
    const temAbs = configurados.some((id) => opcaoExiste(pergunta!, id));
    if (!temAbs) {
      const candidatas = perguntas
        .filter((p) => configurados.some((id) => opcaoExiste(p, id)))
        .sort((a, b) => scorePergunta(b) - scorePergunta(a));
      if (candidatas[0]) pergunta = candidatas[0];
    } else {
      // sim/nao em várias perguntas (aparelho vs material): preferir a de material/fornecimento
      const soSimNao =
        pergunta.opcoes.length > 0 &&
        pergunta.opcoes.every((o) => o.id === 'sim' || o.id === 'nao');
      if (soSimNao || configurados.every((id) => id === 'sim' || id === 'nao' || id === 'nao-abs')) {
        const melhor = [...perguntas]
          .filter((p) => {
            const idsRelevantes =
              configurados.filter((id) => opcaoExiste(p, id)).length > 0 ||
              IDS_ABS_FORNECE_CONHECIDOS.some((id) => opcaoExiste(p, id));
            return idsRelevantes;
          })
          .sort((a, b) => scorePergunta(b) - scorePergunta(a))[0];
        if (melhor && scorePergunta(melhor) > scorePergunta(pergunta)) pergunta = melhor;
      }
    }
  }

  if (!pergunta && configurados.length > 0) {
    pergunta = [...perguntas]
      .filter((p) => configurados.some((id) => opcaoExiste(p, id)))
      .sort((a, b) => scorePergunta(b) - scorePergunta(a))[0];
  }

  // Sem pergunta de fornecimento → cobra material (compat)
  if (!configuradaId && !pergunta) {
    return { cobraMaterial: true, respondeuFornecimento: false };
  }

  if (!pergunta) {
    return { cobraMaterial: false, respondeuFornecimento: false };
  }

  // IDs ABS efetivos: configurados que existem na pergunta; se nenhum, inclui conhecidos presentes
  let idsAbs = configurados.filter((id) => opcaoExiste(pergunta!, id));
  if (configurados.length > 0 && idsAbs.length === 0) {
    idsAbs = IDS_ABS_FORNECE_CONHECIDOS.filter((id) => opcaoExiste(pergunta!, id));
  }
  if (idsAbs.length === 0 && configurados.length === 0) {
    idsAbs = IDS_ABS_FORNECE_CONHECIDOS.filter((id) => opcaoExiste(pergunta!, id));
  }

  const resp = lerResposta(pergunta.id);
  if (!resp) {
    // Fallback: resposta ABS só em pergunta de material/fornecimento (não aparelho sim/não)
    for (const [chave, valor] of Object.entries(respostas)) {
      const id = valor == null ? '' : Array.isArray(valor) ? String(valor[0] ?? '') : String(valor);
      const tid = id.trim();
      const pChave = perguntas.find((p) => p.id === chave);
      if (
        tid &&
        idsAbs.includes(tid) &&
        pChave &&
        opcaoExiste(pChave, tid) &&
        scorePergunta(pChave) >= 10
      ) {
        return {
          cobraMaterial: true,
          respondeuFornecimento: true,
          perguntaId: chave,
          respostaId: tid,
        };
      }
    }
    return { cobraMaterial: false, respondeuFornecimento: false, perguntaId: pergunta.id };
  }

  return {
    cobraMaterial: idsAbs.includes(resp) || (configurados.includes(resp) && opcaoExiste(pergunta, resp)),
    respondeuFornecimento: true,
    perguntaId: pergunta.id,
    respostaId: resp,
  };
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
    opcoesAbsFornece: ['abs-fornece-kit', 'nao'],
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
    opcoesAbsFornece: (() => {
      const base = atual.opcoesAbsFornece?.length
        ? [...atual.opcoesAbsFornece]
        : [...(def.opcoesAbsFornece || [])];
      // Migração: pergunta no formato Sim/Não usa id "nao" para ABS fornecer
      if (base.includes('abs-fornece-kit') && !base.includes('nao')) base.push('nao');
      return [...new Set(base.map(String))];
    })(),
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

type PerguntaVinculo = {
  id: string;
  titulo?: string;
  papel?: string;
  opcoes?: Array<{ id: string; label?: string }>;
};

function parecePerguntaQuantidadeVinculo(p: PerguntaVinculo): boolean {
  if (p.papel === 'quantidade') return true;
  if (p.papel === 'numero') return false;
  return p.id === 'quantidade' || /quantidad/i.test(p.titulo || '');
}

/**
 * Corrige vínculos inválidos (ex.: capacidade apontando para "Quantos aparelhos").
 * Sem isso o admin parece preenchido, mas a loja nunca encontra a faixa de BTUs.
 */
export function corrigirVinculosPrecoComposto(
  composto: PrecoCompostoConfig,
  perguntas: PerguntaVinculo[]
): PrecoCompostoConfig {
  if (!composto.ativo || !perguntas?.length) return composto;

  const out: PrecoCompostoConfig = { ...composto, faixas: [...(composto.faixas || [])] };
  const porId = new Map(perguntas.map((p) => [p.id, p]));

  const comOpcoes = perguntas.filter(
    (p) => (p.papel || 'normal') === 'normal' && (p.opcoes?.length || 0) > 0 && !parecePerguntaQuantidadeVinculo(p)
  );
  const numericas = perguntas.filter((p) => p.papel === 'numero');

  const capAtual = porId.get(out.perguntaCapacidadeId);
  const capInvalida =
    !capAtual ||
    parecePerguntaQuantidadeVinculo(capAtual) ||
    capAtual.papel === 'numero' ||
    !(capAtual.opcoes?.length);

  if (capInvalida) {
    const prefer =
      porId.get('capacidadeBtu') ||
      comOpcoes.find((p) => /capacidade|btu/i.test(`${p.id} ${p.titulo || ''}`)) ||
      comOpcoes.find((p) =>
        (p.opcoes || []).some((o) => /btu|12000|18000|24000/i.test(`${o.id} ${o.label || ''}`))
      ) ||
      comOpcoes[0];
    if (prefer) out.perguntaCapacidadeId = prefer.id;
  }

  const metrosAtual = porId.get(out.perguntaMetrosId);
  const metrosInvalido =
    !metrosAtual ||
    parecePerguntaQuantidadeVinculo(metrosAtual) ||
    ((metrosAtual.papel || 'normal') === 'normal' && !(metrosAtual.opcoes?.length) && metrosAtual.papel !== 'numero');

  if (metrosInvalido) {
    const prefer =
      porId.get('distanciaEvapCond') ||
      numericas.find((p) => /metro|distanc|metragem/i.test(`${p.id} ${p.titulo || ''}`)) ||
      numericas[0] ||
      comOpcoes.find((p) => /metro|distanc|metragem/i.test(`${p.id} ${p.titulo || ''}`));
    if (prefer) {
      out.perguntaMetrosId = prefer.id;
      if (prefer.papel === 'numero') out.metrosNumericos = true;
    }
  }

  const fornId = out.perguntaFornecimentoId || '';
  const fornAtual = fornId ? porId.get(fornId) : undefined;
  const fornInvalido =
    !fornAtual ||
    parecePerguntaQuantidadeVinculo(fornAtual) ||
    fornAtual.papel === 'numero' ||
    !(fornAtual.opcoes?.length);

  if (fornInvalido) {
    const prefer =
      porId.get('materiaisInstalacaoAr') ||
      comOpcoes.find((p) => /material|fornece|possu/i.test(`${p.id} ${p.titulo || ''}`));
    if (prefer) out.perguntaFornecimentoId = prefer.id;
  }

  // Realinha faixas às opções da pergunta de capacidade (preserva valores por opcaoId)
  const cap = porId.get(out.perguntaCapacidadeId);
  if (cap?.opcoes?.length) {
    const prev = new Map(out.faixas.map((f) => [f.opcaoId, f]));
    const padraoMetros = out.metrosInclusosPadrao ?? 2;
    out.faixas = cap.opcoes.map((op) => {
      const old = prev.get(op.id);
      return {
        opcaoId: op.id,
        label: op.label || old?.label,
        ajusteCapacidade: old?.ajusteCapacidade ?? 0,
        valorKitInicial: old?.valorKitInicial ?? 0,
        metrosInclusos: old?.metrosInclusos && old.metrosInclusos > 0 ? old.metrosInclusos : padraoMetros,
        precoPorMetroExtra: old?.precoPorMetroExtra ?? 0,
      };
    });
    // Se as faixas antigas tinham valores mas ids diferentes, tenta casar por label
    if (out.faixas.every((f) => !f.valorKitInicial && !f.ajusteCapacidade && !f.precoPorMetroExtra)) {
      for (const f of out.faixas) {
        const porLabel = [...prev.values()].find(
          (old) =>
            old.label &&
            f.label &&
            old.label.toLowerCase().includes(f.label.toLowerCase().slice(0, 10))
        );
        if (porLabel) {
          f.ajusteCapacidade = porLabel.ajusteCapacidade ?? 0;
          f.valorKitInicial = porLabel.valorKitInicial ?? 0;
          f.metrosInclusos = porLabel.metrosInclusos || padraoMetros;
          f.precoPorMetroExtra = porLabel.precoPorMetroExtra ?? 0;
        }
      }
    }
  }

  return out;
}

/** Enrich + correção de vínculos com as perguntas do fluxo. */
export function precoCompostoEfetivo(
  slug: string,
  raw: unknown,
  perguntas: PerguntaVinculo[]
): PrecoCompostoConfig {
  const enrich = enriquecerPrecoComposto(slug, raw);
  return corrigirVinculosPrecoComposto(enrich, perguntas);
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
