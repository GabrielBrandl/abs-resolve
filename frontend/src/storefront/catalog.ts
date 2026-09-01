import { PECAS_CATALOGO } from './pecas';
import { searchItems } from './search';
import { CATALOGO_FALLBACK } from './static-catalog';

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
  tipo?: 'servico' | 'peca';
  keywords?: string[];
  servicoRelacionado?: string;
  categoriaNome?: string;
  icone?: string;
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

const FOTO_CATEGORIA: Record<string, string> = {
  eletricista: '/servicos/troca-tomada.webp',
  hidraulica: '/servicos/troca-torneira.webp',
  montador: '/servicos/instalacao-suporte-tv.webp',
  'ar-condicionado': '/servicos/limpeza-ar-split.webp',
  pecas: '/opcoes/troca-tomada/tipoTomada/simples.webp',
};

export function fotoServico(s: { slug?: string; categoria?: string; imagemUrl?: string | null }) {
  const slug = s.slug || '';
  if (slug.includes('ar') && slug.includes('caixa')) return '/servicos/limpeza-ar-split.webp';
  if (s.imagemUrl && !s.imagemUrl.includes('undefined')) return s.imagemUrl;
  if (slug.startsWith('peca-')) return s.imagemUrl || FOTO_CATEGORIA.pecas;
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
  const peca = PECAS_CATALOGO.find((p) => p.slug === slug);
  if (peca) return { ...peca, categoriaNome: 'Peças avulsas', icone: '🔩' };
  return null;
}

export function mergeCatalog(api: CategoriaLoja[] = []): CategoriaLoja[] {
  const bySlug = new Map<string, ServicoLoja>();
  for (const s of [...flattenServices(CATALOGO_FALLBACK), ...flattenServices(api)]) {
    const prev = bySlug.get(s.slug);
    bySlug.set(s.slug, {
      ...prev,
      ...s,
      nome: s.nome || prev?.nome || s.slug,
      descricao: s.descricao || prev?.descricao || null,
      imagemUrl: fotoServico({ ...prev, ...s }),
      precoMinimo: s.precoMinimo ?? prev?.precoMinimo ?? null,
      precoTexto: s.precoTexto || prev?.precoTexto || null,
      tipoPreco: s.tipoPreco || prev?.tipoPreco || 'fixo',
      garantiaDias: s.garantiaDias ?? prev?.garantiaDias ?? 90,
      relacionados: s.relacionados?.length ? s.relacionados : prev?.relacionados,
      tipo: s.tipo || prev?.tipo || (s.slug.startsWith('peca-') ? 'peca' : 'servico'),
      keywords: Array.from(new Set([...(prev?.keywords || []), ...(s.keywords || [])])),
      servicoRelacionado: s.servicoRelacionado || prev?.servicoRelacionado,
    });
  }

  const meta = new Map<string, CategoriaLoja>();
  for (const c of [...CATALOGO_FALLBACK, ...api]) {
    if (c.slug === 'pecas') continue;
    if (!meta.has(c.slug)) meta.set(c.slug, c);
  }

  const cats = [...meta.values()]
    .map((c) => ({
      ...c,
      servicos: [...bySlug.values()].filter((s) => s.categoria === c.slug && s.tipo !== 'peca' && !s.slug.startsWith('peca-')),
    }))
    .filter((c) => c.servicos.length);

  const pecas = PECAS_CATALOGO.map((p) => ({ ...p, tipo: 'peca' as const }));

  return [
    ...cats,
    {
      slug: 'pecas',
      nome: 'Peças avulsas',
      icone: '🔩',
      cor: '#002d62',
      servicos: pecas,
    },
  ];
}

export function catalogItems(cats: CategoriaLoja[]) {
  return flattenServices(mergeCatalog(cats));
}

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
  'desentupimento-vaso': ['desentupimento-pia', 'troca-registro', 'troca-torneira'],
  'instalacao-suporte-tv': ['instalacao-prateleira', 'instalacao-luminaria', 'troca-tomada'],
  'instalacao-prateleira': ['instalacao-suporte-tv', 'instalacao-luminaria', 'troca-tomada'],
  'limpeza-ar-split': ['instalacao-ar-split', 'instalacao-luminaria', 'troca-disjuntor'],
  'instalacao-ar-split': ['limpeza-ar-split', 'troca-disjuntor', 'instalacao-suporte-tv'],
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
    .filter((s) => s.slug !== slug && s.categoria === current?.categoria && s.tipo !== 'peca')
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
  const extra = flattenServices(cats).filter(
    (s) => !exclude.has(s.slug) && catsOfCart.has(s.categoria) && s.tipo !== 'peca' && !together.some((t) => t.slug === s.slug)
  );
  return [...together, ...extra].slice(0, limit);
}

export function searchServices(cats: CategoriaLoja[], q: string) {
  const items = catalogItems(cats).map((s) => ({
    ...s,
    tipo: s.tipo || (s.slug.startsWith('peca-') ? 'peca' : 'servico'),
    keywords: s.keywords || [],
  }));
  const term = q.trim();
  if (!term) return items;
  const scored = searchItems(items, term);
  const seen = new Set(scored.map((r) => r.item.slug));
  const extra: typeof items = [];
  for (const r of scored) {
    const item = r.item;
    const pecasLigadas = PECAS_CATALOGO.filter(
      (p) => p.servicoRelacionado === item.slug || p.slug === item.slug || item.servicoRelacionado === p.servicoRelacionado
    );
    for (const p of pecasLigadas) {
      if (seen.has(p.slug)) continue;
      const full = items.find((i) => i.slug === p.slug);
      if (full) {
        extra.push(full);
        seen.add(p.slug);
      }
    }
    if (item.tipo === 'peca' && item.servicoRelacionado && !seen.has(item.servicoRelacionado)) {
      const svc = items.find((i) => i.slug === item.servicoRelacionado);
      if (svc) {
        extra.push(svc);
        seen.add(svc.slug);
      }
    }
    for (const rel of FREQUENTLY_TOGETHER[item.slug] || []) {
      if (seen.has(rel)) continue;
      const relItem = items.find((i) => i.slug === rel);
      if (relItem) {
        extra.push(relItem);
        seen.add(rel);
      }
    }
  }
  return [...scored.map((r) => r.item), ...extra];
}

export function searchSuggestions(cats: CategoriaLoja[], q: string, limit = 8) {
  return searchServices(cats, q).slice(0, limit);
}
