import { CASHBACK_PCT } from './constants';

export type ServicoLoja = {
  id?: string;
  slug: string;
  nome: string;
  categoria: string;
  precoMinimo: number | null;
  precoTexto: string | null;
  tipoPreco: string;
  descricao: string | null;
  garantiaDias: number;
  imagemUrl: string | null;
  pontos?: number;
  relacionados?: string[];
};

export type CategoriaLoja = {
  slug: string;
  nome: string;
  icone: string;
  cor: string;
  servicos: ServicoLoja[];
};

export function money(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function cashbackOf(price: number | string | null | undefined, pct = CASHBACK_PCT) {
  return Math.round(Number(price || 0) * pct * 100) / 100;
}

export function priceAfterCashback(price: number | null | undefined, pct = CASHBACK_PCT) {
  const p = Number(price || 0);
  return Math.max(0, Math.round((p - cashbackOf(p, pct)) * 100) / 100);
}

const FOTO_CATEGORIA: Record<string, string> = {
  eletricista: '/servicos/troca-tomada.webp',
  hidraulica: '/servicos/troca-torneira.webp',
  montador: '/servicos/instalacao-suporte-tv.webp',
  'ar-condicionado': '/servicos/limpeza-ar-split.webp',
  jardinagem: '/servicos/poda-jardim.webp',
  'limpeza-pos-obra': '/servicos/limpeza-pos-obra.webp',
};

/** Sempre devolve uma foto válida. Nunca usa o nome do serviço no lugar da imagem. */
export function fotoServico(s: { slug?: string; categoria?: string; imagemUrl?: string | null }) {
  const slug = s.slug || '';
  if (slug.includes('ar') && slug.includes('caixa')) return '/servicos/limpeza-ar-split.webp';
  if (s.imagemUrl && !s.imagemUrl.includes('undefined')) return s.imagemUrl;
  if (slug) return `/servicos/${slug}.webp`;
  return FOTO_CATEGORIA[s.categoria || ''] || '/servicos/troca-tomada.webp';
}

export function fallbackFotoServico(s: { slug?: string; categoria?: string }) {
  if (s.categoria && FOTO_CATEGORIA[s.categoria]) return FOTO_CATEGORIA[s.categoria];
  if (s.slug) return `/servicos/${s.slug}.webp`;
  return '/servicos/limpeza-ar-split.webp';
}

export function flattenServices(cats: CategoriaLoja[]) {
  return cats.flatMap((c) => c.servicos.map((s) => ({ ...s, categoriaNome: c.nome, icone: c.icone })));
}

export function findService(cats: CategoriaLoja[], slug: string) {
  for (const c of cats) {
    const found = c.servicos.find((s) => s.slug === slug);
    if (found) return { ...found, categoriaNome: c.nome, icone: c.icone };
  }
  return null;
}

/** Quem contratou X também levou Y — combina na mesma visita. */
export const FREQUENTLY_TOGETHER: Record<string, string[]> = {
  'troca-tomada': ['troca-interruptor', 'instalacao-luminaria', 'troca-disjuntor'],
  'troca-interruptor': ['troca-tomada', 'instalacao-luminaria', 'instalacao-ventilador-teto'],
  'instalacao-chuveiro': ['troca-disjuntor', 'troca-torneira', 'troca-registro'],
  'troca-disjuntor': ['troca-tomada', 'instalacao-chuveiro', 'instalacao-luminaria'],
  'instalacao-luminaria': ['troca-interruptor', 'troca-tomada', 'instalacao-ventilador-teto'],
  'instalacao-ventilador-teto': ['instalacao-luminaria', 'troca-interruptor', 'troca-tomada'],
  'troca-torneira': ['troca-registro', 'reparo-vazamento', 'desentupimento-pia'],
  'troca-registro': ['troca-torneira', 'reparo-vazamento', 'instalacao-chuveiro'],
  'reparo-vazamento': ['troca-registro', 'troca-torneira', 'desentupimento-pia'],
  'desentupimento-pia': ['desentupimento-vaso', 'troca-torneira', 'reparo-vazamento'],
  'desentupimento-vaso': ['desentupimento-pia', 'troca-registro', 'limpeza-pos-obra'],
  'instalacao-suporte-tv': ['instalacao-prateleira', 'instalacao-luminaria', 'troca-tomada'],
  'instalacao-prateleira': ['instalacao-suporte-tv', 'montagem-moveis-simples', 'instalacao-persiana'],
  'montagem-moveis-simples': ['montagem-guarda-roupa', 'instalacao-prateleira', 'instalacao-persiana'],
  'montagem-guarda-roupa': ['montagem-moveis-simples', 'instalacao-prateleira', 'instalacao-persiana'],
  'instalacao-persiana': ['instalacao-prateleira', 'instalacao-luminaria', 'montagem-moveis-simples'],
  'limpeza-ar-split': ['instalacao-ar-split', 'limpeza-pos-obra', 'instalacao-luminaria'],
  'instalacao-ar-split': ['limpeza-ar-split', 'troca-disjuntor', 'instalacao-suporte-tv'],
  'poda-jardim': ['limpeza-pos-obra', 'instalacao-prateleira', 'instalacao-luminaria'],
  'limpeza-pos-obra': ['poda-jardim', 'limpeza-ar-split', 'instalacao-persiana'],
};

function bySlug(cats: CategoriaLoja[]) {
  return new Map(flattenServices(cats).map((s) => [s.slug, s]));
}

function pickSlugs(cats: CategoriaLoja[], slugs: string[], exclude: Set<string>, limit: number) {
  const map = bySlug(cats);
  const out: ReturnType<typeof flattenServices> = [];
  for (const slug of slugs) {
    const s = map.get(slug);
    if (s && !exclude.has(slug) && !out.some((x) => x.slug === slug)) out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export function frequentlyTogether(cats: CategoriaLoja[], slug: string, limit = 4) {
  const atual = findService(cats, slug);
  const fromAdmin = atual?.relacionados?.filter(Boolean) ?? [];
  const wanted = fromAdmin.length ? fromAdmin : FREQUENTLY_TOGETHER[slug] || [];
  return pickSlugs(cats, wanted, new Set([slug]), limit);
}

export function relatedSameCategory(cats: CategoriaLoja[], slug: string, limit = 4) {
  const current = findService(cats, slug);
  return flattenServices(cats)
    .filter((s) => s.slug !== slug && s.categoria === current?.categoria)
    .slice(0, limit);
}

export function relatedServices(cats: CategoriaLoja[], slug: string, limit = 4) {
  const together = frequentlyTogether(cats, slug, limit);
  if (together.length >= limit) return together;
  const extra = relatedSameCategory(cats, slug, limit).filter((s) => !together.some((t) => t.slug === s.slug));
  return [...together, ...extra].slice(0, limit);
}

export function relatedForCart(cats: CategoriaLoja[], slugs: string[], limit = 4) {
  const exclude = new Set(slugs);
  const wanted = slugs.flatMap((s) => {
    const atual = findService(cats, s);
    const fromAdmin = atual?.relacionados?.filter(Boolean) ?? [];
    return fromAdmin.length ? fromAdmin : FREQUENTLY_TOGETHER[s] || [];
  });
  const together = pickSlugs(cats, wanted, exclude, limit);
  if (together.length >= limit) return together;
  const catsOfCart = new Set(
    flattenServices(cats)
      .filter((s) => slugs.includes(s.slug))
      .map((s) => s.categoria)
  );
  const extra = flattenServices(cats).filter((s) => !exclude.has(s.slug) && catsOfCart.has(s.categoria) && !together.some((t) => t.slug === s.slug));
  return [...together, ...extra].slice(0, limit);
}

export function searchServices(cats: CategoriaLoja[], q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return flattenServices(cats);
  return flattenServices(cats).filter(
    (s) =>
      s.nome.toLowerCase().includes(term) ||
      s.slug.includes(term) ||
      (s.descricao || '').toLowerCase().includes(term) ||
      s.categoria.toLowerCase().includes(term)
  );
}
