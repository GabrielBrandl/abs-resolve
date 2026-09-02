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
  tipo?: 'servico' | 'peca';
  servicoRelacionado?: string;
  respostas?: Record<string, string>;
  /** Identidade única no carrinho (ex.: mat:sku) — evita colisão entre variantes */
  cartKey?: string;
  materialSku?: string;
  materialCor?: string;
  materialModeloId?: string;
}

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantidade'>, qty?: number) => CartItem[];
  remove: (slugOrKey: string) => void;
  setQty: (slugOrKey: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  total: () => number;
};

function itemKey(item: Pick<CartItem, 'slug' | 'cartKey' | 'materialSku'>) {
  return item.cartKey || (item.materialSku ? `mat:${item.materialSku}` : item.slug);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        const amount = Math.max(1, Number(qty) || 1);
        const key = itemKey(item);
        const next = (() => {
          const current = get().items;
          const existing = current.find((i) => itemKey(i) === key);
          if (existing) {
            return current.map((i) =>
              itemKey(i) === key ? { ...i, quantidade: i.quantidade + amount, ...item, cartKey: key } : i
            );
          }
          return [...current, { ...item, quantidade: amount, cartKey: key }];
        })();
        set({ items: next });
        return next;
      },
      remove: (slugOrKey) =>
        set({
          items: get().items.filter((i) => itemKey(i) !== slugOrKey && i.slug !== slugOrKey),
        }),
      setQty: (slugOrKey, qty) => {
        if (qty <= 0) {
          get().remove(slugOrKey);
          return;
        }
        set({
          items: get().items.map((i) =>
            itemKey(i) === slugOrKey || i.slug === slugOrKey ? { ...i, quantidade: qty } : i
          ),
        });
      },
      clear: () => set({ items: [] }),
      count: () => cartCount(get().items),
      total: () => cartTotal(get().items),
    }),
    {
      name: 'abs-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantidade, 0);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + (Number(i.precoMinimo) || 0) * i.quantidade, 0);
}

type CartListener = (message: string, count: number) => void;
const cartListeners = new Set<CartListener>();

export function onCartChange(fn: CartListener) {
  cartListeners.add(fn);
  return () => {
    cartListeners.delete(fn);
  };
}

export function addToCart(item: Omit<CartItem, 'quantidade'>, qty = 1) {
  const items = useCartStore.getState().add(item, qty);
  const count = cartCount(items);
  cartListeners.forEach((fn) => fn(`${item.nome} entrou no carrinho`, count));
  return items;
}
