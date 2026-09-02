/** Google Tag / dataLayer — eventos de funil e conversão Google Ads */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GOOGLE_ADS_ID = 'AW-18328348632';

/** Snippet de conversão "Compra" — Google Ads */
export const GOOGLE_ADS_CONVERSION_SEND_TO =
  import.meta.env.VITE_GOOGLE_ADS_CONVERSION_SEND_TO ||
  'AW-18328348632/n-7cCKKM8ewcENjP0aNE';

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

/** Funil de abandono — nomes padronizados para GTM / Google Ads */
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
  pagamentoAprovado(params: {
    transaction_id: string;
    value: number;
    solicitacao_id?: string;
    pedido_id?: string;
    metodo?: string;
  }) {
    gtmPush('funil_pagamento_aprovado', {
      ...params,
      currency: 'BRL',
    });
  },
};

const CONVERSAO_STORAGE_PREFIX = 'abs-ads-conversao-';

function conversaoJaDisparada(transactionId: string): boolean {
  const key = `${CONVERSAO_STORAGE_PREFIX}${transactionId}`;
  try {
    if (localStorage.getItem(key) || sessionStorage.getItem(key)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function marcarConversaoDisparada(transactionId: string) {
  const key = `${CONVERSAO_STORAGE_PREFIX}${transactionId}`;
  try {
    localStorage.setItem(key, String(Date.now()));
    sessionStorage.setItem(key, '1');
  } catch {
    /* segue sem persistência */
  }
}

/**
 * Conversão Google Ads — somente após pagamento efetivamente confirmado.
 * Não chamar em: adicionar ao carrinho, "Comprar e Agendar", ou entrada no checkout.
 * Deduplica por transaction_id (localStorage) para não reenviar ao atualizar/reabrir a página.
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

  marcarConversaoDisparada(transactionId);

  funil.pagamentoAprovado({
    transaction_id: transactionId,
    value,
    solicitacao_id: params.solicitacao_id,
    pedido_id: params.pedido_id,
    metodo: params.metodo,
  });

  gtmPush('agendar_pagamento_confirmado', {
    transaction_id: transactionId,
    value,
    currency: 'BRL',
    solicitacao_id: params.solicitacao_id,
    pedido_id: params.pedido_id,
    metodo: params.metodo,
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
      value,
      currency: 'BRL',
      transaction_id: transactionId,
    });
  }
}
