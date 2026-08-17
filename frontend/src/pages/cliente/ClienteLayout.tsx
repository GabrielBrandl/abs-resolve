import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Logo } from '../../components/ui';

const navGroups = [
  {
    title: 'Pedir serviço',
    items: [
      { label: 'Solicitar', path: '/cliente/agendar', icon: '🛒' },
      { label: 'Diagnóstico', path: '/cliente/diagnostico', icon: '📷' },
    ],
  },
  {
    title: 'Meus serviços',
    items: [
      { label: 'Pedidos', path: '/cliente', icon: '📦', end: true },
      { label: 'Agendamentos', path: '/cliente/agendamentos', icon: '📅' },
      { label: 'Garantias', path: '/cliente/garantias', icon: '🛡️' },
      { label: 'Financeiro', path: '/cliente/financeiro', icon: '💰' },
    ],
  },
  {
    title: 'Minha conta',
    items: [
      { label: 'Cadastro', path: '/cliente/cadastro', icon: '👤' },
      { label: 'Documentos', path: '/cliente/documentos', icon: '📄' },
    ],
  },
];

const bottomNavItems = [
  { label: 'Solicitar', path: '/cliente/agendar', icon: '🛒' },
  { label: 'Pedidos', path: '/cliente', icon: '📦', end: true },
  { label: 'Agenda', path: '/cliente/agendamentos', icon: '📅' },
  { label: 'Garantias', path: '/cliente/garantias', icon: '🛡️' },
  { label: 'Mais', path: '/cliente/cadastro', icon: '☰' },
];

export function ClienteLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-accent-500 text-primary-900' : 'text-slate-200 hover:bg-sidebar-hover'
    }`;

  return (
    <div className="flex min-h-screen bg-surface dark:bg-surface-muted">
      <aside className="hidden w-56 flex-col bg-sidebar text-white md:flex">
        <div className="border-b border-white/10 px-4 py-4">
          <Logo variant="sidebar" className="h-10" />
          <p className="mt-1 text-xs text-accent-400">Portal do Cliente</p>
        </div>
        <nav className="flex-1 space-y-3 px-2 py-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.end} className={navLinkClass}>
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm">{user?.nome}</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 py-1.5 text-sm hover:bg-white/10"
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg bg-primary-700 py-1.5 text-sm hover:bg-primary-600"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:contents">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-sidebar px-4 py-3 text-white md:hidden">
          <Logo variant="sidebar" className="h-8" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-sidebar-hover"
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 hover:bg-sidebar-hover"
              aria-label="Menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar text-white shadow-xl">
              <div className="border-b border-white/10 px-4 py-4">
                <Logo variant="sidebar" className="h-10" />
                <p className="mt-1 text-xs text-accent-400">{user?.nome}</p>
              </div>
              <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-4">
                {navGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {group.title}
                    </p>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={navLinkClass}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>
              <div className="border-t border-white/10 p-4">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-sm"
                >
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                  {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-lg bg-primary-700 py-2 text-sm hover:bg-primary-600"
                >
                  Sair
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden bg-surface-muted p-4 pb-20 md:p-8 md:pb-8">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-line bg-panel md:hidden dark:border-slate-800 dark:bg-slate-950">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? 'text-primary-600 dark:text-primary-300' : 'text-slate-500'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
