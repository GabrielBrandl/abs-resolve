/** Respostas e perguntas replicadas por unidade do serviço (genérico). */

export const SUFIXO_UNIDADE = '__u';

export function chaveRespostaUnidade(perguntaId: string, unidade: number): string {
  return `${perguntaId}${SUFIXO_UNIDADE}${Math.max(1, Math.floor(unidade))}`;
}

export function parseChaveUnidade(
  chave: string
): { perguntaId: string; unidade: number } | null {
  const m = String(chave).match(/^(.*)__u(\d+)$/);
  if (!m) return null;
  return { perguntaId: m[1], unidade: Number(m[2]) };
}

export function temReplicacaoPorUnidade(
  perguntas: Array<{ replicarPorUnidade?: boolean; papel?: string }>
): boolean {
  return perguntas.some((p) => Boolean(p.replicarPorUnidade) && p.papel !== 'quantidade');
}

/**
 * Monta respostas de uma unidade: compartilhadas (sem sufixo) + específicas `__uN`.
 * Preferência: valor da unidade sobrescreve o compartilhamento no mesmo id.
 */
export function respostasDaUnidade(
  respostas: Record<string, unknown>,
  perguntas: Array<{ id: string; replicarPorUnidade?: boolean; papel?: string }>,
  unidade: number,
  perguntaQuantidadeId?: string | null
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const qtdId = perguntaQuantidadeId || 'quantidade';

  for (const [k, v] of Object.entries(respostas)) {
    const parsed = parseChaveUnidade(k);
    if (parsed) {
      if (parsed.unidade === unidade) out[parsed.perguntaId] = v;
      continue;
    }
    // resposta sem sufixo = compartilhada (ou unidade 1 legada)
    out[k] = v;
  }

  // Garante quantidade = 1 no cálculo unitário (cada aparelho é 1)
  out[qtdId] = '1';
  out.quantidade = '1';

  // Overlay explícito das chaves da unidade
  for (const p of perguntas) {
    if (p.papel === 'quantidade') continue;
    if (!p.replicarPorUnidade) continue;
    const chave = chaveRespostaUnidade(p.id, unidade);
    if (respostas[chave] != null && respostas[chave] !== '') {
      out[p.id] = respostas[chave];
    } else if (unidade === 1 && respostas[p.id] != null && respostas[p.id] !== '') {
      // compat: 1ª unidade pode ter sido salva sem sufixo
      out[p.id] = respostas[p.id];
    }
  }

  return out;
}

export function labelUnidadeServico(indice: number, labelBase = 'Unidade'): string {
  return `${labelBase} ${Math.max(1, Math.floor(indice))}`;
}
