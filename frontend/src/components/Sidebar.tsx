import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Logo } from './ui';
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
  { label: 'Movimentação', path: '/movimentacao', roles: ['admin', 'operacional'], icon: '📋' },
  { label: 'Marketplace', path: '/marketplace', icon: '🛒' },
  { label: 'Catálogo', path: '/admin/catalogo', roles: ['admin', 'comercial'], icon: '📚' },
  { label: 'Estoque', path: '/admin/estoque', roles: ['admin', 'comercial'], icon: '📦' },
  { label: 'Agenda', path: '/admin/agenda', roles: ['admin', 'comercial'], icon: '📅' },
  { label: 'Orçamentos', path: '/admin/orcamentos', roles: ['admin', 'comercial'], icon: '📝' },
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
      <div className="border-b border-primary-600/30 px-4 py-4">
        <Logo variant="dark" className="h-12" />
        <p className="mt-1 text-xs text-accent-400">Plataforma de Gestão</p>
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
                  ? 'bg-accent-500 text-primary-900'
                  : 'text-slate-200 hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-primary-600/30 px-4 py-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium">{user?.nome}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-accent-500/20 px-2 py-0.5 text-xs capitalize text-accent-400">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-primary-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-primary-600"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
