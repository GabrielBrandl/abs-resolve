import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { Logo } from './ui';
import { ROLE_LABEL } from '../utils/labels';
import type { Role } from '../types';

interface NavItem {
  label: string;
  path: string;
  roles?: Role[];
  icon: string;
}

type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: 'Início',
    items: [{ label: 'Visão geral', path: '/', icon: '⌂', roles: ['admin', 'comercial', 'operacional'] }],
  },
  {
    title: 'Comercial',
    items: [
      { label: 'Clientes', path: '/clientes', roles: ['admin', 'comercial', 'operacional'], icon: '☺' },
      { label: 'CRM', path: '/crm', roles: ['admin', 'comercial'], icon: '★' },
      { label: 'Pedidos', path: '/pedidos', roles: ['admin', 'comercial', 'operacional'], icon: '▤' },
      { label: 'Marketplace', path: '/marketplace', roles: ['admin', 'comercial'], icon: '▣' },
      { label: 'Orçamentos', path: '/admin/orcamentos', roles: ['admin', 'comercial'], icon: '✎' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { label: 'Ordens de serviço', path: '/ordens-servico', roles: ['admin', 'operacional'], icon: '⚙' },
      { label: 'Agenda', path: '/agenda', roles: ['admin', 'comercial', 'operacional'], icon: '○' },
      { label: 'Movimentação', path: '/movimentacao', roles: ['admin', 'operacional'], icon: '↔' },
      { label: 'Estoque', path: '/admin/estoque', roles: ['admin', 'comercial'], icon: '▦' },
    ],
  },
  {
    title: 'Financeiro',
    items: [{ label: 'Financeiro', path: '/financeiro', roles: ['admin', 'comercial'], icon: '$' }],
  },
  {
    title: 'Configuração',
    items: [
      { label: 'Catálogo', path: '/admin/catalogo', roles: ['admin', 'comercial'], icon: '☰' },
      { label: 'Questionários', path: '/admin/questionarios', roles: ['admin'], icon: '?' },
      { label: 'Treinamento IA', path: '/admin/ia', roles: ['admin'], icon: '✦' },
      { label: 'Parceiros', path: '/admin/parceiros', roles: ['admin'], icon: '◆' },
      { label: 'Equipe', path: '/admin', roles: ['admin'], icon: '⚙' },
    ],
  },
];

function SidebarPanel({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { user, logout, hasRole } = useAuthStore();
  const { theme, toggleTheme, toggleSidebar } = useUiStore();
  const navigate = useNavigate();

  const groups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.roles || item.roles.some((role) => hasRole(role))),
    }))
    .filter((g) => g.items.length > 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <div className={`border-b border-white/10 ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          {!collapsed && <Logo variant="sidebar" className="h-12" />}
          {collapsed && (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-sm font-bold text-primary-900">
              A
            </span>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
              title="Minimizar menu"
              aria-label="Minimizar menu"
            >
              «
            </button>
          )}
        </div>
        {!collapsed && <p className="mt-1 text-xs text-accent-400">Gestão da operação</p>}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="mt-2 hidden w-full rounded-lg py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white md:block"
            title="Expandir menu"
            aria-label="Expandir menu"
          >
            »
          </button>
        )}
      </div>

      <nav className={`flex-1 space-y-3 overflow-y-auto py-4 ${collapsed ? 'px-1.5' : 'px-3'}`}>
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onNavigate}
                title={item.label}
                className={({ isActive }) =>
                  `mb-0.5 flex items-center rounded-lg text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-accent-500 text-primary-900'
                      : 'text-slate-200 hover:bg-sidebar-hover hover:text-white'
                  }`
                }
              >
                <span className="w-4 text-center text-base leading-none">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={`border-t border-white/10 ${collapsed ? 'px-1.5 py-3' : 'px-4 py-4'}`}>
        {!collapsed && (
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{user?.nome}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
              {ROLE_LABEL[user?.role || ''] || user?.role}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className={`mb-2 flex w-full items-center rounded-lg bg-white/5 text-sm font-medium text-slate-200 transition hover:bg-white/10 ${
            collapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'
          }`}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {!collapsed && <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title="Sair"
          className={`w-full rounded-lg bg-primary-700 text-sm font-medium text-slate-200 transition-colors hover:bg-primary-600 ${
            collapsed ? 'px-2 py-2' : 'px-3 py-2'
          }`}
        >
          {collapsed ? '⎋' : 'Sair'}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={`hidden shrink-0 flex-col bg-sidebar text-white transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[4.5rem]' : 'w-64'
      }`}
    >
      <SidebarPanel collapsed={collapsed} />
    </aside>
  );
}

export function SidebarMobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <aside className="absolute left-0 top-0 flex h-full w-[min(100vw-3rem,16rem)] flex-col bg-sidebar text-white shadow-xl">
        <SidebarPanel onNavigate={onClose} />
      </aside>
    </div>
  );
}
