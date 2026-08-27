import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { getHomeForRole } from './utils/auth-routes';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute, PublicRoute, StaffOnlyRoute, ClienteOnlyRoute } from './components/ProtectedRoute';
import { Loading } from './components/ui';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const CadastroPage = lazy(() => import('./pages/CadastroPage').then((m) => ({ default: m.CadastroPage })));
const EsqueciSenhaPage = lazy(() => import('./pages/EsqueciSenhaPage').then((m) => ({ default: m.EsqueciSenhaPage })));
const RedefinirSenhaPage = lazy(() => import('./pages/RedefinirSenhaPage').then((m) => ({ default: m.RedefinirSenhaPage })));
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
const AgendaTecnicoPage = lazy(() => import('./pages/admin/AgendaAdminPage').then((m) => ({ default: m.AgendaTecnicoPage })));
const OrcamentosAdminPage = lazy(() => import('./pages/admin/OrcamentosAdminPage').then((m) => ({ default: m.OrcamentosAdminPage })));
const QuestionariosAdminPage = lazy(() => import('./pages/admin/QuestionariosAdminPage').then((m) => ({ default: m.QuestionariosAdminPage })));
const ParceirosAdminPage = lazy(() => import('./pages/admin/ParceirosAdminPage').then((m) => ({ default: m.ParceirosAdminPage })));
const IaTreinamentoAdminPage = lazy(() => import('./pages/admin/IaTreinamentoAdminPage').then((m) => ({ default: m.IaTreinamentoAdminPage })));
const ParceiroDashboardPage = lazy(() => import('./pages/parceiro/ParceiroDashboardPage').then((m) => ({ default: m.ParceiroDashboardPage })));
const ClientePedidosPage = lazy(() => import('./pages/cliente/ClientePedidosPage').then((m) => ({ default: m.ClientePedidosPage })));
const ClienteFinanceiroPage = lazy(() => import('./pages/cliente/ClienteFinanceiroPage').then((m) => ({ default: m.ClienteFinanceiroPage })));
const ClienteCadastroPage = lazy(() => import('./pages/cliente/ClientePortalPages').then((m) => ({ default: m.ClienteCadastroPage })));
const ClienteDocumentosPage = lazy(() => import('./pages/cliente/ClienteDocumentosPage').then((m) => ({ default: m.ClienteDocumentosPage })));
const ClienteGarantiasPage = lazy(() => import('./pages/cliente/ClienteGarantiasPage').then((m) => ({ default: m.ClienteGarantiasPage })));
const TecnicoLayout = lazy(() => import('./pages/tecnico/TecnicoLayout').then((m) => ({ default: m.TecnicoLayout })));
const TecnicoHomePage = lazy(() => import('./pages/tecnico/TecnicoHomePage').then((m) => ({ default: m.TecnicoHomePage })));
const StoreLayout = lazy(() => import('./components/loja/StoreLayout').then((m) => ({ default: m.StoreLayout })));
const AccountLayout = lazy(() => import('./components/loja/AccountLayout').then((m) => ({ default: m.AccountLayout })));
const HomePage = lazy(() => import('./pages/loja/HomePage').then((m) => ({ default: m.HomePage })));
const CategoryPage = lazy(() => import('./pages/loja/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const ServicePage = lazy(() => import('./pages/loja/ServicePage').then((m) => ({ default: m.ServicePage })));
const SearchPage = lazy(() => import('./pages/loja/SearchPage').then((m) => ({ default: m.SearchPage })));
const CartPage = lazy(() => import('./pages/loja/CartPage').then((m) => ({ default: m.CartPage })));
const AccountHomePage = lazy(() => import('./pages/loja/AccountHomePage').then((m) => ({ default: m.AccountHomePage })));
const CashbackPage = lazy(() => import('./pages/loja/CashbackPage').then((m) => ({ default: m.CashbackPage })));
const ReferralPage = lazy(() => import('./pages/loja/ReferralPage').then((m) => ({ default: m.ReferralPage })));

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
        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/c/:slug" element={<CategoryPage />} />
          <Route path="/s/:slug" element={<ServicePage />} />
          <Route path="/busca" element={<SearchPage />} />
          <Route path="/carrinho" element={<CartPage />} />
        </Route>

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'comercial', 'operacional']} />}>
          <Route element={<StaffOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/gestao" element={<HomeRedirect />} />
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
              <Route path="/admin/agenda" element={<Navigate to="/agenda" replace />} />
              <Route path="/admin/orcamentos" element={<OrcamentosAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'comercial', 'operacional']} />}>
          <Route element={<StaffOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/agenda" element={<AgendaAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<StaffOnlyRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/questionarios" element={<QuestionariosAdminPage />} />
              <Route path="/admin/parceiros" element={<ParceirosAdminPage />} />
              <Route path="/admin/ia" element={<IaTreinamentoAdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['parceiro', 'admin']} />}>
          <Route path="/parceiro" element={<ParceiroDashboardPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['operacional', 'admin']} />}>
          <Route element={<TecnicoLayout />}>
            <Route path="/tecnico" element={<TecnicoHomePage />} />
            <Route path="/tecnico/agenda" element={<AgendaTecnicoPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['cliente']} />}>
          <Route element={<ClienteOnlyRoute />}>
            <Route element={<StoreLayout />}>
              <Route path="/agendar" element={<AgendarServicoPage />} />
            </Route>
            <Route element={<AccountLayout />}>
              <Route path="/conta" element={<AccountHomePage />} />
              <Route path="/conta/servicos" element={<ClientePedidosPage />} />
              <Route path="/conta/cashback" element={<CashbackPage />} />
              <Route path="/conta/indique" element={<ReferralPage />} />
              <Route path="/conta/garantias" element={<ClienteGarantiasPage />} />
              <Route path="/conta/enderecos" element={<ClienteCadastroPage />} />
              <Route path="/conta/pagamentos" element={<ClienteFinanceiroPage />} />
              <Route path="/conta/notas" element={<ClienteDocumentosPage />} />
              <Route path="/conta/dados" element={<ClienteCadastroPage />} />
              <Route path="/cliente/diagnostico" element={<DiagnosticoIAPage />} />
            </Route>
            <Route path="/cliente" element={<Navigate to="/conta/servicos" replace />} />
            <Route path="/cliente/agendar" element={<Navigate to="/agendar" replace />} />
            <Route path="/cliente/financeiro" element={<Navigate to="/conta/pagamentos" replace />} />
            <Route path="/cliente/cadastro" element={<Navigate to="/conta/dados" replace />} />
            <Route path="/cliente/documentos" element={<Navigate to="/conta/notas" replace />} />
            <Route path="/cliente/garantias" element={<Navigate to="/conta/garantias" replace />} />
            <Route path="/cliente/agendamentos" element={<Navigate to="/conta/servicos" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
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
