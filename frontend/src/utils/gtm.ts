/** Google Tag / dataLayer — eventos de funil e conversão Google Ads */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GOOGLE_ADS_ID = 'AW-18328348632';

/**
 * Ação principal de conversão Compra (1) no Google Ads.
 * Não usar o label de exemplo/teste n-7c… — só qa-2… (Compra).
 */
export const GOOGLE_ADS_CONVERSION_SEND_TO =
  import.meta.env.VITE_GOOGLE_ADS_CONVERSION_SEND_TO ||
  'AW-18328348632/qa-2CIKK6ewcENjP0aNE';

export function gtmPush(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...params,
  });
}

/** Etapas do fluxo de agendamento */
export const GTM_ETAPA: Record<string, string> = {
  catalogo: 'agendar_etapa_catalogo',
  carrinho: 'agendar_etapa_carrinho',
  dados: 'agendar_etapa_dados',
  questionario: 'agendar_etapa_questionario',
  resumo: 'agendar_etapa_resumo',
  fotos: 'agendar_etapa_fotos',
  pagamento: 'agendar_etapa_pagamento',
  aguardando: 'agendar_etapa_aguardando_pagamento',
  horario: 'agendar_etapa_horario',
  concluido: 'agendar_etapa_concluido',
};

export function gtmEtapaAgendar(step: string, extra?: Record<string, unknown>) {
  const event = GTM_ETAPA[step] || `agendar_etapa_${step}`;
  gtmPush(event, { etapa: step, ...extra });
}

/** Funil de abandono — nomes padronizados para GTM / Google Ads (não são conversão Compra) */
export const funil = {
  visualizouServico(params: { slug: string; nome?: string; categoria?: string }) {
    gtmPush('funil_visualizou_servico', params);
  },
  clicouComprarAgendar(params: {
    slug: string;
    nome?: string;
    origem?: string;
    valor?: number;
  }) {
    gtmPush('funil_clicou_comprar_agendar', params);
  },
  iniciouCheckout(params: { origem?: string; qtd_itens?: number; valor?: number }) {
    gtmPush('funil_iniciou_checkout', params);
  },
  selecionouHorario(params: {
    solicitacao_id?: string;
    data?: string;
    horario_inicio?: string;
  }) {
    gtmPush('funil_selecionou_horario', params);
  },
  iniciouPagamento(params: {
    solicitacao_id?: string;
    metodo?: string;
    valor?: number;
    parcelas?: number;
  }) {
    gtmPush('funil_iniciou_pagamento', params);
  },
};

const CONVERSAO_STORAGE_PREFIX = 'abs-ads-conversao-';
/** Lock síncrono em memória — evita race do polling (2 hits no Tag Assistant). */
const conversaoEmMemoria = new Set<string>();

function conversaoJaDisparada(transactionId: string): boolean {
  if (conversaoEmMemoria.has(transactionId)) return true;
  const key = `${CONVERSAO_STORAGE_PREFIX}${transactionId}`;
  try {
    if (localStorage.getItem(key) || sessionStorage.getItem(key)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function marcarConversaoDisparada(transactionId: string) {
  conversaoEmMemoria.add(transactionId);
  const key = `${CONVERSAO_STORAGE_PREFIX}${transactionId}`;
  try {
    localStorage.setItem(key, String(Date.now()));
    sessionStorage.setItem(key, '1');
  } catch {
    /* segue sem persistência */
  }
}

/**
 * Única implementação de conversão Google Ads "Compra".
 * Disparar somente após pagamento confirmado (RECEIVED / pago).
 * Deduplica por transaction_id (memória + localStorage) — uma vez por pedido.
 * Não empurra eventos dataLayer de "compra" para evitar segundo hit no Tag Assistant.
 */
export function gtmConversaoCompra(params: {
  transaction_id: string;
  value: number;
  solicitacao_id?: string;
  pedido_id?: string;
  metodo?: string;
}) {
  if (typeof window === 'undefined') return;
  const transactionId = String(params.transaction_id || '').trim();
  const value = Math.round(Number(params.value) * 100) / 100;
  if (!transactionId || !(value > 0)) return;
  if (conversaoJaDisparada(transactionId)) return;

  // Marca ANTES do gtag — impede duplicata se o polling disparar em paralelo
  marcarConversaoDisparada(transactionId);

  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
    value,
    currency: 'BRL',
    transaction_id: transactionId,
  });
}
