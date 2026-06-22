import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Logo } from '../../components/ui';

const navItems = [
  { label: 'Solicitar Serviço', path: '/cliente/agendar', icon: '⚡' },
  { label: 'Meus Pedidos', path: '/cliente', icon: '📦', end: true },
  { label: 'Financeiro', path: '/cliente/financeiro', icon: '💰' },
  { label: 'Meu Cadastro', path: '/cliente/cadastro', icon: '👤' },
  { label: 'Documentos', path: '/cliente/documentos', icon: '📄' },
  { label: 'Benefícios', path: '/cliente/beneficios', icon: '🎁' },
];

export function ClienteLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="flex w-56 flex-col bg-sidebar text-white">
        <div className="border-b border-primary-600/30 px-4 py-4">
          <Logo className="h-10 brightness-0 invert" />
          <p className="mt-1 text-xs text-accent-400">Portal do Cliente</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-accent-500 text-primary-900' : 'text-slate-200 hover:bg-sidebar-hover'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-primary-600/30 p-4">
          <p className="truncate text-sm">{user?.nome}</p>
          <button onClick={handleLogout} className="mt-2 w-full rounded-lg bg-primary-700 py-1.5 text-sm hover:bg-primary-600">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}
