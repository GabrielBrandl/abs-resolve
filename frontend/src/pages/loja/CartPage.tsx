import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cashbackOf, money } from '../../storefront/catalog';
import { isClienteRole } from '../../utils/auth-routes';

export function CartPage() {
  const cart = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const total = cart.total();

  const checkout = () => {
    const next = '/agendar';
    if (!user || !isClienteRole(user.role)) {
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    navigate(next);
  };

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center">
        <h1 className="text-xl font-bold text-primary-900">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-slate-500">Escolha um serviço e veja o preço antes de agendar.</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-accent-500 px-5 py-2 text-sm font-bold text-primary-900">
          Ver serviços
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="rounded-2xl bg-white p-4">
        <h1 className="mb-4 text-xl font-bold text-primary-900">Meus serviços</h1>
        <ul className="divide-y">
          {cart.items.map((item) => (
            <li key={item.slug} className="flex items-center gap-3 py-3">
              <img src={item.imagemUrl || '/logo.png'} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-semibold">{item.nome}</p>
                <p className="text-sm text-primary-700">{money((item.precoMinimo || 0) * item.quantidade)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="h-8 w-8 rounded border" onClick={() => cart.setQty(item.slug, item.quantidade - 1)}>
                  −
                </button>
                {item.quantidade}
                <button type="button" className="h-8 w-8 rounded border" onClick={() => cart.setQty(item.slug, item.quantidade + 1)}>
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-2xl bg-white p-4">
        <p className="text-sm text-slate-500">Total</p>
        <p className="text-2xl font-bold text-primary-800">{money(total)}</p>
        <p className="text-xs font-semibold text-emerald-700">Cashback estimado {money(cashbackOf(total))}</p>
        <button type="button" onClick={checkout} className="mt-4 w-full rounded-lg bg-accent-500 py-3 text-sm font-bold text-primary-900">
          Continuar para agendamento
        </button>
      </aside>
    </div>
  );
}
