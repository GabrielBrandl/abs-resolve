function normalizeSearch(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SEARCH_SYNONYMS = {
  tomada: ['tom', 'toma', 'tomadas', 'plugue', 'plug'],
  interruptor: ['interrup', 'interruptores'],
  peca: ['pecas', 'pecas', 'avulsa', 'produto'],
  chuveiro: ['ducha', 'banho'],
};

const SLUG_KEYWORDS = {
  'troca-tomada': ['tomada', 'tom'],
  'troca-interruptor': ['interruptor'],
  'instalacao-chuveiro': ['chuveiro', 'ducha'],
};

function expandToken(token) {
  const extra = new Set([token]);
  for (const [key, aliases] of Object.entries(SEARCH_SYNONYMS)) {
    const group = [key, ...aliases];
    if (group.some((a) => a === token || a.startsWith(token) || (token.length >= 2 && token.startsWith(a)))) {
      group.forEach((a) => extra.add(a));
    }
  }
  return [...extra];
}

function searchScore(item, query) {
  const nq = normalizeSearch(query);
  if (!nq) return 1;
  const hay = normalizeSearch(
    [item.nome, item.slug.replace(/-/g, ' '), item.tipo || '', ...(item.keywords || []), ...(SLUG_KEYWORDS[item.slug] || [])].join(' ')
  );
  const words = hay.split(/\s+/).filter(Boolean);
  if (hay.includes(nq) || words.some((w) => w.startsWith(nq))) return 90;
  const tokens = nq.split(/\s+/).filter((t) => t.length >= 2);
  let hits = 0;
  for (const token of tokens) {
    const expanded = expandToken(token);
    if (expanded.some((e) => e.length >= 2 && (hay.includes(e) || words.some((w) => w.startsWith(e))))) hits += 1;
  }
  return hits ? 70 : 0;
}

function searchItems(items, query) {
  return items
    .map((item) => ({ item, score: searchScore(item, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

const items = [
  { slug: 'troca-tomada', nome: 'Troca de tomada', tipo: 'servico', keywords: ['tomada', 'tom'] },
  { slug: 'troca-interruptor', nome: 'Troca de interruptor', tipo: 'servico', keywords: ['interruptor'] },
  { slug: 'instalacao-chuveiro', nome: 'Instalação de chuveiro', tipo: 'servico', keywords: ['chuveiro'] },
  { slug: 'peca-tomada-simples', nome: 'Tomada 10A simples', tipo: 'peca', keywords: ['tomada', 'tom', 'peca'] },
  { slug: 'peca-tomada-20a', nome: 'Tomada 20A', tipo: 'peca', keywords: ['tomada', 'tom', '20a'] },
  { slug: 'peca-interruptor-simples', nome: 'Interruptor simples', tipo: 'peca', keywords: ['interruptor', 'peca'] },
];

function slugs(q) {
  return searchItems(items, q).map((r) => r.item.slug);
}

const checks = [
  ['tom', ['troca-tomada', 'peca-tomada-simples', 'peca-tomada-20a']],
  ['tomada', ['troca-tomada', 'peca-tomada-simples']],
  ['interruptor', ['troca-interruptor', 'peca-interruptor-simples']],
  ['peca', ['peca-tomada-simples', 'peca-tomada-20a', 'peca-interruptor-simples']],
  ['chuveiro', ['instalacao-chuveiro']],
];

let failed = 0;
for (const [q, expected] of checks) {
  const got = slugs(q);
  const ok = expected.every((s) => got.includes(s));
  if (!ok) {
    failed += 1;
    console.error(`FALHOU "${q}": esperado ${expected.join(', ')} | obtido ${got.join(', ') || '(vazio)'}`);
  } else {
    console.log(`OK "${q}" -> ${got.join(', ')}`);
  }
}

if (failed) process.exit(1);
console.log('Busca verificada: tom/tomada/interruptor/peça/chuveiro retornam itens relacionados.');
