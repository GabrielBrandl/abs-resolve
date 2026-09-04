/** Espelha backend/src/utils/preco-quantidade.ts — desconto a partir da 2ª unidade. */

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

export const DESCONTO_SEGUNDA_UNIDADE_PERCENT = 30;
