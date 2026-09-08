/** Normaliza capa + galeria em uma lista única de URLs. */
export function normalizarGaleria(
  imagemUrl?: string | null,
  imagens?: unknown
): string[] {
  const lista: string[] = [];
  const push = (u?: string | null) => {
    const url = String(u || '').trim();
    if (!url || url.includes('undefined')) return;
    if (!lista.includes(url)) lista.push(url);
  };

  if (Array.isArray(imagens)) {
    for (const item of imagens) push(typeof item === 'string' ? item : null);
  }

  push(imagemUrl);

  // Capa primeiro
  if (imagemUrl && lista.includes(imagemUrl)) {
    return [imagemUrl, ...lista.filter((u) => u !== imagemUrl)];
  }
  return lista;
}

export function capaDaGaleria(imagemUrl?: string | null, imagens?: unknown): string | null {
  const g = normalizarGaleria(imagemUrl, imagens);
  return g[0] || null;
}
