export type ModoCobranca = 'fixo' | 'por_unidade';

export const MAPA_QUANTIDADE_OPCAO: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  'ate-3': 3,
  '4-6': 6,
  '7-10': 10,
  'mais-10': 11,
  'mais-4': 5,
  '4-ou-mais': 4,
  '3-ou-mais': 3,
  '5-ou-mais': 5,
  'ate-5': 5,
  'mais-5': 6,
};

export function parseQuantidadeOpcao(valor?: string | number | null): number | undefined {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
    return Math.max(1, Math.floor(valor));
  }
  if (valor == null) return undefined;
  const texto = String(valor).trim();
  if (!texto) return undefined;
  if (MAPA_QUANTIDADE_OPCAO[texto] !== undefined) return MAPA_QUANTIDADE_OPCAO[texto];
  const match = texto.match(/^\d+/);
  return match ? Number(match[0]) : undefined;
}

export function aplicarModoCobranca(valor: number, modo: ModoCobranca | undefined, quantidade: number): number {
  const v = Number(valor) || 0;
  if (!v) return 0;
  const qtd = Math.max(1, Math.floor(quantidade || 1));
  return modo === 'fixo' ? v : v * qtd;
}

export function resolverPerguntaQuantidadeId(
  perguntas: Array<{ id: string; papel?: string }>,
  perguntaQuantidadeId?: string | null
): string {
  if (perguntaQuantidadeId && perguntas.some((p) => p.id === perguntaQuantidadeId)) {
    return perguntaQuantidadeId;
  }
  const marcada = perguntas.find((p) => p.papel === 'quantidade');
  if (marcada) return marcada.id;
  if (perguntas.some((p) => p.id === 'quantidade')) return 'quantidade';
  return perguntas[0]?.id === 'quantidade' ? 'quantidade' : 'quantidade';
}

export function quantidadeDasRespostas(
  respostas: Record<string, unknown>,
  perguntaQuantidadeId: string,
  quantidadeExplícita?: number
): number {
  if (typeof quantidadeExplícita === 'number' && Number.isFinite(quantidadeExplícita) && quantidadeExplícita > 0) {
    return Math.max(1, Math.floor(quantidadeExplícita));
  }
  const bruto = respostas[perguntaQuantidadeId];
  const parsed = parseQuantidadeOpcao(
    Array.isArray(bruto) ? String(bruto[0]) : (bruto as string | number | null)
  );
  return parsed && parsed > 0 ? parsed : 1;
}
