/**
 * Resolve a imagem principal do serviço a partir das respostas do questionário.
 * Genérico: usa só flags/URL das opções (nunca slug/label hardcoded).
 * Independente de precificação.
 */
export function resolverImagemPrincipalPorRespostas(
  perguntas: Array<{
    id: string;
    opcoes: Array<{
      id: string;
      imagemUrl?: string | null;
      usarComoImagemPrincipal?: boolean;
    }>;
  }>,
  respostas: Record<string, string>,
  imagemPadrao?: string | null
): string | null {
  let escolhida: string | null = null;
  for (const pergunta of perguntas) {
    const resp = respostas[pergunta.id];
    if (resp == null || resp === '') continue;
    const opcao = pergunta.opcoes.find((o) => o.id === resp);
    if (!opcao?.usarComoImagemPrincipal) continue;
    const url = String(opcao.imagemUrl || '').trim();
    if (url) escolhida = url;
  }
  const padrao = String(imagemPadrao || '').trim();
  return escolhida || padrao || null;
}

/** Prefetch para troca sem piscar. */
export function prefetchImagem(url: string | null | undefined) {
  if (!url || typeof Image === 'undefined') return;
  const img = new Image();
  img.src = url;
}
