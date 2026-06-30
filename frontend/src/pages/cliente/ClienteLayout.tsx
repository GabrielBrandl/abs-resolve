import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Logo } from '../../components/ui';

const navItems = [
  { label: 'Solicitar', path: '/cliente/agendar', icon: '🛒' },
  { label: 'Pedidos', path: '/cliente', icon: '📦', end: true },
  { label: 'Agendamentos', path: '/cliente/agendamentos', icon: '📅' },
  { label: 'Garantias', path: '/cliente/garantias', icon: '🛡️' },
  { label: 'Diagnóstico', path: '/cliente/diagnostico', icon: '📷' },
  { label: 'Financeiro', path: '/cliente/financeiro', icon: '💰' },
  { label: 'Cadastro', path: '/cliente/cadastro', icon: '👤' },
  { label: 'Documentos', path: '/cliente/documentos', icon: '📄' },
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
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col bg-sidebar text-white md:flex">
        <div className="border-b border-primary-600/30 px-4 py-4">
          <Logo variant="dark" className="h-10" />
          <p className="mt-1 text-xs text-accent-400">Portal do Cliente</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} className={navLinkClass}>
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

      {/* Mobile header */}
      <div className="flex min-h-screen flex-1 flex-col md:contents">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 text-white md:hidden">
          <Logo variant="dark" className="h-8" />
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 hover:bg-sidebar-hover"
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar text-white shadow-xl">
              <div className="border-b border-primary-600/30 px-4 py-4">
                <Logo variant="dark" className="h-10" />
                <p className="mt-1 text-xs text-accent-400">{user?.nome}</p>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
                {navItems.map((item) => (
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
              </nav>
              <div className="border-t border-primary-600/30 p-4">
                <button onClick={handleLogout} className="w-full rounded-lg bg-primary-700 py-2 text-sm hover:bg-primary-600">
                  Sair
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 bg-slate-50 p-4 pb-20 md:p-8 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t bg-white md:hidden">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? 'text-primary-600' : 'text-slate-500'
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
