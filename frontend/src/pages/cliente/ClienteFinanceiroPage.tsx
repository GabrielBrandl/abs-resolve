import { useEffect, useState } from 'react';
import { clientePortalApi } from '../../services/modules.service';
import type { Pagamento } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Card, Button } from '../../components/ui';

export function ClienteFinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.financeiro().then(setPagamentos).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const statusColor: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    RECEIVED: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Suas cobranças e pagamentos" />
      {pagamentos.map((p) => (
        <Card key={p.id} className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <Badge color={statusColor[p.status]}>{p.status}</Badge>
              <p className="mt-1 font-medium">{formatCurrency(p.valor)}</p>
              <p className="text-sm text-slate-500">{p.metodo} · Venc. {formatDate(p.dueDate)}</p>
            </div>
            {p.invoiceUrl && (
              <a href={p.invoiceUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">2ª Via</Button>
              </a>
            )}
          </div>
          {p.pixCode && (
            <div className="mt-3 rounded bg-slate-50 p-2">
              <p className="text-xs text-slate-500">PIX Copia e Cola:</p>
              <p className="break-all font-mono text-xs">{p.pixCode}</p>
            </div>
          )}
        </Card>
      ))}
      {!pagamentos.length && <Card><p className="text-slate-400">Nenhuma cobrança</p></Card>}
    </div>
  );
}
