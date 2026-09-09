import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { Breadcrumb, Stars, TrustStrip, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { addToCart } from '../../store/cartStore';
import { solicitacaoApi } from '../../services/modules.service';
import { funil } from '../../utils/gtm';
import {
  findService,
  frequentlyTogether,
  fotoServico,
  money,
  toMoneyNumber,
  relatedSameCategory,
  type ServicoLoja,
} from '../../storefront/catalog';
import { ProductImageGallery } from '../../components/loja/ProductImageGallery';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { findPeca, isPecaSlug, itemPath, pecasDoServico } from '../../storefront/pecas';
import { totalComDescontoAPartirDaSegunda, DESCONTO_SEGUNDA_UNIDADE_PERCENT } from '../../utils/desconto-quantidade';
import {
  prefetchImagem,
  resolverImagemPrincipalPorRespostas,
} from '../../utils/imagem-principal-opcao';
import {
  expandirPerguntasPorUnidade,
  migrarRespostasParaMultiUnidade,
  respostasDaUnidade,
  temReplicacaoPorUnidade,
} from '../../utils/multi-unidade';

type FluxoPergunta = {
  id: string;
  titulo: string;
  opcoes: Array<{
    id: string;
    label: string;
    precoAdicional?: number;
    modoCobranca?: string;
    when?: Record<string, string[]>;
    imagemUrl?: string;
    usarComoImagemPrincipal?: boolean;
  }>;
  showIf?: { perguntaId: string; opcaoIds: string[] };
  papel?: 'quantidade' | 'numero' | 'normal';
  numeroMin?: number;
  numeroMax?: number;
  numeroPasso?: number;
  numeroUnidade?: string;
  /** Total da mão de obra por quantidade (substitui preço-base) */
  precosPorQuantidade?: Record<string, number>;
  /** Repete a pergunta para cada unidade (respostas id__uN) */
  replicarPorUnidade?: boolean;
};

type FaixaComposto = {
  opcaoId: string;
  label?: string;
  ajusteCapacidade?: number;
  valorKitInicial?: number;
  metrosInclusos: number;
  precoPorMetroExtra: number;
};

type PrecoCompostoVitrine = {
  ativo?: boolean;
  perguntaCapacidadeId?: string;
  perguntaMetrosId?: string;
  perguntaFornecimentoId?: string;
  opcoesAbsFornece?: string[];
  metrosNumericos?: boolean;
  mapaMetrosOpcao?: Record<string, number>;
  metrosInclusosPadrao?: number;
  labelMaoDeObra?: string;
  labelAjusteCapacidade?: string;
  labelKitInicial?: string;
  labelMetrosExtras?: string;
  faixas?: FaixaComposto[];
};

type ItemPrecoVitrine = {
  id: string;
  label: string;
  valor: number;
  when?: Record<string, string[]>;
  modoCobranca?: 'fixo' | 'por_unidade';
};

type Fluxo = {
  perguntas?: FluxoPergunta[];
  precoBase?: number | null;
  precoComposto?: PrecoCompostoVitrine | null;
  itensPreco?: ItemPrecoVitrine[];
  modoPreco?: string;
  multiplicarBasePorQuantidade?: boolean;
  perguntaQuantidadeId?: string | null;
};

type MaterialVariante = {
  sku: string;
  cor: string;
  labelCor: string;
  preco: number;
  imagemUrl: string;
  imagens?: string[];
  disponivel: number;
  ativo: boolean;
  disponivelParaCompra: boolean;
};

type MaterialModelo = {
  id: string;
  tipo: string;
  nome: string;
  detalhe: string | null;
  variantes: MaterialVariante[];
  disponivelParaCompra: boolean;
};

type MateriaisVitrine = {
  servicoSlug: string;
  perguntaPossuiId: string;
  opcoesComprarAbs: string[];
  perguntaTipoId: string | null;
  labelProduto: string;
  tipos: Array<{ id: string; label: string }>;
  modelos: MaterialModelo[];
};

type PrecoCalc = {
  preco: number;
  breakdown: Array<{ label: string; valor: number }>;
  valorServico?: number;
  valorPeca?: number;
  valorMaterial?: number;
  valorAdicionais?: number;
  descontoQuantidade?: number;
  pecaSlug?: string;
  pecaNome?: string;
  quantidade?: number;
};

const INCLUSOS_PADRAO = [
  'Remoção do item antigo',
  'Instalação',
  'Teste de funcionamento',
  'Profissional identificado',
  'Garantia de 90 dias',
];

function perguntasVisiveis(perguntas: FluxoPergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    return val != null && p.showIf.opcaoIds.includes(val);
  });
}

function isPerguntaQuantidade(p: FluxoPergunta) {
  if (p.papel === 'numero') return false;
  if (p.papel === 'quantidade') return true;
  return p.id === 'quantidade' || /quantidad/i.test(p.titulo);
}

function isPerguntaNumero(p: FluxoPergunta) {
  return p.papel === 'numero';
}

function isFornecimento(p: FluxoPergunta) {
  return /fornecimento|fornecer|material/i.test(p.id + p.titulo);
}

const IDS_ABS_FORNECE_CONHECIDOS = [
  'abs-fornece-kit',
  'nao',
  'nao-abs',
  'abs',
  'abs-padrao',
  'abs-premium',
];

