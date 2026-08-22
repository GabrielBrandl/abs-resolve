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

export function cashbackOf(price: number | string | null | undefined) {
  return Math.round(Number(price || 0) * CASHBACK_PCT * 100) / 100;
}

export function priceAfterCashback(price: number | null | undefined) {
  const p = Number(price || 0);
  return Math.max(0, Math.round((p - cashbackOf(p)) * 100) / 100);
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

export function relatedServices(cats: CategoriaLoja[], slug: string, limit = 3) {
  const current = findService(cats, slug);
  const all = flattenServices(cats).filter((s) => s.slug !== slug);
  const same = all.filter((s) => s.categoria === current?.categoria);
  return [...same, ...all.filter((s) => s.categoria !== current?.categoria)].slice(0, limit);
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
