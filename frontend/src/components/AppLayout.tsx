import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarMobileDrawer } from './Sidebar';
import { Logo } from './ui';
import { useUiStore } from '../store/uiStore';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useUiStore();

  return (
    <div className="flex min-h-screen bg-surface dark:bg-surface-muted">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col md:contents">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-sidebar px-4 py-3 text-white md:hidden">
          <Logo variant="sidebar" className="h-8" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-sidebar-hover"
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
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

        <SidebarMobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface-muted dark:bg-surface-muted">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
