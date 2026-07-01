import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { getHomeForRole } from './utils/auth-routes';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute, PublicRoute, StaffOnlyRoute, ClienteOnlyRoute } from './components/ProtectedRoute';
import { Loading } from './components/ui';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const CadastroPage = lazy(() => import('./pages/CadastroPage').then((m) => ({ default: m.CadastroPage })));
const AgendarServicoPage = lazy(() => import('./pages/cliente/AgendarServicoPage').then((m) => ({ default: m.AgendarServicoPage })));
const DiagnosticoIAPage = lazy(() => import('./pages/cliente/DiagnosticoIAPage').then((m) => ({ default: m.DiagnosticoIAPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ClientesPage = lazy(() => import('./pages/clientes/ClientesPage').then((m) => ({ default: m.ClientesPage })));
const ClienteFormPage = lazy(() => import('./pages/clientes/ClienteFormPage').then((m) => ({ default: m.ClienteFormPage })));
const ClienteDetailPage = lazy(() => import('./pages/clientes/ClienteDetailPage').then((m) => ({ default: m.ClienteDetailPage })));
const CRMPage = lazy(() => import('./pages/crm/CRMPage').then((m) => ({ default: m.CRMPage })));
const PedidosPage = lazy(() => import('./pages/pedidos/PedidosPage').then((m) => ({ default: m.PedidosPage })));
const PedidoDetailPage = lazy(() => import('./pages/pedidos/PedidoDetailPage').then((m) => ({ default: m.PedidoDetailPage })));
const OrdemServicoPage = lazy(() => import('./pages/pedidos/OrdemServicoPage').then((m) => ({ default: m.OrdemServicoPage })));
const FinanceiroPage = lazy(() => import('./pages/financeiro/FinanceiroPage').then((m) => ({ default: m.FinanceiroPage })));
const MarketplacePage = lazy(() => import('./pages/marketplace/MarketplacePage').then((m) => ({ default: m.MarketplacePage })));
const MovimentacaoPage = lazy(() => import('./pages/movimentacao/MovimentacaoPage').then((m) => ({ default: m.MovimentacaoPage })));
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const CatalogoAdminPage = lazy(() => import('./pages/admin/CatalogoAdminPage').then((m) => ({ default: m.CatalogoAdminPage })));
const EstoqueAdminPage = lazy(() => import('./pages/admin/EstoqueAdminPage').then((m) => ({ default: m.EstoqueAdminPage })));
const AgendaAdminPage = lazy(() => import('./pages/admin/AgendaAdminPage').then((m) => ({ default: m.AgendaAdminPage })));
const OrcamentosAdminPage = lazy(() => import('./pages/admin/OrcamentosAdminPage').then((m) => ({ default: m.OrcamentosAdminPage })));
const QuestionariosAdminPage = lazy(() => import('./pages/admin/QuestionariosAdminPage').then((m) => ({ default: m.QuestionariosAdminPage })));
const ClienteLayout = lazy(() => import('./pages/cliente/ClienteLayout').then((m) => ({ default: m.ClienteLayout })));
const ClientePedidosPage = lazy(() => import('./pages/cliente/ClientePedidosPage').then((m) => ({ default: m.ClientePedidosPage })));
const ClienteFinanceiroPage = lazy(() => import('./pages/cliente/ClienteFinanceiroPage').then((m) => ({ default: m.ClienteFinanceiroPage })));
const ClienteCadastroPage = lazy(() => import('./pages/cliente/ClientePortalPages').then((m) => ({ default: m.ClienteCadastroPage })));
const ClienteDocumentosPage = lazy(() => import('./pages/cliente/ClienteDocumentosPage').then((m) => ({ default: m.ClienteDocumentosPage })));
const ClienteGarantiasPage = lazy(() => import('./pages/cliente/ClienteGarantiasPage').then((m) => ({ default: m.ClienteGarantiasPage })));
const ClienteAgendamentosPage = lazy(() => import('./pages/cliente/ClienteAgendamentosPage').then((m) => ({ default: m.ClienteAgendamentosPage })));
const TecnicoLayout = lazy(() => import('./pages/tecnico/TecnicoLayout').then((m) => ({ default: m.TecnicoLayout })));
const TecnicoHomePage = lazy(() => import('./pages/tecnico/TecnicoHomePage').then((m) => ({ default: m.TecnicoHomePage })));

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role === 'cliente' || user.role === 'operacional') {
    return <Navigate to={getHomeForRole(user?.role)} replace />;
  }
  return <DashboardPage />;
}

function AppRoutes() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'comercial', 'operacional']} />}>
          <Route element={<StaffOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/novo" element={<ClienteFormPage />} />
              <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
              <Route path="/clientes/:id" element={<ClienteDetailPage />} />
              <Route path="/crm" element={<CRMPage />} />
              <Route path="/pedidos" element={<PedidosPage />} />
              <Route path="/pedidos/:id" element={<PedidoDetailPage />} />
              <Route path="/ordens-servico" element={<OrdemServicoPage />} />
              <Route path="/financeiro" element={<FinanceiroPage />} />
              <Route path="/movimentacao" element={<MovimentacaoPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'comercial']} />}>
          <Route element={<StaffOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/catalogo" element={<CatalogoAdminPage />} />
              <Route path="/admin/estoque" element={<EstoqueAdminPage />} />
              <Route path="/admin/agenda" element={<AgendaAdminPage />} />
              <Route path="/admin/orcamentos" element={<OrcamentosAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<StaffOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/questionarios" element={<QuestionariosAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['operacional', 'admin']} />}>
          <Route element={<TecnicoLayout />}>
            <Route path="/tecnico" element={<TecnicoHomePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['cliente']} />}>
          <Route element={<ClienteOnlyRoute />}>
            <Route element={<ClienteLayout />}>
              <Route path="/cliente" element={<ClientePedidosPage />} />
              <Route path="/cliente/agendar" element={<AgendarServicoPage />} />
              <Route path="/cliente/diagnostico" element={<DiagnosticoIAPage />} />
              <Route path="/cliente/financeiro" element={<ClienteFinanceiroPage />} />
              <Route path="/cliente/solicitar" element={<Navigate to="/cliente/agendar" replace />} />
              <Route path="/cliente/cadastro" element={<ClienteCadastroPage />} />
              <Route path="/cliente/documentos" element={<ClienteDocumentosPage />} />
              <Route path="/cliente/garantias" element={<ClienteGarantiasPage />} />
              <Route path="/cliente/agendamentos" element={<ClienteAgendamentosPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
