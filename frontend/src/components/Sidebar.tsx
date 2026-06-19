import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';

interface NavItem {
  label: string;
  path: string;
  roles?: Role[];
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Clientes', path: '/clientes', roles: ['admin', 'comercial', 'operacional'], icon: '👥' },
  { label: 'CRM', path: '/crm', roles: ['admin', 'comercial'], icon: '🎯' },
  { label: 'Pedidos', path: '/pedidos', roles: ['admin', 'comercial', 'operacional'], icon: '📦' },
  { label: 'Ordens de Serviço', path: '/ordens-servico', roles: ['admin', 'operacional'], icon: '🔧' },
  { label: 'Financeiro', path: '/financeiro', roles: ['admin', 'comercial'], icon: '💰' },
  { label: 'Marketplace', path: '/marketplace', icon: '🛒' },
  { label: 'Admin', path: '/admin', roles: ['admin'], icon: '⚙️' },
];

export function Sidebar() {
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.some((role) => hasRole(role))
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex w-64 flex-col bg-sidebar text-white">
      <div className="border-b border-slate-700 px-6 py-5">
        <h1 className="text-xl font-bold tracking-tight">ABS Resolve</h1>
        <p className="mt-1 text-xs text-slate-400">Plataforma de Gestão</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium">{user?.nome}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary-600/20 px-2 py-0.5 text-xs capitalize text-primary-300">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
