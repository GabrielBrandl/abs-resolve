/**
 * Preço de vitrine (“A partir de”) derivado da config do questionário.
 * Genérico: qualquer serviço com faixas progressivas ou precoBase no fluxo.
 */
export function precoMinimoVitrineDeFluxo(opts: {
  perguntas?: Array<{ precosPorQuantidade?: Record<string, number> | null }> | null;
  precoBase?: number | null;
}): number | null {
  const tiers: number[] = [];
  for (const p of opts.perguntas || []) {
    const mapa = p.precosPorQuantidade;
    if (!mapa || typeof mapa !== 'object') continue;
    for (const v of Object.values(mapa)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) tiers.push(n);
    }
  }
  if (tiers.length) {
    return Math.round(Math.min(...tiers) * 100) / 100;
  }
  const base = Number(opts.precoBase);
  if (Number.isFinite(base) && base > 0) {
    return Math.round(base * 100) / 100;
  }
  return null;
}

export function textoPrecoAPartirDe(valor: number): string {
  const v = Math.round(Number(valor) * 100) / 100;
  const fmt = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `A partir de R$ ${fmt}`;
}
