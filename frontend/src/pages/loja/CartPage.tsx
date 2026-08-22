import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { cashbackOf, money } from '../../storefront/catalog';
import { YellowButton } from '../../components/loja/store-ui';
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
      <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
        <h1 className="text-2xl font-black text-primary-950">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-slate-500">Escolha um serviço, veja o preço e agende em minutos.</p>
        <Link to="/" className="mt-5 inline-block">
          <YellowButton>Ver serviços</YellowButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h1 className="mb-4 text-2xl font-black text-primary-950">Meus serviços</h1>
        <ul className="divide-y">
          {cart.items.map((item) => (
            <li key={item.slug} className="flex items-center gap-3 py-4">
              <img src={item.imagemUrl || '/logo.png'} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-bold">{item.nome}</p>
                <p className="text-sm font-black text-primary-800">{money((item.precoMinimo || 0) * item.quantidade)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="h-8 w-8 rounded-full border" onClick={() => cart.setQty(item.slug, item.quantidade - 1)}>−</button>
                {item.quantidade}
                <button type="button" className="h-8 w-8 rounded-full border" onClick={() => cart.setQty(item.slug, item.quantidade + 1)}>+</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Total</p>
        <p className="text-3xl font-black text-primary-800">{money(total)}</p>
        <p className="mt-1 text-xs font-bold text-emerald-700">Cashback estimado {money(cashbackOf(total))}</p>
        <YellowButton className="mt-4 w-full" onClick={checkout}>
          Continuar para agendamento
        </YellowButton>
      </aside>
    </div>
  );
}
