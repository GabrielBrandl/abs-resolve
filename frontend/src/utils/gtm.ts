/** Google Tag Manager — eventos personalizados (não genéricos "Click") */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

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
