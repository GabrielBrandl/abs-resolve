/** Parcelamento cartão: até Nx sem juros; acima disso aplica taxa mensal simples. */

export const PARCELAS_SEM_JUROS = Math.max(
  1,
  Math.min(12, Number(process.env.CARTAO_PARCELAS_SEM_JUROS || 3) || 3)
);

/** Taxa % ao mês aplicada a cada parcela acima do limite sem juros (ex.: 1.99). */
export const TAXA_JUROS_MES_PERCENT = Math.max(
  0,
  Number(process.env.CARTAO_JUROS_MES || '1.99') || 1.99
);

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

export function calcularParcelamento(valorBase: number, parcelas: number): CalculoParcelamento {
  const base = Math.max(0, Number(valorBase) || 0);
  const max = maxParcelasParaValor(base);
  const n = Math.max(1, Math.min(max, Math.floor(parcelas || 1)));
  const semJuros = n <= PARCELAS_SEM_JUROS;
  const extras = Math.max(0, n - PARCELAS_SEM_JUROS);
  const total = semJuros
    ? round2(base)
    : round2(base * (1 + (TAXA_JUROS_MES_PERCENT / 100) * extras));
  const valorJuros = round2(Math.max(0, total - base));
  const valorParcela = round2(total / n);

  return {
    parcelas: n,
    valorBase: round2(base),
    total,
    valorParcela,
    valorJuros,
    semJuros,
    taxaMesPercent: TAXA_JUROS_MES_PERCENT,
    parcelasSemJuros: PARCELAS_SEM_JUROS,
  };
}

export function configParcelamentoPublica() {
  return {
    parcelasSemJuros: PARCELAS_SEM_JUROS,
    taxaJurosMesPercent: TAXA_JUROS_MES_PERCENT,
  };
}
