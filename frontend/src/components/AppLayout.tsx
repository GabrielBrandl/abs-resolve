import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarMobileDrawer } from './Sidebar';
import { Logo } from './ui';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col md:contents">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 text-white md:hidden">
          <Logo variant="sidebar" className="h-8" />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 hover:bg-sidebar-hover"
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </header>

        <SidebarMobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
