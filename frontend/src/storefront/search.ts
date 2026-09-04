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
  if (token.length < 3) return [token];
  const extra = new Set<string>([token]);
  for (const [key, aliases] of Object.entries(SEARCH_SYNONYMS)) {
    const group = [key, ...aliases];
    // Só expande se o token for prefixo claro de um termo do grupo (mín. 3 chars)
    if (group.some((a) => a === token || (a.length >= 3 && a.startsWith(token)))) {
      group.forEach((a) => {
        if (a.length >= 3) extra.add(a);
      });
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
  if (!nq) return 0;

  const nome = normalizeSearch(item.nome);
  const slug = normalizeSearch(item.slug.replace(/-/g, ' '));
  const keywords = normalizeSearch(
    [...(item.keywords || []), ...(SLUG_KEYWORDS[item.slug] || [])].join(' ')
  );
  const nomeWords = nome.split(/\s+/).filter(Boolean);

  if (nome === nq || slug === nq) return 100;
  if (nome.startsWith(nq) || nomeWords.some((w) => w.startsWith(nq))) return 95;
  if (nome.includes(nq)) return 90;
  if (slug.includes(nq)) return 85;
  if (keywords.split(/\s+/).some((w) => w === nq || w.startsWith(nq))) return 80;

  const tokens = nq.split(/\s+/).filter((t) => t.length >= 3);
  if (!tokens.length) {
    // Query curta (2 letras): só aceita prefixo do nome
    if (nq.length === 2 && nomeWords.some((w) => w.startsWith(nq))) return 78;
    return 0;
  }

  let hits = 0;
  for (const token of tokens) {
    const expanded = expandToken(token);
    const ok =
      nome.includes(token) ||
      nomeWords.some((w) => w.startsWith(token)) ||
      slug.includes(token) ||
      expanded.some(
        (e) =>
          e.length >= 3 &&
          (nome.includes(e) || nomeWords.some((w) => w.startsWith(e)) || keywords.split(/\s+/).includes(e))
      );
    if (ok) hits += 1;
  }
  if (!hits) return 0;
  if (hits === tokens.length) return 75;
  // Exige maioria dos tokens para não listar lixo
  if (hits / tokens.length >= 0.67) return Math.round(55 * (hits / tokens.length));
  return 0;
}

export function searchItems<T extends SearchableItem>(items: T[], query: string) {
  const term = query.trim();
  if (!term) return items.map((item) => ({ item, score: 1 }));
  return items
    .map((item) => ({ item, score: searchScore(item, term) }))
    .filter((r) => r.score >= 55)
    .sort((a, b) => b.score - a.score || a.item.nome.localeCompare(b.item.nome, 'pt-BR'));
}
