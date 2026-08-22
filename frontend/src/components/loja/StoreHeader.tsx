import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { CATEGORY_NAV, WHATSAPP_LINK } from '../../storefront/constants';
import { money } from '../../storefront/catalog';
import { isClienteRole } from '../../utils/auth-routes';

export function StoreHeader({ showCategories = true }: { showCategories?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cart = useCartStore();
  const [q, setQ] = useState('');
  const count = cart.count();
  const firstName = user?.nome?.split(' ')[0] || '';

  const search = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/busca?q=${encodeURIComponent(term)}` : '/');
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-accent-500 py-1.5 text-center text-xs font-semibold text-primary-900">
        10% de cashback em todos os serviços · Chamou. Confiou. Resolveu.
      </div>
      <div className="bg-primary-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo variant="sidebar" className="h-9" />
            <span className="hidden text-[11px] leading-tight text-white/80 sm:block">
              Chamou. Confiou.
              <br />
              Resolveu.
            </span>
          </Link>

          <form onSubmit={search} className="order-last flex min-w-[16rem] flex-1 basis-full md:order-none md:basis-0">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar um serviço (ex: instalar tomada)"
              className="h-11 w-full rounded-l-lg border-0 px-4 text-sm text-slate-800 outline-none"
            />
            <button
              type="submit"
              className="h-11 rounded-r-lg bg-primary-950 px-4 text-sm font-bold"
              aria-label="Buscar"
            >
              Buscar
            </button>
          </form>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 text-xs font-medium text-white/90 hover:text-accent-400 lg:flex"
          >
            Atendimento via WhatsApp
          </a>

          {user && isClienteRole(user.role) ? (
            <Link to="/conta" className="text-sm font-medium">
              Olá, {firstName}
              <span className="block text-[11px] text-white/70">Minha ABS</span>
            </Link>
          ) : user ? (
            <Link to="/gestao" className="text-sm font-medium">
              Painel interno
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium">
              Entrar ou cadastrar
            </Link>
          )}

          <Link to="/carrinho" className="relative text-sm font-medium">
            Meus serviços
            <span className="ml-1 rounded bg-accent-500 px-1.5 py-0.5 text-xs font-bold text-primary-900">
              {count}
            </span>
            {cart.total() > 0 && (
              <span className="ml-1 hidden text-xs text-white/70 sm:inline">{money(cart.total())}</span>
            )}
          </Link>
        </div>
      </div>
      {showCategories && (
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2">
            {CATEGORY_NAV.map((c, i) => (
              <Link
                key={`${c.slug}-${c.label}-${i}`}
                to={`/c/${c.slug}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-primary-800 hover:bg-primary-50"
              >
                {c.icon} {c.label}
              </Link>
            ))}
            <Link
              to="/#ofertas"
              className="shrink-0 rounded-full bg-accent-500 px-3 py-1.5 text-sm font-bold text-primary-900"
            >
              Ofertas do dia
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
