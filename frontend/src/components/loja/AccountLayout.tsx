import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { WhatsAppFab } from './store-ui';
import { useAuthStore } from '../../store/authStore';
import { WHATSAPP_LINK } from '../../storefront/constants';
import {
  IconBag,
  IconCamera,
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
  { to: '/cliente/diagnostico', label: 'Diagnóstico por foto', Icon: IconCamera },
];

export function AccountLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const firstName = user?.nome?.split(' ')[0] || 'Cliente';

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <StoreHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[17.5rem_1fr]">
        <aside className="h-fit space-y-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-primary-50 p-3">
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
                  `mb-0.5 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
                    isActive ? 'bg-primary-50 font-bold text-primary-800' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <item.Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="rounded-3xl bg-accent-500 p-4 text-primary-950">
            <p className="text-xs font-black uppercase">Indique e ganhe</p>
            <p className="mt-1 text-sm font-semibold">Seu amigo ganha R$ 20 e você também, quando o serviço for concluído.</p>
            <NavLink to="/conta/indique" className="mt-3 inline-block rounded-full bg-primary-900 px-4 py-2 text-xs font-black text-white">
              Indicar amigos
            </NavLink>
          </div>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="block rounded-3xl bg-primary-900 p-4 text-white">
            <p className="text-sm font-black">Precisa de ajuda?</p>
            <p className="text-xs text-white/70">Fale com a ABS agora</p>
            <span className="mt-3 inline-block rounded-full bg-[#25D366] px-4 py-2 text-xs font-black">Falar agora</span>
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
