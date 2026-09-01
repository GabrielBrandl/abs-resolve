export function normalizeSearch(input: string) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Sinônimos e prefixos. "tom" encontra tomada, peças e o serviço de troca. */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  tomada: ['tom', 'toma', 'tomadas', 'plugue', 'plug', 'outlet', 'ponto eletrico', '2p t', '10a', '20a'],
  interruptor: ['interrup', 'interruptores', 'switch', 'botao de luz', 'botao'],
  disjuntor: ['disjuntores', 'breaker', 'quadro de energia', 'quadro eletrico'],
  chuveiro: ['ducha', 'ducha eletrica', 'banho', 'resistencia'],
  torneira: ['torneiras', 'misturador', 'monocomando', 'cuba'],
  registro: ['registros', 'valvula', 'gaveta'],
  vazamento: ['vazar', 'infiltracao', 'pingando', 'cano'],
  desentupimento: ['desentupir', 'entupida', 'entupido', 'esgoto'],
  luminaria: ['luminarias', 'luz', 'lampada', 'lustre', 'plafon', 'spot'],
  ventilador: ['ventiladores', 'vent'],
  suporte: ['suportes', 'tv', 'televisao', 'televisor'],
  prateleira: ['prateleiras', 'nichos'],
  movel: ['moveis', 'montagem', 'guarda roupa'],
  persiana: ['persianas', 'cortina'],
  ar: ['arcondicionado', 'split', 'climatizacao', 'ar condicionado'],
  jardim: ['poda', 'grama', 'planta', 'jardinagem'],
  limpeza: ['pos obra', 'obra', 'faxina'],
  peca: ['pecas', 'pecas', 'avulsa', 'avulso', 'produto', 'material', 'peca avulsa'],
  empresarial: ['empresa', 'comercial', 'escritorio', 'loja', 'comercio'],
};

export const SLUG_KEYWORDS: Record<string, string[]> = {
  'troca-tomada': ['tomada', 'tom', 'plugue', 'eletrica', 'eletricista', '10a', '20a'],
  'troca-interruptor': ['interruptor', 'luz', 'botao', 'eletrica'],
  'instalacao-chuveiro': ['chuveiro', 'ducha', 'banho', 'eletrica'],
  'troca-disjuntor': ['disjuntor', 'quadro', 'energia'],
  'instalacao-luminaria': ['luminaria', 'lustre', 'lampada', 'plafon'],
  'instalacao-ventilador-teto': ['ventilador', 'teto'],
  'troca-torneira': ['torneira', 'pia', 'hidraulica'],
  'troca-registro': ['registro', 'valvula', 'hidraulica'],
  'reparo-vazamento': ['vazamento', 'cano', 'infiltracao'],
  'desentupimento-pia': ['desentupimento', 'pia', 'cozinha'],
  'desentupimento-vaso': ['desentupimento', 'vaso', 'banheiro'],
  'instalacao-suporte-tv': ['tv', 'suporte', 'televisao'],
  'instalacao-prateleira': ['prateleira', 'nicho'],
  'limpeza-ar-split': ['ar', 'split', 'limpeza', 'filtro'],
  'instalacao-ar-split': ['ar', 'split', 'instalacao'],
};

function expandToken(token: string) {
  const extra = new Set<string>([token]);
  for (const [key, aliases] of Object.entries(SEARCH_SYNONYMS)) {
    const group = [key, ...aliases];
    if (group.some((a) => a === token || a.startsWith(token) || (token.length >= 2 && token.startsWith(a)))) {
      group.forEach((a) => extra.add(a));
    }
  }
  return Array.from(extra);
}

export type SearchableItem = {
  slug: string;
  nome: string;
  categoria?: string;
  descricao?: string | null;
  keywords?: string[];
  tipo?: string;
  servicoRelacionado?: string;
};

export function searchScore(item: SearchableItem, query: string) {
  const nq = normalizeSearch(query);
  if (!nq) return 1;

  const hay = normalizeSearch(
    [
      item.nome,
      item.slug.replace(/-/g, ' '),
      item.descricao || '',
      item.categoria || '',
      item.tipo || '',
      ...(item.keywords || []),
      ...(SLUG_KEYWORDS[item.slug] || []),
    ].join(' ')
  );
  const words = hay.split(/\s+/).filter(Boolean);

  if (hay === nq) return 100;
  if (hay.includes(nq)) return 92;
  if (words.some((w) => w.startsWith(nq))) return 88;

  const tokens = nq.split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return 0;
  let hits = 0;
  for (const token of tokens) {
    const expanded = expandToken(token);
    const ok =
      hay.includes(token) ||
      words.some((w) => w.startsWith(token)) ||
      expanded.some((e) => e.length >= 2 && (hay.includes(e) || words.some((w) => w.startsWith(e))));
    if (ok) hits += 1;
  }
  if (!hits) return 0;
  return hits === tokens.length ? 75 : Math.round(45 * (hits / tokens.length));
}

export function searchItems<T extends SearchableItem>(items: T[], query: string) {
  const term = query.trim();
  if (!term) return items.map((item) => ({ item, score: 1 }));
  return items
    .map((item) => ({ item, score: searchScore(item, term) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.nome.localeCompare(b.item.nome, 'pt-BR'));
}
