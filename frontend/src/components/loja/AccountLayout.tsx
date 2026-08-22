import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { WhatsAppFab } from './store-ui';
import { useAuthStore } from '../../store/authStore';
import { WHATSAPP_LINK } from '../../storefront/constants';

const NAV = [
  { to: '/conta', label: 'Visão geral', icon: '⌂', end: true },
  { to: '/conta/servicos', label: 'Meus serviços', icon: '▣' },
  { to: '/conta/cashback', label: 'Meu cashback', icon: '◉' },
  { to: '/conta/garantias', label: 'Garantias', icon: '🛡' },
  { to: '/conta/enderecos', label: 'Meus endereços', icon: '⌖' },
  { to: '/conta/pagamentos', label: 'Pagamentos', icon: '💳' },
  { to: '/conta/notas', label: 'Notas fiscais', icon: '📄' },
  { to: '/conta/indique', label: 'Indique e ganhe', icon: '↗' },
  { to: '/conta/dados', label: 'Dados da conta', icon: '☺' },
  { to: '/cliente/diagnostico', label: 'Diagnóstico por foto', icon: '📷' },
];

export function AccountLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <StoreHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[17rem_1fr]">
        <aside className="h-fit space-y-4">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Minha ABS</p>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                    isActive ? 'bg-primary-50 font-bold text-primary-800' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <span className="w-4 text-center">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="rounded-2xl bg-accent-500 p-4 text-primary-950">
            <p className="text-xs font-black uppercase">Indique e ganhe</p>
            <p className="mt-1 text-sm font-semibold">Seu amigo ganha R$ 20 e você também.</p>
            <NavLink to="/conta/indique" className="mt-3 inline-block rounded-lg bg-primary-900 px-3 py-2 text-xs font-black text-white">
              Indicar amigos
            </NavLink>
          </div>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="block rounded-2xl bg-primary-900 p-4 text-white">
            <p className="text-sm font-black">Precisa de ajuda?</p>
            <p className="text-xs text-white/70">Fale com a ABS agora</p>
            <span className="mt-3 inline-block rounded-lg bg-[#25D366] px-3 py-2 text-xs font-black">Falar agora</span>
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
        <section>
          <Outlet />
        </section>
      </div>
      <StoreFooter />
      <WhatsAppFab />
    </div>
  );
}
