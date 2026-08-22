import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { CATEGORY_NAV, WHATSAPP_LINK } from '../../storefront/constants';
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
              className="h-12 w-full rounded-l-xl border-0 px-4 text-sm text-slate-800 outline-none"
            />
            <button type="submit" className="h-12 rounded-r-xl bg-primary-950 px-5 text-sm font-black">
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
            <Link to="/gestao" className="text-sm font-semibold">
              Painel interno
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-semibold">
              Entrar
              <span className="block text-[11px] text-white/70">ou cadastrar</span>
            </Link>
          )}

          <Link to="/carrinho" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
            Serviços
            <span className="ml-1 rounded bg-accent-500 px-1.5 text-xs text-primary-950">{count}</span>
          </Link>
        </div>
        <form onSubmit={search} className="px-4 pb-3 md:hidden">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar um serviço"
            className="h-11 w-full rounded-xl px-4 text-sm text-slate-800 outline-none"
          />
        </form>
      </div>
      {showCategories && (
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2">
            {CATEGORY_NAV.map((c, i) => (
              <Link
                key={`${c.slug}-${c.label}-${i}`}
                to={`/c/${c.slug}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-primary-800 hover:bg-primary-50"
              >
                {c.icon} {c.label}
              </Link>
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
