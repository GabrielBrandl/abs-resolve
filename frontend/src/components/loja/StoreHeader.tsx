import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { CATEGORY_NAV, WHATSAPP_LINK } from '../../storefront/constants';
import { isClienteRole, getHomeForRole } from '../../utils/auth-routes';
import { money } from '../../storefront/catalog';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';
import { AbsBrand } from './store-ui';
import {
  IconBolt,
  IconBuilding,
  IconCart,
  IconDrop,
  IconHammer,
  IconSearch,
  IconSnow,
  IconSpark,
  IconTag,
  IconUser,
  IconWhatsApp,
  IconWrench,
  IconPinSmall,
} from './icons';

const CAT_ICONS = {
  bolt: IconBolt,
  drop: IconDrop,
  snow: IconSnow,
  wrench: IconWrench,
  hammer: IconHammer,
  spark: IconSpark,
  building: IconBuilding,
} as const;

export function StoreHeader({ showCategories = true }: { showCategories?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const [q, setQ] = useState('');
  const count = items.reduce((n, i) => n + i.quantidade, 0);
  const total = items.reduce((n, i) => n + (Number(i.precoMinimo) || 0) * i.quantidade, 0);
  const firstName = user?.nome?.split(' ')[0] || '';
  const { cashbackPercent } = useStoreConfig();

  const search = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/busca?q=${encodeURIComponent(term)}` : '/');
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[#002d62] text-[11px] text-white sm:text-[12px]">
        <div className="mx-auto flex h-9 max-w-[1180px] items-center justify-between gap-3 px-4">
          <Link to="/#cashback" className="min-w-0 truncate font-medium">
            <span className="font-extrabold text-[#ffb800]">{percentLabel(cashbackPercent)}% CASHBACK</span>
            <span className="ml-1 hidden sm:inline">em todos os serviços.</span>
            <span className="ml-1 font-semibold underline decoration-[#ffb800]/80 underline-offset-2">
              Saiba como funciona &gt;
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-4 text-white/90">
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 hover:text-[#ffb800] sm:flex">
              <IconWhatsApp className="h-3.5 w-3.5 text-[#25D366]" />
              Atendimento via WhatsApp
            </a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="hidden hover:text-[#ffb800] md:inline">
              Ajuda
            </a>
            <span className="hidden items-center gap-1 lg:flex">
              <IconPinSmall className="h-3.5 w-3.5" />
              Manaus - AM
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-[#e6e8ee] bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1180px] items-center gap-4 px-4">
          <AbsBrand />

          <form onSubmit={search} className="hidden min-w-0 flex-1 md:flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busque serviços (ex: instalar ar-condicionado)"
              className="h-11 w-full rounded-l-md border border-[#d5d9e2] border-r-0 px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="flex h-11 items-center gap-2 rounded-r-md bg-[#002d62] px-5 text-[13px] font-extrabold tracking-wide text-white"
            >
              <IconSearch className="h-4 w-4" />
              BUSCAR
            </button>
          </form>

          {user && isClienteRole(user.role) ? (
            <Link to="/conta" className="hidden shrink-0 items-center gap-2 text-[#002d62] sm:flex">
              <IconUser className="h-8 w-8" />
              <span className="text-[13px] font-semibold leading-tight">
                Olá, {firstName}
                <span className="block text-[11px] font-medium text-slate-500">Minha conta</span>
              </span>
            </Link>
          ) : user ? (
            <Link to={getHomeForRole(user.role)} className="hidden text-sm font-semibold text-[#002d62] sm:block">
              Painel interno
            </Link>
          ) : (
            <Link to="/login" className="hidden shrink-0 items-center gap-2 text-[#002d62] sm:flex">
              <IconUser className="h-8 w-8" />
              <span className="text-[13px] font-semibold leading-tight">
                Entrar ou
                <span className="block">cadastrar</span>
              </span>
            </Link>
          )}

          <Link to="/carrinho" className="relative flex shrink-0 items-center gap-2 text-[#002d62]">
            <span className="relative">
              <IconCart className="h-8 w-8" />
              <span className="absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ffb800] px-1 text-[10px] font-black text-[#002d62]">
                {count}
              </span>
            </span>
            <span className="hidden text-[13px] font-semibold leading-tight sm:block">
              Meus serviços
              <span className="block font-bold">{money(total)}</span>
            </span>
          </Link>
        </div>
        <form onSubmit={search} className="px-4 pb-3 md:hidden">
          <div className="flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busque um serviço"
              className="h-11 w-full rounded-l-md border border-[#d5d9e2] px-4 text-sm outline-none"
            />
            <button type="submit" className="h-11 rounded-r-md bg-[#002d62] px-4 font-extrabold text-white">
              BUSCAR
            </button>
          </div>
        </form>
      </div>

      {showCategories && (
        <nav className="border-b border-[#e6e8ee] bg-white">
          <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-1 overflow-x-auto px-4">
            {CATEGORY_NAV.map((c) => {
              const Icon = CAT_ICONS[c.icon];
              return (
                <NavLink
                  key={c.label}
                  to={c.to || `/c/${c.slug}`}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-3 text-[13px] font-semibold ${
                      isActive
                        ? 'border-[#002d62] text-[#002d62]'
                        : 'border-transparent text-[#2b3a55] hover:text-[#002d62]'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {c.label}
                </NavLink>
              );
            })}
            <Link
              to="/#ofertas"
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md bg-[#ffb800] px-3 py-2 text-[12px] font-black uppercase tracking-wide text-[#002d62]"
            >
              <IconTag className="h-4 w-4" />
              Ofertas do dia
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
