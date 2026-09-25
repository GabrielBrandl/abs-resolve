import { Navigate } from 'react-router-dom';

/** Compatibilidade: /crm → CRM B2C */
export function CRMPage() {
  return <Navigate to="/crm/b2c" replace />;
}
