/** Condições de exibição de perguntas (genérico, lógica E / AND). */

export type ShowIfCondicao = {
  perguntaId: string;
  opcaoIds: string[];
};

/** Formato legado (1 condição) ou novo `{ all: [...] }`. */
export type FluxoPerguntaShowIf = ShowIfCondicao | { all: ShowIfCondicao[] };

export function isShowIfLegado(showIf: FluxoPerguntaShowIf): showIf is ShowIfCondicao {
  return 'perguntaId' in showIf && !('all' in showIf);
}

export function normalizarShowIf(
  showIf: FluxoPerguntaShowIf | null | undefined
): ShowIfCondicao[] {
  if (!showIf) return [];
  const raw = isShowIfLegado(showIf)
    ? [showIf]
    : Array.isArray(showIf.all)
      ? showIf.all
      : [];
  return raw
    .map((c) => ({
      perguntaId: String(c?.perguntaId || '').trim(),
      opcaoIds: Array.isArray(c?.opcaoIds)
        ? c.opcaoIds.map(String).filter(Boolean)
        : [],
    }))
    .filter((c) => c.perguntaId && c.opcaoIds.length > 0);
}

/** Para edição no admin: sempre lista (mesmo incompleta). */
export function showIfParaEdicao(
  showIf: FluxoPerguntaShowIf | null | undefined
): Array<{ perguntaId: string; opcaoIds: string[] }> {
  if (!showIf) return [];
  if (isShowIfLegado(showIf)) {
    return [{ perguntaId: showIf.perguntaId || '', opcaoIds: showIf.opcaoIds || [] }];
  }
  return (showIf.all || []).map((c) => ({
    perguntaId: c?.perguntaId || '',
    opcaoIds: Array.isArray(c?.opcaoIds) ? c.opcaoIds : [],
  }));
}

export function serializarShowIf(
  condicoes: Array<{ perguntaId?: string; opcaoIds?: string[] } | null | undefined>
): FluxoPerguntaShowIf | undefined {
  const limpas = (condicoes || [])
    .map((c) => ({
      perguntaId: String(c?.perguntaId || '').trim(),
      opcaoIds: Array.isArray(c?.opcaoIds) ? c!.opcaoIds.map(String).filter(Boolean) : [],
    }))
    .filter((c) => c.perguntaId);
  if (!limpas.length) return undefined;
  if (limpas.length === 1 && limpas[0].opcaoIds.length) {
    return { perguntaId: limpas[0].perguntaId, opcaoIds: limpas[0].opcaoIds };
  }
  // Mantém incompletas no all para o admin poder editar; runtime filtra via normalizarShowIf
  return { all: limpas };
}

function respostaContemOpcao(
  respostas: Record<string, unknown>,
  perguntaId: string,
  opcaoIds: string[]
): boolean {
  const val = respostas[perguntaId];
  if (val == null || val === '') return false;
  const selected = Array.isArray(val) ? val.map(String) : [String(val)];
  return opcaoIds.some((id) => selected.includes(String(id)));
}

export function avaliarShowIf(
  showIf: FluxoPerguntaShowIf | null | undefined,
  respostas: Record<string, unknown>
): boolean {
  const conds = normalizarShowIf(showIf);
  if (!conds.length) return true;
  return conds.every((c) => respostaContemOpcao(respostas, c.perguntaId, c.opcaoIds));
}

export function perguntaVisivelPorShowIf(
  pergunta: { showIf?: FluxoPerguntaShowIf | null } | null | undefined,
  respostas: Record<string, unknown>
): boolean {
  return avaliarShowIf(pergunta?.showIf, respostas);
}
