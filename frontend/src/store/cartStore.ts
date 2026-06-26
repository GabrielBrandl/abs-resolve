import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  slug: string;
  nome: string;
  categoria: string;
  precoMinimo: number | null;
  precoTexto: string;
  tipoPreco: string;
  imagemUrl?: string | null;
  quantidade: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantidade'>, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        if (item.tipoPreco === 'sob_orcamento') return;
        set((s) => {
          const existing = s.items.find((i) => i.slug === item.slug);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.slug === item.slug ? { ...i, quantidade: i.quantidade + qty } : i
              ),
            };
          }
          return { items: [...s.items, { ...item, quantidade: qty }] };
        });
      },
      remove: (slug) => set((s) => ({ items: s.items.filter((i) => i.slug !== slug) })),
      setQty: (slug, qty) => {
        if (qty <= 0) {
          get().remove(slug);
          return;
        }
        set((s) => ({
          items: s.items.map((i) => (i.slug === slug ? { ...i, quantidade: qty } : i)),
        }));
      },
      clear: () => set({ items: [] }),
      total: () =>
        get().items.reduce((sum, i) => sum + (i.precoMinimo || 0) * i.quantidade, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantidade, 0),
    }),
    { name: 'abs-cart' }
  )
);
