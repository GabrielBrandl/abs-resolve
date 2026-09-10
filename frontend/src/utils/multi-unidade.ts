import type { FluxoPerguntaShowIf } from './show-if';
import { isShowIfLegado, normalizarShowIf } from './show-if';

/** Chaves de resposta por unidade: perguntaId__u1, perguntaId__u2, … */

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

export function labelUnidadeServico(indice: number, labelBase = 'Unidade'): string {
  return `${labelBase} ${Math.max(1, Math.floor(indice))}`;
}

export function respostasDaUnidade(
  respostas: Record<string, unknown>,
  perguntas: Array<{ id: string; replicarPorUnidade?: boolean; papel?: string }>,
  unidade: number,
  perguntaQuantidadeId?: string | null
): Record<string, string> {
  const out: Record<string, string> = {};
  const qtdId = perguntaQuantidadeId || 'quantidade';

  for (const [k, v] of Object.entries(respostas)) {
    if (v == null || v === '') continue;
    const parsed = parseChaveUnidade(k);
    if (parsed) {
      if (parsed.unidade === unidade) out[parsed.perguntaId] = String(v);
      continue;
    }
    out[k] = String(v);
  }

  out[qtdId] = '1';
  out.quantidade = '1';

  for (const p of perguntas) {
    if (p.papel === 'quantidade' || !p.replicarPorUnidade) continue;
    const chave = chaveRespostaUnidade(p.id, unidade);
    if (respostas[chave] != null && respostas[chave] !== '') {
      out[p.id] = String(respostas[chave]);
    } else if (unidade === 1 && respostas[p.id] != null && respostas[p.id] !== '') {
      out[p.id] = String(respostas[p.id]);
    }
  }

  return out;
}

export type PerguntaExpandida<
  T extends {
    id: string;
    titulo: string;
    replicarPorUnidade?: boolean;
    papel?: string;
    showIf?: FluxoPerguntaShowIf;
  },
> = T & {
  perguntaIdOriginal: string;
  respostaKey: string;
  unidade?: number;
};

function remapShowIfUnidade(
  showIf: FluxoPerguntaShowIf | undefined,
  unidade: number,
  idsReplicados: Set<string>
): FluxoPerguntaShowIf | undefined {
  if (!showIf) return showIf;
  const remap = (pid: string) =>
    idsReplicados.has(pid) ? chaveRespostaUnidade(pid, unidade) : pid;

  if (isShowIfLegado(showIf)) {
    return { ...showIf, perguntaId: remap(showIf.perguntaId) };
  }
  const all = normalizarShowIf(showIf).map((c) => ({
    ...c,
    perguntaId: remap(c.perguntaId),
  }));
  // Mantém incompletas do editor se existirem em showIf.all
  const raw = Array.isArray(showIf.all) ? showIf.all : all;
  return {
    all: raw.map((c) => ({
      perguntaId: remap(String(c?.perguntaId || '')),
      opcaoIds: Array.isArray(c?.opcaoIds) ? c.opcaoIds : [],
    })),
  };
}

/** Expande perguntas replicáveis em N blocos para a UI. */
export function expandirPerguntasPorUnidade<
  T extends {
    id: string;
    titulo: string;
    replicarPorUnidade?: boolean;
    papel?: string;
    showIf?: FluxoPerguntaShowIf;
  },
>(perguntas: T[], quantidade: number, labelBase = 'Unidade'): PerguntaExpandida<T>[] {
  const qtd = Math.max(1, Math.floor(quantidade || 1));
  const out: PerguntaExpandida<T>[] = [];

  const compartilhadas = perguntas.filter((p) => p.papel === 'quantidade' || !p.replicarPorUnidade);
  const replicaveis = perguntas.filter((p) => p.replicarPorUnidade && p.papel !== 'quantidade');
  const idsReplicados = new Set(replicaveis.map((p) => p.id));

  for (const p of compartilhadas) {
    out.push({ ...p, perguntaIdOriginal: p.id, respostaKey: p.id });
  }

  if (!replicaveis.length) return out;

  for (let u = 1; u <= qtd; u++) {
    for (const p of replicaveis) {
      const key = qtd === 1 ? p.id : chaveRespostaUnidade(p.id, u);
      const showIf = qtd > 1 ? remapShowIfUnidade(p.showIf, u, idsReplicados) : p.showIf;
      out.push({
        ...p,
        id: key,
        titulo: qtd > 1 ? `${labelUnidadeServico(u, labelBase)} — ${p.titulo}` : p.titulo,
        showIf,
        perguntaIdOriginal: p.id,
        respostaKey: key,
        unidade: u,
      });
    }
  }

  return out;
}

export function migrarRespostasParaMultiUnidade(
  respostas: Record<string, string>,
  perguntas: Array<{ id: string; replicarPorUnidade?: boolean; papel?: string }>,
  quantidade: number
): Record<string, string> {
  if (quantidade <= 1) {
    // Volta de N→1: copia __u1 para a chave plain
    const next = { ...respostas };
    for (const p of perguntas) {
      if (!p.replicarPorUnidade || p.papel === 'quantidade') continue;
      const u1 = chaveRespostaUnidade(p.id, 1);
      if ((next[p.id] == null || next[p.id] === '') && next[u1] != null && next[u1] !== '') {
        next[p.id] = next[u1];
      }
    }
    return next;
  }
  const next = { ...respostas };
  for (const p of perguntas) {
    if (!p.replicarPorUnidade || p.papel === 'quantidade') continue;
    const u1 = chaveRespostaUnidade(p.id, 1);
    if ((next[u1] == null || next[u1] === '') && next[p.id] != null && next[p.id] !== '') {
      next[u1] = next[p.id];
    }
  }
  return next;
}
