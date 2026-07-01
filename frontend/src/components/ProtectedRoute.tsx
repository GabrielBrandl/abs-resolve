import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';
import { getHomeForRole } from '../utils/auth-routes';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getHomeForRole(user.role)} replace />;
  }

  return <Outlet />;
}

/** Bloqueia cliente de ver layout administrativo mesmo se a rota falhar */
export function StaffOnlyRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'cliente') {
    return <Navigate to="/cliente/agendar" replace />;
  }
  return <Outlet />;
}

/** Bloqueia equipe de ver portal do cliente */
export function ClienteOnlyRoute() {
  const user = useAuthStore((s) => s.user);
  if (user && user.role !== 'cliente') {
    return <Navigate to={getHomeForRole(user.role)} replace />;
  }
  return <Outlet />;
}
