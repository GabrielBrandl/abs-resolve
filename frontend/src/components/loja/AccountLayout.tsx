import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { useAuthStore } from '../../store/authStore';
import { WHATSAPP_LINK } from '../../storefront/constants';

const NAV = [
  { to: '/conta', label: 'Visão geral', end: true },
  { to: '/conta/servicos', label: 'Meus serviços' },
  { to: '/conta/cashback', label: 'Meu cashback' },
  { to: '/conta/garantias', label: 'Garantias' },
  { to: '/conta/enderecos', label: 'Meus endereços' },
  { to: '/conta/pagamentos', label: 'Pagamentos' },
  { to: '/conta/notas', label: 'Notas fiscais' },
  { to: '/conta/indique', label: 'Indique e ganhe' },
  { to: '/conta/dados', label: 'Dados da conta' },
  { to: '/cliente/diagnostico', label: 'Diagnóstico por foto' },
];

export function AccountLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <StoreHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[16rem_1fr]">
        <aside className="h-fit rounded-2xl bg-white p-3">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Minha ABS</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-primary-50 font-semibold text-primary-800' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl bg-primary-800 p-3 text-center text-sm font-bold text-white">
            Falar agora
          </a>
          <button
            type="button"
            className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-slate-500"
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
    </div>
  );
}
