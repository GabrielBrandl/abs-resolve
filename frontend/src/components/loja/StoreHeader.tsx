import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { CATEGORY_NAV, WHATSAPP_LINK } from '../../storefront/constants';
import { isClienteRole, getHomeForRole } from '../../utils/auth-routes';

export function StoreHeader({ showCategories = true }: { showCategories?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const [q, setQ] = useState('');
  const count = items.reduce((n, i) => n + i.quantidade, 0);
  const firstName = user?.nome?.split(' ')[0] || '';

  const search = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/busca?q=${encodeURIComponent(term)}` : '/');
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-accent-500 py-1.5 text-center text-[12px] font-bold text-primary-950">
        10% de cashback em todos os serviços · Preço antes da visita · Garantia de até 90 dias
      </div>
      <div className="bg-primary-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo variant="sidebar" className="h-10" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-black tracking-wide">ABS RESOLVE</span>
              <span className="text-[10px] text-accent-400">Chamou. Confiou. Resolveu.</span>
            </span>
          </Link>

          <form onSubmit={search} className="hidden min-w-0 flex-1 md:flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar um serviço (ex: instalar ar-condicionado)"
              className="h-12 w-full rounded-l-full border-0 px-5 text-sm text-slate-800 outline-none"
            />
            <button type="submit" className="h-12 rounded-r-full bg-primary-950 px-6 text-sm font-black">
              Buscar
            </button>
          </form>

          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="hidden text-xs font-semibold lg:block">
            Atendimento
            <span className="block text-[11px] text-accent-400">via WhatsApp</span>
          </a>

          {user && isClienteRole(user.role) ? (
            <Link to="/conta" className="text-sm font-semibold">
              Olá, {firstName}
              <span className="block text-[11px] text-white/70">Minha ABS</span>
            </Link>
          ) : user ? (
            <Link to={getHomeForRole(user.role)} className="text-sm font-semibold">
              Painel interno
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-semibold">
              Entrar
              <span className="block text-[11px] text-white/70">ou cadastrar</span>
            </Link>
          )}

          <Link to="/carrinho" className="rounded-full bg-accent-500 px-3 py-2 text-sm font-black text-primary-950">
            Serviços {count}
          </Link>
        </div>
        <form onSubmit={search} className="px-4 pb-3 md:hidden">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar um serviço"
            className="h-11 w-full rounded-full px-4 text-sm text-slate-800 outline-none"
          />
        </form>
      </div>
      {showCategories && (
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-3 py-2">
            {CATEGORY_NAV.filter((c, i, arr) => arr.findIndex((x) => x.label === c.label) === i).map((c) => (
              <NavLink
                key={c.label}
                to={`/c/${c.slug}`}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold ${
                    isActive ? 'bg-primary-800 text-white' : 'text-primary-800 hover:bg-slate-50'
                  }`
                }
              >
                <img src={c.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                {c.label}
              </NavLink>
            ))}
            <Link to="/#ofertas" className="shrink-0 rounded-full bg-accent-500 px-3 py-1.5 text-sm font-black text-primary-950">
              Ofertas do dia
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
