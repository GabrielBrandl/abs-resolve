import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { label: 'Meus Pedidos', path: '/cliente', icon: '📦', end: true },
  { label: 'Financeiro', path: '/cliente/financeiro', icon: '💰' },
  { label: 'Solicitar Serviço', path: '/cliente/solicitar', icon: '🛒' },
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
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col bg-sidebar text-white">
        <div className="border-b border-slate-700 px-5 py-4">
          <h1 className="text-lg font-bold">Portal do Cliente</h1>
          <p className="text-xs text-slate-400">ABS Resolve</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-primary-600' : 'hover:bg-sidebar-hover'}`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-4">
          <p className="truncate text-sm">{user?.nome}</p>
          <button onClick={handleLogout} className="mt-2 w-full rounded bg-slate-700 py-1.5 text-sm hover:bg-slate-600">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
