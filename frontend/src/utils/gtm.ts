/** Google Tag / dataLayer — eventos de funil e conversão Google Ads */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GOOGLE_ADS_ID = 'AW-18328348632';

/** Rótulo da ação de conversão (opcional). Ex.: AW-18328348632/AbCdEfGh */
export const GOOGLE_ADS_CONVERSION_SEND_TO =
  import.meta.env.VITE_GOOGLE_ADS_CONVERSION_SEND_TO || GOOGLE_ADS_ID;

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

/** Dispara conversão de compra no Google Ads — somente pagamento confirmado */
export function gtmConversaoCompra(params: {
  transaction_id: string;
  value: number;
  solicitacao_id?: string;
  pedido_id?: string;
  metodo?: string;
}) {
  if (typeof window === 'undefined') return;
  if (!params.transaction_id || params.value <= 0) return;

  const key = `${CONVERSAO_STORAGE_PREFIX}${params.transaction_id}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* segue sem deduplicação persistente */
  }

  funil.pagamentoAprovado({
    transaction_id: params.transaction_id,
    value: params.value,
    solicitacao_id: params.solicitacao_id,
    pedido_id: params.pedido_id,
    metodo: params.metodo,
  });

  gtmPush('agendar_pagamento_confirmado', {
    transaction_id: params.transaction_id,
    value: params.value,
    currency: 'BRL',
    solicitacao_id: params.solicitacao_id,
    pedido_id: params.pedido_id,
    metodo: params.metodo,
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: 'BRL',
    });

    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
      value: params.value,
      currency: 'BRL',
      transaction_id: params.transaction_id,
    });
  }
}
