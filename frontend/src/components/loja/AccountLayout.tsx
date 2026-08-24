import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { WhatsAppFab } from './store-ui';
import { useAuthStore } from '../../store/authStore';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { money } from '../../storefront/catalog';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import {
  IconBag,
  IconCard,
  IconCash,
  IconDoc,
  IconGift,
  IconHome,
  IconPin,
  IconShield,
  IconStar,
  IconUser,
} from './icons';

const NAV: Array<{ to: string; label: string; Icon: ComponentType<{ className?: string }>; end?: boolean }> = [
  { to: '/conta', label: 'Visão geral', Icon: IconHome, end: true },
  { to: '/conta/servicos', label: 'Meus serviços', Icon: IconBag },
  { to: '/conta/cashback', label: 'Meu cashback', Icon: IconCash },
  { to: '/conta/garantias', label: 'Garantias', Icon: IconShield },
  { to: '/conta/enderecos', label: 'Meus endereços', Icon: IconPin },
  { to: '/conta/pagamentos', label: 'Pagamentos', Icon: IconCard },
  { to: '/conta/notas', label: 'Notas fiscais', Icon: IconDoc },
  { to: '/conta/servicos', label: 'Minhas avaliações', Icon: IconStar },
  { to: '/conta/indique', label: 'Indique e ganhe', Icon: IconGift },
  { to: '/conta/dados', label: 'Dados da conta', Icon: IconUser },
];

export function AccountLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { bonusIndicacao } = useStoreConfig();
  const firstName = user?.nome?.split(' ')[0] || 'Cliente';

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <StoreHeader showCategories={false} />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[16.5rem_1fr]">
        <aside className="h-fit space-y-4">
          <details className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between font-black text-primary-900">
              Menu da conta
              <span className="text-slate-400">▾</span>
            </summary>
            <div className="mt-3">
              {NAV.map((item) => (
                <NavLink
                  key={`m-${item.to}-${item.label}`}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                      isActive ? 'bg-[#e8f0ff] font-bold text-primary-800' : 'text-slate-600'
                    }`
                  }
                >
                  <item.Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </details>
          <div className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#eef3fb] p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-800 text-sm font-black text-white">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-primary-900">Olá, {firstName}</p>
                <p className="text-[11px] text-slate-500">Minha ABS</p>
              </div>
            </div>
            {NAV.map((item) => (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                    isActive ? 'bg-[#e8f0ff] font-bold text-primary-800' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <item.Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="hidden rounded-2xl bg-accent-500 p-4 text-primary-950 lg:block">
            <p className="text-xs font-black uppercase">Indique e ganhe</p>
            <p className="mt-1 text-sm font-semibold">Seu amigo ganha {money(bonusIndicacao)} e você também, quando o serviço for concluído.</p>
            <NavLink to="/conta/indique" className="mt-3 inline-block rounded-lg bg-primary-900 px-4 py-2 text-xs font-black uppercase text-white">
              Indicar amigos
            </NavLink>
          </div>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="hidden rounded-2xl bg-primary-800 p-4 text-white lg:block">
            <p className="text-sm font-black">Precisa de ajuda?</p>
            <p className="text-xs text-white/70">Fale com a ABS agora</p>
            <span className="mt-3 inline-block rounded-lg bg-[#25D366] px-4 py-2 text-xs font-black uppercase">Falar agora</span>
          </a>
          <button
            type="button"
            className="w-full text-sm text-slate-400"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Sair
          </button>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}
