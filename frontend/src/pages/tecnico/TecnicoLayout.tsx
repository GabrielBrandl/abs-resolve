import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Logo } from '../../components/ui';

const navItems = [
  { label: 'Minhas OS', path: '/tecnico', icon: '🔧', end: true },
  { label: 'Agenda', path: '/tecnico/agenda', icon: '📅', end: false },
];

function TecnicoPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <Logo variant="sidebar" className="h-10" />
        <p className="mt-1 text-xs text-accent-400">Portal do Técnico</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
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
    </>
  );
}

export function TecnicoLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useUiStore();

  return (
    <div className="flex min-h-screen bg-surface dark:bg-surface-muted">
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-white md:flex">
        <TecnicoPanel />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:contents">
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
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-2 hover:bg-sidebar-hover"
              aria-label="Menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} aria-hidden />
            <aside className="absolute left-0 top-0 flex h-full w-56 flex-col bg-sidebar text-white shadow-xl">
              <TecnicoPanel onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden bg-surface-muted p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
