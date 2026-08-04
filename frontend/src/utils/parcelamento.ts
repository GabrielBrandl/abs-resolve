/** Espelho da regra do backend (parcelamento.ts) para o checkout do cliente. */

export const PARCELAS_SEM_JUROS = 3;
export const TAXA_JUROS_MES_PERCENT_DEFAULT = 1.99;

export interface CalculoParcelamento {
  parcelas: number;
  valorBase: number;
  total: number;
  valorParcela: number;
  valorJuros: number;
  semJuros: boolean;
  taxaMesPercent: number;
  parcelasSemJuros: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function maxParcelasParaValor(valorBase: number): number {
  if (valorBase >= 100) return 12;
  if (valorBase >= 50) return 6;
  return 3;
}

export function calcularParcelamento(
  valorBase: number,
  parcelas: number,
  opts?: { parcelasSemJuros?: number; taxaJurosMesPercent?: number }
): CalculoParcelamento {
  const base = Math.max(0, Number(valorBase) || 0);
  const semJurosLimite = opts?.parcelasSemJuros ?? PARCELAS_SEM_JUROS;
  const taxa = opts?.taxaJurosMesPercent ?? TAXA_JUROS_MES_PERCENT_DEFAULT;
  const max = maxParcelasParaValor(base);
  const n = Math.max(1, Math.min(max, Math.floor(parcelas || 1)));
  const semJuros = n <= semJurosLimite;
  const extras = Math.max(0, n - semJurosLimite);
  const total = semJuros ? round2(base) : round2(base * (1 + (taxa / 100) * extras));
  return {
    parcelas: n,
    valorBase: round2(base),
    total,
    valorParcela: round2(total / n),
    valorJuros: round2(Math.max(0, total - base)),
    semJuros,
    taxaMesPercent: taxa,
    parcelasSemJuros: semJurosLimite,
  };
}
