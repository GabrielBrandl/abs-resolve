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
    // Aceita resposta na chave original ou em qualquer unidade (id__uN)
    const candidatas = Object.entries(respostas).filter(([k, v]) => {
      if (v == null || v === '') return false;
      return k === pergunta.id || k.startsWith(`${pergunta.id}__u`);
    });
    for (const [, resp] of candidatas) {
      const opcao = pergunta.opcoes.find((o) => o.id === resp);
      if (!opcao?.usarComoImagemPrincipal) continue;
      const url = String(opcao.imagemUrl || '').trim();
      if (url) escolhida = url;
    }
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