/** Resolve cobrança de kit/metros só por ID da opção (nunca pelo label). */
function resolverCobrancaMaterialLocal(
  composto: PrecoCompostoVitrine,
  perguntas: FluxoPergunta[],
  respostas: Record<string, string>
): { cobraMaterial: boolean; perguntaId?: string } {
  const configurados = (composto.opcoesAbsFornece || []).map(String).filter(Boolean);

  const opcaoExiste = (p: FluxoPergunta, id: string) => p.opcoes.some((o) => o.id === id);

  const scorePergunta = (p: FluxoPergunta) => {
    let score = 0;
    const key = `${p.id} ${p.titulo || ''}`.toLowerCase();
    if (/material|forne/.test(key)) score += 10;
    if (/aparelho|comprado|equipamento/.test(key) && !/material|forne/.test(key)) score -= 5;
    score += configurados.filter((id) => opcaoExiste(p, id)).length * 3;
    const soSimNao =
      p.opcoes.length > 0 && p.opcoes.every((o) => o.id === 'sim' || o.id === 'nao');
    if (soSimNao && /material|forne/.test(key)) score += 5;
    return score;
  };

  const configuradaId = (composto.perguntaFornecimentoId || '').trim();
  let pergunta = (configuradaId && perguntas.find((p) => p.id === configuradaId)) || undefined;

  if (pergunta && configurados.length > 0) {
    const temAbs = configurados.some((id) => opcaoExiste(pergunta!, id));
    if (!temAbs) {
      const candidatas = perguntas
        .filter((p) => configurados.some((id) => opcaoExiste(p, id)))
        .sort((a, b) => scorePergunta(b) - scorePergunta(a));
      if (candidatas[0]) pergunta = candidatas[0];
    } else {
      const soSimNao =
        pergunta.opcoes.length > 0 &&
        pergunta.opcoes.every((o) => o.id === 'sim' || o.id === 'nao');
      if (soSimNao || configurados.every((id) => id === 'sim' || id === 'nao' || id === 'nao-abs')) {
        const melhor = [...perguntas]
          .filter(
            (p) =>
              configurados.some((id) => opcaoExiste(p, id)) ||
              IDS_ABS_FORNECE_CONHECIDOS.some((id) => opcaoExiste(p, id))
          )
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

  if (!configuradaId && !pergunta) return { cobraMaterial: true };
  if (!pergunta) return { cobraMaterial: false };

  let idsAbs = configurados.filter((id) => opcaoExiste(pergunta!, id));
  if (configurados.length > 0 && idsAbs.length === 0) {
    idsAbs = IDS_ABS_FORNECE_CONHECIDOS.filter((id) => opcaoExiste(pergunta!, id));
  }
  if (idsAbs.length === 0 && configurados.length === 0) {
    idsAbs = IDS_ABS_FORNECE_CONHECIDOS.filter((id) => opcaoExiste(pergunta!, id));
  }

  const resp = (respostas[pergunta.id] || '').trim();
  if (!resp) {
    for (const [chave, valor] of Object.entries(respostas)) {
      const tid = String(valor || '').trim();
      const pChave = perguntas.find((p) => p.id === chave);
      if (
        tid &&
        idsAbs.includes(tid) &&
        pChave &&
        opcaoExiste(pChave, tid) &&
        scorePergunta(pChave) >= 10
      ) {
        return { cobraMaterial: true, perguntaId: chave };
      }
    }
    return { cobraMaterial: false, perguntaId: pergunta.id };
  }

  return {
    cobraMaterial: idsAbs.includes(resp) || (configurados.includes(resp) && opcaoExiste(pergunta, resp)),
    perguntaId: pergunta.id,
  };
}

/** Soma preço composto/progressivo por unidade + extras compartilhados (fallback da API). */
function calcularMultiUnidadeLocal(
  fluxo: Fluxo,
  respostas: Record<string, string>,
  quantidade: number,
  labelBase = 'Unidade'
): PrecoCalc | null {
  if (!temReplicacaoPorUnidade(fluxo.perguntas || []) || quantidade <= 1) return null;
  const qtdId =
    fluxo.perguntaQuantidadeId ||
    (fluxo.perguntas || []).find((p) => p.papel === 'quantidade')?.id ||
    'quantidade';
  const breakdown: Array<{ label: string; valor: number }> = [];
  let valorMao = 0;
  let valorMaterial = 0;
  let valorAdicionais = 0;
  const idsReplicados = new Set(
    (fluxo.perguntas || [])
      .filter((p) => p.replicarPorUnidade && p.papel !== 'quantidade')
      .map((p) => p.id)
  );

  for (let u = 1; u <= quantidade; u++) {
    const rUnit = respostasDaUnidade(respostas, fluxo.perguntas || [], u, qtdId);
    const parcial =
      calcularCompostoLocal(fluxo, rUnit, { apenasUnidade: true }) ||
      calcularProgressivoLocal(fluxo, rUnit, 1, { apenasUnidade: true });
    if (!parcial) continue;
    const prefix = `${labelBase} ${u} — `;
    for (const item of parcial.breakdown) {
      breakdown.push({
        label: item.label.startsWith(prefix) ? item.label : `${prefix}${item.label}`,
        valor: item.valor,
      });
    }
    valorMao += Math.max(
      0,
      toMoneyNumber(parcial.valorServico) - toMoneyNumber(parcial.valorAdicionais)
    );
    valorMaterial += toMoneyNumber(parcial.valorMaterial || parcial.valorPeca);
    valorAdicionais += toMoneyNumber(parcial.valorAdicionais);
  }

  for (const pergunta of fluxo.perguntas || []) {
    if (pergunta.replicarPorUnidade || pergunta.papel === 'quantidade') continue;
    if (!perguntaVisivelLocal(pergunta, respostas)) continue;
    const resp = respostas[pergunta.id];
    const op = pergunta.opcoes.find((o) => o.id === resp);
    const extra = Number(op?.precoAdicional) || 0;
    if (!op || !extra) continue;
    if (!condicaoWhenLocal(op.when, respostas)) continue;
    const modo = op.modoCobranca || 'por_unidade';
    const valor = aplicarModoLocal(extra, modo, quantidade);
    breakdown.push({
      label: modo === 'fixo' ? `${op.label} (1× por atendimento)` : op.label,
      valor,
    });
    valorAdicionais += valor;
  }

  for (const item of fluxo.itensPreco || []) {
    const modo = item.modoCobranca || 'por_unidade';
    const whenKeys = item.when ? Object.keys(item.when) : [];
    const whenUsaReplicada = whenKeys.some((k) => idsReplicados.has(k));
    if (whenUsaReplicada) {
      let matches = 0;
      for (let u = 1; u <= quantidade; u++) {
        const rUnit = respostasDaUnidade(respostas, fluxo.perguntas || [], u, qtdId);
        if (condicaoWhenLocal(item.when, rUnit)) matches += 1;
      }
      if (matches === 0) continue;
      const vezes = modo === 'fixo' ? 1 : matches;
      const valor = Math.round((Number(item.valor) || 0) * vezes * 100) / 100;
      if (valor <= 0) continue;
      breakdown.push({
        label:
          modo === 'fixo'
            ? `${item.label} (1× por atendimento)`
            : matches > 1
              ? `${item.label} (${matches} × R$ ${Number(item.valor).toFixed(2)})`
              : item.label,
        valor,
      });
      valorAdicionais += valor;
      continue;
    }
    if (item.when && !condicaoWhenLocal(item.when, respostas)) continue;
    const valor = aplicarModoLocal(Number(item.valor) || 0, modo, quantidade);
    if (valor <= 0) continue;
    breakdown.push({
      label: modo === 'fixo' ? `${item.label} (1× por atendimento)` : item.label,
      valor,
    });
    valorAdicionais += valor;
  }

  const preco = Math.round(breakdown.reduce((a, b) => a + b.valor, 0) * 100) / 100;
  if (preco <= 0 && breakdown.length === 0) return null;
  return {
    preco,
    breakdown,
    requerValidacaoTecnica: false,
    valorServico: Math.round((valorMao + valorAdicionais) * 100) / 100,
    valorMaterial: valorMaterial > 0 ? valorMaterial : undefined,
    valorAdicionais: valorAdicionais > 0 ? valorAdicionais : undefined,
    valorPeca: valorMaterial > 0 ? valorMaterial : undefined,
    quantidade,
  };
}

/** Cálculo local do preço composto (ar-split) — garante kit/metros no site mesmo se a API atrasar. */
function calcularCompostoLocal(
  fluxo: Fluxo,
  respostas: Record<string, string>,
  opts?: { apenasUnidade?: boolean }
): PrecoCalc | null {
  const composto = fluxo.precoComposto;
  if (!composto?.ativo || !composto.perguntaCapacidadeId) return null;

  const base = Number(fluxo.precoBase) || 0;
  const capId = respostas[composto.perguntaCapacidadeId];
  const faixas = composto.faixas || [];
  let faixa = faixas.find((f) => f.opcaoId === capId) || null;
  if (!faixa && capId) {
    const perguntaCap = (fluxo.perguntas || []).find((p) => p.id === composto.perguntaCapacidadeId);
    const label = perguntaCap?.opcoes.find((o) => o.id === capId)?.label?.toLowerCase() || '';
    faixa =
      faixas.find((f) => (f.label || '').toLowerCase().includes(label.slice(0, 12)) || label.includes((f.label || '').toLowerCase().slice(0, 12))) ||
      null;
  }

  const ajuste = Math.max(0, Number(faixa?.ajusteCapacidade) || 0);
  const kit = Math.max(0, Number(faixa?.valorKitInicial) || 0);
  const metrosInclusos = Number(faixa?.metrosInclusos ?? composto.metrosInclusosPadrao ?? 0) || 0;
  const precoPorMetro = Math.max(0, Number(faixa?.precoPorMetroExtra) || 0);
  const faixaLabel = faixa?.label || capId || 'capacidade';

  const metrosId = composto.perguntaMetrosId || '';
  const metrosRaw = metrosId ? respostas[metrosId] : '';
  let metros = 0;
  if (metrosRaw) {
    if (composto.metrosNumericos || (fluxo.perguntas || []).find((p) => p.id === metrosId)?.papel === 'numero') {
      metros = Math.max(0, Number(String(metrosRaw).replace(',', '.')) || 0);
    } else if (composto.mapaMetrosOpcao?.[metrosRaw] != null) {
      metros = composto.mapaMetrosOpcao[metrosRaw];
    } else {
      metros = Math.max(0, Number(String(metrosRaw).replace(',', '.')) || 0);
    }
  }

  const { cobraMaterial, perguntaId: fornResolvido } = resolverCobrancaMaterialLocal(
    composto,
    fluxo.perguntas || [],
    respostas
  );

  const metrosExtras = cobraMaterial ? Math.max(0, metros - metrosInclusos) : 0;
  const valorExtras = cobraMaterial ? Math.round(metrosExtras * precoPorMetro * 100) / 100 : 0;
  const valorKit = cobraMaterial ? kit : 0;

  const breakdown: Array<{ label: string; valor: number }> = [];
  if (base > 0) {
    breakdown.push({ label: composto.labelMaoDeObra || 'Mão de obra', valor: base });
  }
  if (ajuste > 0) {
    breakdown.push({
      label: `${composto.labelAjusteCapacidade || 'Ajuste por capacidade'} (${faixaLabel})`,
      valor: ajuste,
    });
  }
  if (valorKit > 0) {
    breakdown.push({
      label: `${composto.labelKitInicial || 'Kit/material ABS'} (${faixaLabel})`,
      valor: valorKit,
    });
  }
  if (valorExtras > 0) {
    breakdown.push({
      label: `${composto.labelMetrosExtras || 'Metros adicionais'} (${metrosExtras} m × R$ ${precoPorMetro.toFixed(2)})`,
      valor: valorExtras,
    });
  } else if (cobraMaterial && metros > 0 && metrosInclusos > 0) {
    breakdown.push({
      label: `Metros inclusos no kit (até ${metrosInclusos} m — ${faixaLabel})`,
      valor: 0,
    });
  } else if (!cobraMaterial && fornResolvido && respostas[fornResolvido]) {
    breakdown.push({ label: 'Material do cliente (sem cobrança de kit/metros)', valor: 0 });
  }

  if (!opts?.apenasUnidade) {
    for (const item of fluxo.itensPreco || []) {
      if (item.when) {
        const ok = Object.entries(item.when).every(([k, vals]) => vals.includes(respostas[k]));
        if (!ok) continue;
      }
      const valor = Number(item.valor) || 0;
      if (valor > 0) breakdown.push({ label: item.label, valor });
    }
  }

  for (const pergunta of fluxo.perguntas || []) {
    if (
      pergunta.id === composto.perguntaCapacidadeId ||
      pergunta.id === composto.perguntaMetrosId ||
      pergunta.id === composto.perguntaFornecimentoId ||
      pergunta.id === fornResolvido
    ) {
      continue;
    }
    if (opts?.apenasUnidade && !pergunta.replicarPorUnidade) continue;
    if (!perguntaVisivelLocal(pergunta, respostas)) continue;
    const resp = respostas[pergunta.id];
    if (!resp) continue;
    const op = pergunta.opcoes.find((o) => o.id === resp);
    const extra = Number(op?.precoAdicional) || 0;
    if (!op || extra <= 0) continue;
    if (!condicaoWhenLocal(op.when, respostas)) continue;
    // No composto, quantidade do serviço costuma ser 1; ainda respeita modoCobranca
    const valor = aplicarModoLocal(extra, op.modoCobranca || 'fixo', 1);
    if (valor > 0) breakdown.push({ label: op.label, valor });
  }

  const preco = Math.round(breakdown.reduce((a, b) => a + b.valor, 0) * 100) / 100;
  const valorMaterial = valorKit + valorExtras;
  const valorAdicionais = breakdown
    .filter((b) => !/mão de obra|mao de obra|ajuste|kit|metros|material do cliente/i.test(b.label))
    .reduce((a, b) => a + b.valor, 0);

  return {
    preco,
    breakdown,
    valorServico: Math.round((base + ajuste + valorAdicionais) * 100) / 100,
    valorMaterial: valorMaterial > 0 ? valorMaterial : undefined,
    valorPeca: valorMaterial > 0 ? valorMaterial : undefined,
    valorAdicionais: valorAdicionais > 0 ? valorAdicionais : undefined,
  };
}

/** Preço progressivo por quantidade: a faixa substitui a mão de obra (não multiplica base). */
function precoMaoObraPorFaixaLocal(
  tabela: Record<string, number> | undefined,
  quantidade: number
): number | undefined {
  if (!tabela) return undefined;
  const qtd = Math.max(1, Math.floor(quantidade || 1));
  const direta = tabela[String(qtd)];
  if (direta != null && Number(direta) > 0) return Math.round(Number(direta) * 100) / 100;
  const chaves = Object.keys(tabela)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!chaves.length) return undefined;
  let escolhida = chaves[0];
  for (const k of chaves) {
    if (k <= qtd) escolhida = k;
    else break;
  }
  const valor = Number(tabela[String(escolhida)]);
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : undefined;
}

function condicaoWhenLocal(
  when: Record<string, string[]> | undefined,
  respostas: Record<string, string>
): boolean {
  if (!when || !Object.keys(when).length) return true;
  return Object.entries(when).every(([k, ids]) => ids.includes(respostas[k] || ''));
}

function perguntaVisivelLocal(
  pergunta: FluxoPergunta,
  respostas: Record<string, string>
): boolean {
  if (!pergunta.showIf) return true;
  return pergunta.showIf.opcaoIds.includes(respostas[pergunta.showIf.perguntaId] || '');
}

function aplicarModoLocal(valor: number, modo: string | undefined, quantidade: number): number {
  const v = Number(valor) || 0;
  if (!v) return 0;
  if (modo === 'fixo') return v;
  return v * Math.max(1, Math.floor(quantidade || 1));
}

function calcularProgressivoLocal(
  fluxo: Fluxo,
  respostas: Record<string, string>,
  quantidade: number,
  opts?: { apenasUnidade?: boolean }
): PrecoCalc | null {
  const perguntaQtd =
    (fluxo.perguntas || []).find((p) => p.papel === 'quantidade') ||
    (fluxo.perguntas || []).find((p) => p.id === (fluxo.perguntaQuantidadeId || 'quantidade')) ||
    (fluxo.perguntas || []).find((p) => /quantidad/i.test(p.titulo));
  // Em modo multi-unidade, cada aparelho usa preço-base (não tabela progressiva agregada)
  const faixa = opts?.apenasUnidade
    ? Number(fluxo.precoBase) > 0
      ? Number(fluxo.precoBase)
      : undefined
    : precoMaoObraPorFaixaLocal(perguntaQtd?.precosPorQuantidade, quantidade);
  if (faixa == null) return null;

  const breakdown: Array<{ label: string; valor: number }> = [
    {
      label: !opts?.apenasUnidade && quantidade > 1 ? `Mão de obra (${quantidade} un.)` : 'Mão de obra',
      valor: faixa,
    },
  ];
  let adicionais = 0;

  if (!opts?.apenasUnidade) {
    for (const item of fluxo.itensPreco || []) {
      if (item.when && !condicaoWhenLocal(item.when, respostas)) continue;
      const modo = item.modoCobranca || 'por_unidade';
      const valor = aplicarModoLocal(Number(item.valor) || 0, modo, quantidade);
      if (valor > 0) {
        breakdown.push({ label: item.label, valor });
        adicionais += valor;
      }
    }
  }

  for (const pergunta of fluxo.perguntas || []) {
    if (pergunta.id === perguntaQtd?.id) continue;
    if (opts?.apenasUnidade && !pergunta.replicarPorUnidade) continue;
    if (!perguntaVisivelLocal(pergunta, respostas)) continue;
    const resp = respostas[pergunta.id];
    if (!resp) continue;
    const op = pergunta.opcoes.find((o) => o.id === resp);
    const extra = Number(op?.precoAdicional) || 0;
    if (!op || extra <= 0) continue;
    if (!condicaoWhenLocal(op.when, respostas)) continue;
    const modo = op.modoCobranca || 'por_unidade';
    const valor = aplicarModoLocal(extra, modo, opts?.apenasUnidade ? 1 : quantidade);
    if (valor <= 0) continue;
    const label =
      !opts?.apenasUnidade && modo !== 'fixo' && quantidade > 1
        ? `${op.label} (${quantidade} × R$ ${extra.toFixed(2)})`
        : op.label;
    breakdown.push({ label, valor });
    adicionais += valor;
  }

  const preco = Math.round((faixa + adicionais) * 100) / 100;
  return {
    preco,
    breakdown,
    valorServico: preco,
    valorAdicionais: adicionais > 0 ? adicionais : undefined,
  };
}

function pecaPreviewParaOpcao(slug: string, respostas: Record<string, string>, opcaoId: string) {
  if (opcaoId === 'cliente' || opcaoId === 'sim') return null;
  if (!['abs', 'abs-padrao', 'abs-premium', 'nao', 'nao-abs'].includes(opcaoId)) return null;

  const tipo =
    respostas.tipoTomada ||
    respostas.tipoInterruptor ||
    respostas.tipoTorneira ||
    '';

  const mapa: Record<string, Record<string, string>> = {
    'troca-tomada': {
      simples: 'peca-tomada-simples',
      dupla: 'peca-tomada-dupla',
      'tomada-20a': 'peca-tomada-20a',
      'dupla-20a': 'peca-tomada-20a',
    },
    'troca-interruptor': {
      simples: 'peca-interruptor-simples',
      duplo: 'peca-interruptor-duplo',
      paralelo: 'peca-interruptor-paralelo',
    },
  };
  const pecaSlug = mapa[slug]?.[tipo];
  return pecaSlug ? findPeca(pecaSlug) : null;
}

function VisitUpsellCompact({ servicos }: { servicos: ServicoLoja[] }) {
  const navigate = useNavigate();
  if (!servicos.length) return null;
  return (
    <div className="rounded-[12px] border border-[#e6e8ee] bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-[#002d62]">Aproveite a visita e resolva mais!</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Adicione outros serviços no mesmo atendimento.</p>
      <ul className="mt-3 space-y-2">
        {servicos.slice(0, 4).map((s) => (
          <li key={s.slug} className="flex items-center gap-2">
            <img src={fotoServico(s)} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#111827]">{s.nome}</p>
              <p className="text-[11px] font-semibold text-[#002d62]">
                {s.precoMinimo ? `A partir de ${money(s.precoMinimo)}` : s.precoTexto}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Adicionar ${s.nome}`}
              onClick={() => {
                if (s.tipoPreco === 'sob_orcamento') {
                  navigate(itemPath(s));
                  return;
                }
                addToCart({
                  slug: s.slug,
                  nome: s.nome,
                  categoria: s.categoria,
                  precoMinimo: s.precoMinimo,
                  precoTexto: s.precoTexto || '',
                  tipoPreco: s.tipoPreco || 'fixo',
                  imagemUrl: s.imagemUrl,
                  tipo: 'servico',
                });
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#002d62] text-lg font-black text-[#002d62]"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ServicePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const servico = findService(categorias, slug);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [materiaisCfg, setMateriaisCfg] = useState<MateriaisVitrine | null>(null);
  const [modelos, setModelos] = useState<MaterialModelo[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [precoCalc, setPrecoCalc] = useState<PrecoCalc | null>(null);
  const [erroPerguntas, setErroPerguntas] = useState('');
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [skuSel, setSkuSel] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setRespostas({});
    setQty(1);
    setModeloId(null);
    setSkuSel(null);
    solicitacaoApi.fluxo(slug).then((d) => setFluxo(d as Fluxo)).catch(() => setFluxo(null));
    solicitacaoApi
      .materiais(slug)
      .then((d) => setMateriaisCfg(d as MateriaisVitrine | null))
      .catch(() => setMateriaisCfg(null));
  }, [slug]);

  const perguntasBasicas = useMemo(() => {
    // Nunca truncar: no ar-split a pergunta de material ficava fora do slice(0,6)
    // e o kit/metros não entravam no cálculo do site.
    return fluxo?.perguntas || [];
  }, [fluxo?.perguntas]);

  const labelUnidade = /ar-split|ar.condicionado/i.test(slug) ? 'Aparelho' : 'Unidade';
  const usaMultiUnidade = temReplicacaoPorUnidade(perguntasBasicas);

  // Ao aumentar quantidade, copia respostas da unidade 1 (sem sufixo) para __u1
  useEffect(() => {
    if (!usaMultiUnidade || qty <= 1) return;
    setRespostas((r) => {
      const next = migrarRespostasParaMultiUnidade(r, perguntasBasicas, qty);
      return next === r || JSON.stringify(next) === JSON.stringify(r) ? r : next;
    });
  }, [qty, usaMultiUnidade, perguntasBasicas]);

  const perguntasExpandidas = useMemo(
    () =>
      usaMultiUnidade
        ? expandirPerguntasPorUnidade(perguntasBasicas, qty, labelUnidade)
        : perguntasBasicas.map((p) => ({
            ...p,
            perguntaIdOriginal: p.id,
            respostaKey: p.id,
          })),
    [perguntasBasicas, qty, usaMultiUnidade, labelUnidade]
  );

  const visiveis = useMemo(
    () => perguntasVisiveis(perguntasExpandidas, respostas),
    [perguntasExpandidas, respostas]
  );

  const precisaMaterial = Boolean(
    materiaisCfg &&
      materiaisCfg.opcoesComprarAbs.includes(respostas[materiaisCfg.perguntaPossuiId] || '')
  );

  const tipoMaterial =
    materiaisCfg?.perguntaTipoId ? respostas[materiaisCfg.perguntaTipoId] || '' : '';

  useEffect(() => {
    if (!slug || !precisaMaterial || !materiaisCfg) {
      setModelos([]);
      return;
    }
    const tipo = materiaisCfg.perguntaTipoId ? tipoMaterial : undefined;
    if (materiaisCfg.perguntaTipoId && !tipo) {
      setModelos([]);
      return;
    }
    let cancelled = false;
    solicitacaoApi
      .materiais(slug, tipo)
      .then((d) => {
        if (cancelled || !d) return;
        setModelos((d as MateriaisVitrine).modelos || []);
      })
      .catch(() => {
        if (!cancelled) setModelos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, precisaMaterial, tipoMaterial, materiaisCfg]);

  useEffect(() => {
    setModeloId(null);
    setSkuSel(null);
  }, [precisaMaterial, tipoMaterial]);

  const modeloSel = useMemo(
    () => modelos.find((m) => m.id === modeloId) || null,
    [modelos, modeloId]
  );

  const varianteSel = useMemo(() => {
    if (!modeloSel) return null;
    if (skuSel) return modeloSel.variantes.find((v) => v.sku === skuSel) || null;
    return modeloSel.variantes.find((v) => v.disponivelParaCompra) || modeloSel.variantes[0] || null;
  }, [modeloSel, skuSel]);

  const perguntasSemQty = visiveis.filter((p) => !isPerguntaQuantidade(p));
  const perguntaQty = visiveis.find(isPerguntaQuantidade);
  const temPerguntaQty = Boolean(perguntaQty);
  const qtyPerguntaId = perguntaQty?.id || 'quantidade';

  // Mantém resposta de quantidade sincronizada com o stepper (usa o id real da pergunta)
  useEffect(() => {
    if (!temPerguntaQty) return;
    setRespostas((r) =>
      r[qtyPerguntaId] === String(qty) ? r : { ...r, [qtyPerguntaId]: String(qty) }
    );
  }, [qty, temPerguntaQty, qtyPerguntaId]);

  // Recalcula sempre que a quantidade (ou respostas) muda — o resumo precisa acompanhar
  useEffect(() => {
    if (!slug) {
      setPrecoCalc(null);
      return;
    }
    let cancelled = false;
    const respostasComQty = {
      ...respostas,
      ...(temPerguntaQty || qty > 1 ? { [qtyPerguntaId]: String(qty), quantidade: String(qty) } : {}),
    };
    solicitacaoApi
      .calcularPreco({ slug, respostas: respostasComQty, quantidade: qty })
      .then((r) => {
        if (!cancelled) setPrecoCalc(r as PrecoCalc);
      })
      .catch(() => {
        if (!cancelled) setPrecoCalc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, respostas, qty, temPerguntaQty, qtyPerguntaId]);

  const precoLocal = useMemo(() => {
    if (!fluxo) return null;
    const multi = calcularMultiUnidadeLocal(fluxo, respostas, qty, labelUnidade);
    if (multi) return multi;
    // Composto (ar-split) tem prioridade; senão tabela progressiva por quantidade
    return (
      calcularCompostoLocal(fluxo, respostas) ||
      calcularProgressivoLocal(fluxo, respostas, qty)
    );
  }, [fluxo, respostas, qty, labelUnidade]);

  // Imagem principal dinâmica (opções com usarComoImagemPrincipal) — não afeta preço
  const imagemPrincipalOpcao = useMemo(() => {
    if (!fluxo?.perguntas?.length) return null;
    return resolverImagemPrincipalPorRespostas(fluxo.perguntas, respostas, null);
  }, [fluxo?.perguntas, respostas]);

  useEffect(() => {
    prefetchImagem(imagemPrincipalOpcao);
  }, [imagemPrincipalOpcao]);

  // Se a API ainda não cobrou kit/metros (ou falhou), usa o cálculo local do composto
  const precoEfetivo = useMemo(() => {
    if (!precoLocal) return precoCalc;
    if (!precoCalc) return precoLocal;
    if (fluxo?.precoComposto?.ativo) {
      const cobranca = resolverCobrancaMaterialLocal(
        fluxo.precoComposto,
        fluxo.perguntas || [],
        respostas
      );
      const apiSemMaterial =
        cobranca.cobraMaterial && !(toMoneyNumber(precoCalc.valorMaterial || precoCalc.valorPeca) > 0);
      if (apiSemMaterial && toMoneyNumber(precoLocal.valorMaterial) > 0) return precoLocal;
    }
    if (toMoneyNumber(precoLocal.preco) > toMoneyNumber(precoCalc.preco)) return precoLocal;
    // Progressivo: se a API ainda multiplicou a base, preferir a faixa local
    if (
      toMoneyNumber(precoLocal.preco) > 0 &&
      Math.abs(toMoneyNumber(precoLocal.preco) - toMoneyNumber(precoCalc.preco)) > 0.009
    ) {
      const temFaixa = (fluxo?.perguntas || []).some((p) =>
        Object.values(p.precosPorQuantidade || {}).some((v) => Number(v) > 0)
      );
      if (temFaixa) return precoLocal;
    }
    return precoCalc;
  }, [precoCalc, precoLocal, fluxo, respostas]);

  const price = toMoneyNumber(servico?.precoMinimo);
  // Fallback local: o total sobe com a qtd mesmo se a API atrasar/falhar
  const laborLocal = totalComDescontoAPartirDaSegunda(price, qty, DESCONTO_SEGUNDA_UNIDADE_PERCENT);
  const valorAdicionaisApi = toMoneyNumber(precoEfetivo?.valorAdicionais);
  const valorServico = toMoneyNumber(
    precoEfetivo?.valorServico != null
      ? precoEfetivo.valorServico
      : precoEfetivo?.preco != null
        ? Math.max(0, toMoneyNumber(precoEfetivo.preco) - toMoneyNumber(precoEfetivo.valorPeca))
        : laborLocal.total
  );
  // Na UI, "mão de obra" = base + ajuste BTU (sem adicionais soltos nem material)
  const valorMaoObraDisplay = Math.max(0, valorServico - valorAdicionaisApi);
  const valorPecaCatalogo = toMoneyNumber(
    precoEfetivo?.valorPeca != null
      ? precoEfetivo.valorPeca
      : precisaMaterial && varianteSel?.disponivelParaCompra
        ? totalComDescontoAPartirDaSegunda(
            toMoneyNumber(varianteSel.preco),
            qty,
            DESCONTO_SEGUNDA_UNIDADE_PERCENT
          ).total
        : 0
  );
  const total = toMoneyNumber(
    (() => {
      const base =
        precoEfetivo?.preco != null ? toMoneyNumber(precoEfetivo.preco) : valorServico + valorPecaCatalogo;
      const materialExtra =
        precoEfetivo?.preco != null &&
        precisaMaterial &&
        varianteSel?.disponivelParaCompra &&
        !(toMoneyNumber(precoEfetivo.valorPeca) > 0)
          ? totalComDescontoAPartirDaSegunda(
              toMoneyNumber(varianteSel.preco),
              qty,
              DESCONTO_SEGUNDA_UNIDADE_PERCENT
            ).total
          : 0;
      return base + materialExtra;
    })()
  );
  const descontoQtd = toMoneyNumber(
    (() => {
      const api = toMoneyNumber(precoEfetivo?.descontoQuantidade);
      if (api > 0) return api;
      if (precoEfetivo?.valorServico == null && qty > 1) return laborLocal.economia;
      if (precisaMaterial && varianteSel?.disponivelParaCompra && qty > 1) {
        return totalComDescontoAPartirDaSegunda(
          toMoneyNumber(varianteSel.preco),
          qty,
          DESCONTO_SEGUNDA_UNIDADE_PERCENT
        ).economia;
      }
      return 0;
    })()
  );

  const together = useMemo(() => frequentlyTogether(categorias, slug, 4), [categorias, slug]);
  const sameCategory = useMemo(() => relatedSameCategory(categorias, slug, 4), [categorias, slug]);
  const pecas = useMemo(() => pecasDoServico(slug).slice(0, 4), [slug]);

  const inclusos = useMemo(() => {
    const dias = servico?.garantiaDias || 90;
    const base = INCLUSOS_PADRAO.map((item) =>
      item.startsWith('Garantia') ? `Garantia de ${dias} dias` : item
    );
    if (valorPecaCatalogo > 0) {
      const nomePeca =
        precoCalc?.pecaNome ||
        (modeloSel && varianteSel
          ? `${materiaisCfg?.labelProduto || 'Material'} ${modeloSel.nome} (${varianteSel.labelCor})`
          : materiaisCfg?.labelProduto || 'Peça/material');
      base.unshift(`${nomePeca} — fornecido pela ABS`);
    } else {
      const perguntaForn = (fluxo?.perguntas || []).find(isFornecimento);
      const respForn = perguntaForn ? respostas[perguntaForn.id] : '';
      if (respForn === 'cliente' || respForn === 'sim') {
        base.unshift('Peça/material do cliente (sem custo de peça neste pedido)');
      }
    }
    return base;
  }, [
    servico?.garantiaDias,
    valorPecaCatalogo,
    precoCalc?.pecaNome,
    modeloSel,
    varianteSel,
    materiaisCfg?.labelProduto,
    fluxo?.perguntas,
    respostas,
  ]);

  useEffect(() => {
    if (!servico) return;
    funil.visualizouServico({
      slug: servico.slug,
      nome: servico.nome,
      categoria: servico.categoria,
    });
  }, [servico?.slug]);

  if (loading) return <Loading />;
  if (isPecaSlug(slug)) return <Navigate to={`/p/${slug}`} replace />;
  if (!servico) {
    return (
      <div>
        <h1 className="text-xl font-bold">Serviço não encontrado</h1>
        <Link to="/" className="mt-3 inline-block text-primary-700">Voltar à loja</Link>
      </div>
    );
  }

  const escolherResposta = (perguntaId: string, opcaoId: string) => {
    setErroPerguntas('');
    setRespostas((r) => ({ ...r, [perguntaId]: opcaoId }));
  };

  const setQuantidadeLivre = (n: number) => {
    const next = Math.max(1, Math.min(99, Math.floor(n) || 1));
    setQty(next);
    setErroPerguntas('');
  };

  const setRespostaNumero = (perguntaId: string, n: number, min = 0, max = 99, passo = 1) => {
    const step = passo > 0 ? passo : 1;
    const raw = Number.isFinite(n) ? n : min;
    const snapped = Math.round(raw / step) * step;
    const next = Math.max(min, Math.min(max, snapped));
    setErroPerguntas('');
    setRespostas((r) => ({ ...r, [perguntaId]: String(next) }));
  };

  const selecionarModelo = (m: MaterialModelo) => {
    setErroPerguntas('');
    setModeloId(m.id);
    const preferida = m.variantes.find((v) => v.disponivelParaCompra) || m.variantes[0];
    setSkuSel(preferida?.sku || null);
  };

  const addItems = () => {
    const respostasServico: Record<string, string> = {
      ...respostas,
      ...(temPerguntaQty
        ? { [qtyPerguntaId]: String(qty), quantidade: String(qty) }
        : {}),
    };
    if (varianteSel && precisaMaterial) {
      respostasServico.materialSku = varianteSel.sku;
      respostasServico.materialCor = varianteSel.labelCor;
      respostasServico.materialModeloId = modeloSel?.id || '';
    }

    // Serviço: total efetivo (API ou composto local) menos peça em linha separada
    const pecaSeparada = Boolean(precoEfetivo?.pecaSlug && toMoneyNumber(precoEfetivo.valorPeca) > 0);
    const precoServicoCarrinho =
      precoEfetivo?.preco != null
        ? pecaSeparada
          ? Math.max(0, toMoneyNumber(precoEfetivo.preco) - toMoneyNumber(precoEfetivo.valorPeca))
          : toMoneyNumber(precoEfetivo.preco)
        : valorServico;

    addToCart(
      {
        slug: servico.slug,
        nome: servico.nome,
        categoria: servico.categoria,
        precoMinimo: precoServicoCarrinho,
        precoTexto: servico.precoTexto || '',
        tipoPreco: servico.tipoPreco || 'fixo',
        imagemUrl: servico.imagemUrl,
        tipo: 'servico',
        respostas: Object.keys(respostasServico).length ? respostasServico : undefined,
        cartKey: `svc:${servico.slug}`,
      },
      1
    );

    // Peça do catálogo (tomada/interruptor via ABS) — multiplica pela quantidade
    if (precoEfetivo?.pecaSlug && toMoneyNumber(precoEfetivo.valorPeca) > 0) {
      const peca = findPeca(precoEfetivo.pecaSlug);
      if (peca) {
        addToCart(
          {
            slug: peca.slug,
            nome: peca.nome,
            categoria: peca.categoria,
            precoMinimo: toMoneyNumber(peca.precoMinimo),
            precoTexto: peca.precoTexto,
            tipoPreco: 'fixo',
            imagemUrl: peca.imagemUrl,
            tipo: 'peca',
            servicoRelacionado: servico.slug,
            cartKey: `peca:${peca.slug}:${servico.slug}`,
          },
          qty
        );
      }
    }

    // Material visual (torneira/chuveiro)
    if (precisaMaterial && varianteSel && modeloSel) {
      addToCart(
        {
          slug: varianteSel.sku,
          nome: `${modeloSel.nome} — ${varianteSel.labelCor}`,
          categoria: servico.categoria,
          precoMinimo: toMoneyNumber(varianteSel.preco),
          precoTexto: money(varianteSel.preco),
          tipoPreco: 'fixo',
          imagemUrl: varianteSel.imagemUrl,
          tipo: 'peca',
          servicoRelacionado: servico.slug,
          materialSku: varianteSel.sku,
          materialCor: varianteSel.labelCor,
          materialModeloId: modeloSel.id,
          cartKey: `mat:${varianteSel.sku}`,
        },
        qty
      );
    }
  };

  const putInCart = () => {
    if (precisaMaterial && !varianteSel?.disponivelParaCompra) {
      setErroPerguntas(`Selecione um(a) ${materiaisCfg?.labelProduto || 'produto'} disponível`);
      document.getElementById('resumo-servico')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const faltando = perguntasSemQty.find((p) => !respostas[p.id]);
    if (faltando) {
      setErroPerguntas(`Responda: ${faltando.titulo}`);
      document.getElementById('resumo-servico')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (temPerguntaQty && qty < 1) {
      setErroPerguntas('Informe a quantidade');
      return;
    }
    setErroPerguntas('');
    addItems();
  };

  const goCart = () => {
    putInCart();
    if (precisaMaterial && !varianteSel?.disponivelParaCompra) return;
    const faltando = perguntasSemQty.find((p) => !respostas[p.id]);
    if (faltando) return;
    funil.clicouComprarAgendar({
      slug: servico.slug,
      nome: servico.nome,
      origem: 'pagina_servico',
      valor: total || undefined,
    });
    navigate('/carrinho');
  };

  return (
    <div className="pb-24 lg:pb-0">
      <Breadcrumb
        items={[
          { label: 'Início', to: '/' },
          { label: servico.categoriaNome || 'Serviços', to: `/c/${servico.categoria}` },
          { label: servico.nome },
        ]}
      />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.05fr_1fr_21rem]">
        <div>
          {precisaMaterial && varianteSel ? (
            <>
              <ProductImageGallery
                item={{
                  slug: varianteSel.sku,
                  nome: `${modeloSel?.nome || servico.nome} — ${varianteSel.labelCor}`,
                  imagemUrl: varianteSel.imagemUrl,
                  imagens: varianteSel.imagens,
                }}
                destaqueUrl={imagemPrincipalOpcao}
              />
              <TrustStrip garantiaDias={servico.garantiaDias || 90} />
            </>
          ) : (
            <>
              <ProductImageGallery item={servico} destaqueUrl={imagemPrincipalOpcao} />
              <TrustStrip garantiaDias={servico.garantiaDias || 90} />
            </>
          )}
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#002d62]">{servico.categoriaNome}</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight text-[#111827]">{servico.nome}</h1>
          <Stars value={4.9} count={186} />
          <div className="mt-4 rounded-[10px] border border-[#e6e8ee] bg-[#f8fafc] p-4">
            <p className="text-xs text-slate-500">
              {qty > 1 ? `Total · ${qty} un.` : slug === 'instalacao-ar-split' && total > 0 ? 'Total estimado' : 'A partir de'}
            </p>
            <p className="text-[32px] font-black text-[#002d62]">
              {money(
                slug === 'instalacao-ar-split' && total > 0
                  ? total
                  : valorMaoObraDisplay || servico.precoMinimo || 0
              )}
            </p>
            {qty > 1 && descontoQtd > 0 && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Sem desconto seria {money(valorMaoObraDisplay + descontoQtd)} (−{money(descontoQtd)})
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {slug === 'instalacao-ar-split'
                ? 'Inclui mão de obra + material (quando a ABS fornecer), conforme suas respostas.'
                : 'Mão de obra = preço-base + ajuste por BTUs. Material (kit/metros) à parte, se a ABS fornecer.'}
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{servico.descricao}</p>

          <div className="mt-6 space-y-5">
            {visiveis.map((p, idx) => {
              if (isPerguntaQuantidade(p)) {
                return (
                  <div key={p.id}>
                    <p className="mb-2 text-sm font-bold text-[#002d62]">
                      {idx + 1}. {p.titulo}
                    </p>
                    <div className="flex w-fit items-center overflow-hidden rounded-lg border border-[#d5d9e2] bg-white">
                      <button
                        type="button"
                        className="h-11 w-11 text-xl font-bold"
                        onClick={() => setQuantidadeLivre(qty - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={qty}
                        onChange={(e) => setQuantidadeLivre(Number(e.target.value))}
                        className="h-11 w-14 border-x border-[#d5d9e2] text-center text-base font-black outline-none"
                      />
                      <button
                        type="button"
                        className="h-11 w-11 text-xl font-bold"
                        onClick={() => setQuantidadeLivre(qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {usaMultiUnidade
                        ? `As próximas perguntas se repetem para cada ${labelUnidade.toLowerCase()}.`
                        : `A partir da 2ª unidade: ${DESCONTO_SEGUNDA_UNIDADE_PERCENT}% de desconto na mão de obra e nas peças/materiais.`}
                    </p>
                  </div>
                );
              }

              if (isPerguntaNumero(p)) {
                const min = p.numeroMin ?? 0;
                const max = p.numeroMax ?? 99;
                const passo = p.numeroPasso ?? 1;
                const atual = Number(respostas[p.id]);
                const valor = Number.isFinite(atual) ? atual : min;
                return (
                  <div key={p.id}>
                    <p className="mb-2 text-sm font-bold text-[#002d62]">
                      {idx + 1}. {p.titulo}
                    </p>
                    <div className="flex w-fit items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-lg border border-[#d5d9e2] bg-white">
                        <button
                          type="button"
                          className="h-11 w-11 text-xl font-bold"
                          onClick={() => setRespostaNumero(p.id, valor - passo, min, max, passo)}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          step={passo}
                          value={respostas[p.id] ?? ''}
                          onChange={(e) =>
                            setRespostaNumero(p.id, Number(e.target.value), min, max, passo)
                          }
                          className="h-11 w-16 border-x border-[#d5d9e2] text-center text-base font-black outline-none"
                        />
                        <button
                          type="button"
                          className="h-11 w-11 text-xl font-bold"
                          onClick={() => setRespostaNumero(p.id, valor + passo, min, max, passo)}
                        >
                          +
                        </button>
                      </div>
                      {p.numeroUnidade && (
                        <span className="text-sm font-semibold text-slate-600">{p.numeroUnidade}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Informe o valor exato{p.numeroUnidade ? ` em ${p.numeroUnidade}` : ''}.
                    </p>
                  </div>
                );
              }

              return (
                <div key={p.id}>
                  <p className="mb-2 text-sm font-bold text-[#002d62]">
                    {idx + 1}. {p.titulo}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {p.opcoes.map((o) => {
                      const pecaHint =
                        isFornecimento(p) && slug
                          ? pecaPreviewParaOpcao(slug, respostas, o.id)
                          : null;
                      const precoOpcao =
                        o.id === 'cliente' || o.id === 'sim'
                          ? 0
                          : pecaHint
                            ? pecaHint.precoMinimo * qty
                            : null;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => escolherResposta(p.id, o.id)}
                          className={`min-w-[7.5rem] rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
                            respostas[p.id] === o.id
                              ? 'border-[#002d62] bg-[#e8f0ff] text-[#002d62]'
                              : 'border-slate-200 bg-white hover:border-[#002d62]/40'
                          }`}
                        >
                          <span className="block">{o.label}</span>
                          {isFornecimento(p) && precoOpcao != null && (
                            <span className="mt-1 block text-xs font-bold text-slate-500">
                              {precoOpcao === 0
                                ? '+ R$ 0,00'
                                : `+ ${money(pecaHint!.precoMinimo)} / un. · ${money(precoOpcao)}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {precisaMaterial &&
                    materiaisCfg?.perguntaTipoId === p.id &&
                    respostas[p.id] && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-bold text-[#002d62]">
                          Escolha {materiaisCfg.labelProduto.toLowerCase()}
                        </p>
                        {modelos.length === 0 ? (
                          <p className="text-sm text-slate-500">Carregando modelos…</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {modelos.map((m) => {
                              const v =
                                m.id === modeloId && varianteSel
                                  ? varianteSel
                                  : m.variantes.find((x) => x.disponivelParaCompra) || m.variantes[0];
                              const selected = modeloId === m.id;
                              const indisponivel = !m.disponivelParaCompra;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={indisponivel}
                                  onClick={() => selecionarModelo(m)}
                                  className={`rounded-xl border p-3 text-left transition ${
                                    selected
                                      ? 'border-[#002d62] bg-[#e8f0ff] ring-2 ring-[#002d62]/30'
                                      : indisponivel
                                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                                        : 'border-slate-200 bg-white hover:border-[#002d62]/40'
                                  }`}
                                >
                                  <img
                                    src={v?.imagemUrl}
                                    alt={m.nome}
                                    className="mb-2 h-28 w-full rounded-lg object-cover"
                                  />
                                  <p className="text-sm font-black text-[#111827]">{m.nome}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {(v?.labelCor || '') + (m.detalhe ? ` • ${m.detalhe}` : '')}
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-[#002d62]">
                                    {indisponivel ? 'Indisponível' : `+ ${money(v?.preco || 0)}`}
                                  </p>
                                  {selected && !indisponivel && (
                                    <p className="mt-1 text-[11px] font-bold uppercase text-emerald-700">
                                      Selecionado
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {modeloSel && modeloSel.variantes.length > 1 && (
                          <div className="mt-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Cor / acabamento
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {modeloSel.variantes.map((v) => (
                                <button
                                  key={v.sku}
                                  type="button"
                                  disabled={!v.disponivelParaCompra}
                                  onClick={() => setSkuSel(v.sku)}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    varianteSel?.sku === v.sku
                                      ? 'border-[#002d62] bg-[#002d62] text-white'
                                      : !v.disponivelParaCompra
                                        ? 'cursor-not-allowed border-slate-100 text-slate-400 line-through'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#002d62]'
                                  }`}
                                >
                                  {v.labelCor}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}

            {visiveis.length === 0 && (
              <div>
                <p className="mb-2 text-sm font-bold">Quantidade</p>
                <div className="flex w-fit items-center overflow-hidden rounded-md border border-[#d5d9e2]">
                  <button type="button" className="h-9 w-9" onClick={() => setQuantidadeLivre(qty - 1)}>−</button>
                  <span className="w-8 text-center font-black">{qty}</span>
                  <button type="button" className="h-9 w-9" onClick={() => setQuantidadeLivre(qty + 1)}>+</button>
                </div>
              </div>
            )}
            {erroPerguntas && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroPerguntas}</p>
            )}
          </div>
        </div>

        {/* Coluna sticky: visita + resumo — aproveita a área ociosa e fica sempre à vista */}
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <VisitUpsellCompact servicos={together} />

          <div id="resumo-servico" className="rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#002d62]">Resumo do serviço</p>
              {visiveis.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-bold text-[#1d4ed8]"
                  onClick={() => {
                    setRespostas({});
                    setQty(1);
                    setModeloId(null);
                    setSkuSel(null);
                    setErroPerguntas('');
                  }}
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="mt-3 rounded-lg bg-[#f8fafc] p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                O que está incluso
              </p>
              <ul className="mt-2 space-y-1.5">
                {inclusos.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-snug text-slate-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-slate-500">
              Valores discriminados
            </p>
            <div className="mt-2 space-y-2 border-b border-slate-100 pb-3 text-sm">
              {(usaMultiUnidade || slug === 'instalacao-ar-split') &&
              Array.isArray(precoEfetivo?.breakdown) &&
              precoEfetivo!.breakdown.length > 0 ? (
                <>
                  {precoEfetivo!.breakdown
                    .filter((b) => b.valor !== 0 || /cliente|sem cobrança|incluso|atendimento/i.test(b.label))
                    .map((b) => (
                      <div key={b.label} className="flex justify-between gap-2">
                        <span className="text-slate-600">{b.label}</span>
                        <span className="font-bold text-[#111827]">{money(b.valor)}</span>
                      </div>
                    ))}
                </>
              ) : (
                <>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">
                  Mão de obra
                  <span className="block text-xs text-slate-400">
                    {servico.nome}
                    {qty > 1 ? ` · ${qty} un.` : ''}
                  </span>
                </span>
                <span className="text-right font-bold text-[#111827]">
                  {laborLocal.economia > 0 && (
                    <span className="mr-2 block text-xs font-semibold text-slate-400 line-through">
                      {money(laborLocal.total + laborLocal.economia)}
                    </span>
                  )}
                  {money(valorMaoObraDisplay)}
                </span>
              </div>

              {valorPecaCatalogo > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    {precoEfetivo?.valorMaterial
                      ? 'Material (capacidade × metragem)'
                      : precoEfetivo?.pecaNome ||
                        (modeloSel && varianteSel
                          ? `${modeloSel.nome} — ${varianteSel.labelCor}`
                          : materiaisCfg?.labelProduto || 'Fornecido pela empresa')}
                    {!precoEfetivo?.valorMaterial && (
                      <span className="block text-xs text-slate-400">
                        {precoEfetivo?.pecaNome
                          ? qty > 1
                            ? ` · ${qty} un.`
                            : ''
                          : modeloSel && varianteSel
                            ? `${modeloSel.nome} — ${varianteSel.labelCor}${qty > 1 ? ` · ${qty} un.` : ''}`
                            : qty > 1
                              ? ` · ${qty} un.`
                              : 'Peça / material (ABS)'}
                      </span>
                    )}
                    {precoEfetivo?.valorMaterial && (
                      <span className="block text-xs text-slate-400">
                        Conforme BTUs e metros respondidos
                      </span>
                    )}
                  </span>
                  <span className="text-right font-bold text-[#111827]">{money(valorPecaCatalogo)}</span>
                </div>
              )}

              {precisaMaterial && varianteSel && modeloSel && valorPecaCatalogo <= 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    {materiaisCfg?.labelProduto} (ABS)
                    <span className="block text-xs text-slate-400">
                      {modeloSel.nome} — {varianteSel.labelCor}
                      {qty > 1 ? ` · ${qty}` : ''}
                    </span>
                  </span>
                  <span className="font-bold text-[#111827]">
                    {money(
                      totalComDescontoAPartirDaSegunda(
                        toMoneyNumber(varianteSel.preco),
                        qty,
                        DESCONTO_SEGUNDA_UNIDADE_PERCENT
                      ).total
                    )}
                  </span>
                </div>
              )}

              {!valorPecaCatalogo &&
                (() => {
                  const perguntaForn = (fluxo?.perguntas || []).find(isFornecimento);
                  const respForn = perguntaForn ? respostas[perguntaForn.id] : '';
                  if (
                    respForn !== 'cliente' &&
                    respForn !== 'sim' &&
                    respForn !== 'cliente-fornece'
                  ) {
                    return null;
                  }
                  return (
                    <div className="flex justify-between gap-2 text-slate-500">
                      <span>
                        Material do cliente
                        <span className="block text-xs">Você já possui — sem cobrança de kit/metros</span>
                      </span>
                      <span className="font-bold">{money(0)}</span>
                    </div>
                  );
                })()}

              {Array.isArray(precoEfetivo?.breakdown) &&
                precoEfetivo!.breakdown
                  .filter(
                    (b) =>
                      b.valor > 0 &&
                      // Já mostrados em "mão de obra" / "material" acima — evita soma duplicada na UI
                      !/mão de obra|mao de obra|preço base|preco base|ajuste|peça|peca|material|kit|metros|total|desconto/i.test(
                        b.label
                      )
                  )
                  .map((b) => (
                    <div key={b.label} className="flex justify-between gap-2">
                      <span className="text-slate-600">{b.label}</span>
                      <span className="font-bold text-[#111827]">{money(b.valor)}</span>
                    </div>
                  ))}
                </>
              )}

              {descontoQtd > 0 && !usaMultiUnidade && (
                <p className="text-xs font-semibold text-emerald-700">
                  Desconto a partir da 2ª unidade: −{money(descontoQtd)}
                </p>
              )}
            </div>

            <p className="mt-3 text-[13px] font-semibold text-slate-500">
              Total a pagar{qty > 1 ? ` · ${qty} unidades` : ''}
            </p>
            <p className="text-[30px] font-black text-[#002d62]">{money(total)}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {valorPecaCatalogo > 0
                ? 'Inclui mão de obra + peça/material fornecido pela ABS, conforme as opções escolhidas.'
                : 'Valor da mão de obra. Peças da ABS só entram no total se você escolher fornecimento pela empresa.'}
            </p>
            {erroPerguntas && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroPerguntas}</p>
            )}
            <YellowButton className="mt-4 w-full" onClick={goCart}>
              Comprar e agendar
            </YellowButton>
            <button
              type="button"
              onClick={putInCart}
              className="mt-2 w-full rounded-lg border-2 border-[#002d62] py-3 text-sm font-black uppercase text-[#002d62]"
            >
              Adicionar ao carrinho {total > 0 ? money(total) : ''}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">Sem cadastro obrigatório. Login só se você quiser.</p>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-semibold text-[#002d62]">
              Precisa de algo diferente? Fale no WhatsApp
            </a>
          </div>
        </aside>
      </div>

      {pecas.length > 0 && (
        <RelatedRail
          title="Peças avulsas deste serviço"
          subtitle="Leve a peça agora e, se quiser, a instalação no mesmo pedido."
          servicos={pecas}
        />
      )}
      <RelatedRail
        title={`Mais da categoria ${servico.categoriaNome || ''}`}
        subtitle="Fica na mesma prateleira. Um clique e entra no pedido."
        servicos={sameCategory}
      />
    </div>
  );
}
