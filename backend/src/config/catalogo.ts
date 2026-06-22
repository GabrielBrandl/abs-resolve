/** Catálogo ABS Resolve Já — serviços Tipo A (preço fixo) e Tipo B (IA) */

export const SERVICOS_TIPO_A = ['tomada', 'interruptor'] as const;
export const SERVICOS_TIPO_B = ['disjuntor', 'chuveiro', 'luminaria', 'ventilador', 'registro', 'ar-condicionado'] as const;

export const PONTUACAO_SERVICO: Record<string, number> = {
  tomada: 1,
  interruptor: 1,
  disjuntor: 1,
  chuveiro: 2,
  ventilador: 2,
  luminaria: 2,
  registro: 2,
  'ar-condicionado': 4,
};

export const PRECO_FIXO_TOMADA: Record<string, number> = {
  simples_10a: 149,
  simples_20a: 159,
  dupla_10a: 169,
  dupla_20a: 179,
};

export const PRECO_FIXO_INTERRUPTOR: Record<string, number> = {
  simples: 149,
  duplo: 159,
  triplo: 169,
};

export const UPSELLS: Record<string, Array<{ id: string; nome: string; preco: number }>> = {
  tomada: [
    { id: 'tomada_premium', nome: 'Tomada Premium', preco: 39 },
    { id: 'tomada_usb', nome: 'Tomada USB', preco: 59 },
    { id: 'protecao_infantil', nome: 'Proteção infantil', preco: 19 },
  ],
  interruptor: [
    { id: 'linha_premium', nome: 'Linha premium', preco: 49 },
    { id: 'inteligente', nome: 'Interruptor inteligente', preco: 199 },
  ],
  chuveiro: [
    { id: 'economico', nome: 'Chuveiro econômico', preco: 89 },
    { id: 'premium', nome: 'Chuveiro premium', preco: 249 },
    { id: 'digital', nome: 'Chuveiro digital', preco: 399 },
  ],
  'ar-condicionado': [
    { id: 'higienizacao', nome: 'Higienização', preco: 149 },
    { id: 'protecao_eletrica', nome: 'Proteção elétrica', preco: 99 },
    { id: 'disjuntor_dedicado', nome: 'Disjuntor dedicado', preco: 179 },
  ],
};

export const HORARIOS_PADRAO = [
  { inicio: '08:00', fim: '10:00' },
  { inicio: '10:00', fim: '12:00' },
  { inicio: '14:00', fim: '16:00' },
  { inicio: '16:00', fim: '18:00' },
];

export const CUSTO_OPERACIONAL_BASE: Record<string, number> = {
  disjuntor: 45,
  chuveiro: 80,
  luminaria: 60,
  ventilador: 70,
  registro: 55,
  'ar-condicionado': 200,
};

export const CUSTO_PRODUTO_NIVEL: Record<number, number> = {
  1: 30,
  2: 65,
  3: 120,
};
