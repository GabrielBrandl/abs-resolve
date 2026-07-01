const CAMPOS_FOTO_CHECKLIST = ['fotoAntes', 'fotoDepois', 'fotoConclusao', 'assinaturaCliente'] as const;

export function fotosDoChecklist(checklist?: Record<string, string> | null): string[] {
  if (!checklist) return [];
  return CAMPOS_FOTO_CHECKLIST.map((k) => checklist[k]).filter((u): u is string => Boolean(u));
}

export function fotosDeJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
}

export function fotosDaSolicitacao(sol: { fotos?: unknown; opcoes?: unknown }): string[] {
  const diretas = fotosDeJson(sol.fotos);
  if (diretas.length) return diretas;
  const opcoes = sol.opcoes as { fotosCliente?: string[]; fotosPorItem?: Record<string, string[]> } | undefined;
  if (opcoes?.fotosCliente?.length) return opcoes.fotosCliente;
  if (opcoes?.fotosPorItem) return [...new Set(Object.values(opcoes.fotosPorItem).flat())];
  return [];
}
