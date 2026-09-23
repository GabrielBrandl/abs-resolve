/** Constantes do funil CRM (compartilhadas pelo serviço e controllers). */

export const ETAPAS_CRM = [
  'novo_lead',
  'contato_realizado',
  'qualificado',
  'proposta_enviada',
  'negociacao',
  'fechado',
  'perdido',
  'abandonou_qualificacao',
] as const;

export type EtapaCrm = (typeof ETAPAS_CRM)[number];

export const PROB_POR_ETAPA: Record<string, number> = {
  novo_lead: 10,
  contato_realizado: 20,
  qualificado: 40,
  proposta_enviada: 60,
  negociacao: 75,
  fechado: 100,
  perdido: 0,
  abandonou_qualificacao: 0,
};

export const LABEL_ETAPA: Record<string, string> = {
  novo_lead: 'Novo Lead',
  contato_realizado: 'Contato Realizado',
  qualificado: 'Qualificado',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
  abandonou_qualificacao: 'Abandonou Qualificação',
};

/** Etapas que contam como “já qualificado” (passou da triagem). */
export const ETAPAS_QUALIFICADO = [
  'qualificado',
  'proposta_enviada',
  'negociacao',
  'fechado',
] as const;

/** Etapas abertas no pipeline (não terminal). */
export const ETAPAS_ABERTAS = [
  'novo_lead',
  'contato_realizado',
  'qualificado',
  'proposta_enviada',
  'negociacao',
] as const;

export const MOTIVOS_ABANDONO = [
  'Não respondeu à triagem',
  'Não enviou fotos/vídeos',
  'Não enviou informações necessárias',
  'Parou de responder',
  'Contato inválido',
  'Serviço não identificado',
  'Outro',
] as const;

export const MOTIVOS_PERDA = [
  'Preço',
  'Fechou com concorrente',
  'Desistiu do serviço',
  'Prazo/agenda',
  'Forma de pagamento',
  'Não respondeu após orçamento',
  'Orçamento não aprovado',
  'Fora do escopo da ABS Resolve',
  'Fora da área de atendimento',
  'Sem disponibilidade da equipe',
  'Outro',
] as const;

export function isEtapaTerminal(etapa: string) {
  return etapa === 'fechado' || etapa === 'perdido' || etapa === 'abandonou_qualificacao';
}

export function isEtapaQualificado(etapa: string) {
  return (ETAPAS_QUALIFICADO as readonly string[]).includes(etapa);
}
