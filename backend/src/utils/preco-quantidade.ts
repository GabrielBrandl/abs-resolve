export type ModoCobranca = 'fixo' | 'por_unidade';

export const MAPA_QUANTIDADE_OPCAO: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  'ate-3': 3,
  '4-6': 6,
  '7-10': 10,
  'mais-10': 11,
  'mais-4': 5,
  '4-ou-mais': 4,
  '3-ou-mais': 3,
  '5-ou-mais': 5,
  'ate-5': 5,
  'mais-5': 6,
};

export function parseQuantidadeOpcao(valor?: string | number | null): number | undefined {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
    return Math.max(1, Math.floor(valor));
  }
  if (valor == null) return undefined;
  const texto = String(valor).trim();
  if (!texto) return undefined;
  if (MAPA_QUANTIDADE_OPCAO[texto] !== undefined) return MAPA_QUANTIDADE_OPCAO[texto];
  const match = texto.match(/^\d+/);
  return match ? Number(match[0]) : undefined;
}

export function aplicarModoCobranca(valor: number, modo: ModoCobranca | undefined, quantidade: number): number {
  const v = Number(valor) || 0;
  if (!v) return 0;
  const qtd = Math.max(1, Math.floor(quantidade || 1));
  return modo === 'fixo' ? v : v * qtd;
}

/**
 * Desconto a partir da 2ª unidade (serviço ou peça):
 * 1ª unidade = preço cheio; unidades extras = percentual de desconto (padrão 30%).
 */
export function totalComDescontoAPartirDaSegunda(
  unitario: number,
  quantidade: number,
  percentualExtras = 30
): { total: number; economia: number; precoCheio: number; unitarioExtra: number } {
  const u = Math.max(0, Number(unitario) || 0);
  const n = Math.max(1, Math.floor(Number(quantidade) || 1));
  const precoCheio = Math.round(u * n * 100) / 100;
  if (n <= 1) {
    return { total: Math.round(u * 100) / 100, economia: 0, precoCheio, unitarioExtra: u };
  }
  const pct = Number.isFinite(percentualExtras) ? Math.max(0, Math.min(100, percentualExtras)) : 30;
  const fator = 1 - pct / 100;
  const unitarioExtra = Math.round(u * fator * 100) / 100;
  const total = Math.round((u + (n - 1) * unitarioExtra) * 100) / 100;
  return {
    total,
    economia: Math.max(0, Math.round((precoCheio - total) * 100) / 100),
    precoCheio,
    unitarioExtra,
  };
}

/** Percentual padrão do desconto a partir da 2ª unidade (peça/material). */
export function descontoAPartirDaSegundaPercent(): number {
  const raw = Number(process.env.DESCONTO_SEGUNDA_UNIDADE_PERCENT ?? 30);
  return Number.isFinite(raw) && raw >= 0 ? raw : 30;
}

export function resolverPerguntaQuantidadeId(
  perguntas: Array<{ id: string; papel?: string }>,
  perguntaQuantidadeId?: string | null
): string {
  if (perguntaQuantidadeId && perguntas.some((p) => p.id === perguntaQuantidadeId)) {
    return perguntaQuantidadeId;
  }
  const marcada = perguntas.find((p) => p.papel === 'quantidade');
  if (marcada) return marcada.id;
  if (perguntas.some((p) => p.id === 'quantidade')) return 'quantidade';
  return perguntas[0]?.id === 'quantidade' ? 'quantidade' : 'quantidade';
}

export function quantidadeDasRespostas(
  respostas: Record<string, unknown>,
  perguntaQuantidadeId: string,
  quantidadeExplícita?: number
): number {
  if (typeof quantidadeExplícita === 'number' && Number.isFinite(quantidadeExplícita) && quantidadeExplícita > 0) {
    return Math.max(1, Math.floor(quantidadeExplícita));
  }
  const bruto = respostas[perguntaQuantidadeId];
  const parsed = parseQuantidadeOpcao(
    Array.isArray(bruto) ? String(bruto[0]) : (bruto as string | number | null)
  );
  return parsed && parsed > 0 ? parsed : 1;
}
