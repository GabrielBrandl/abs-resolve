import { useEffect, useState } from 'react';
import { clientePortalApi } from '../../services/modules.service';
import type { Pedido } from '../../types';
import { STATUS_PEDIDO, formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Card } from '../../components/ui';

export function ClientePedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.pedidos().then(setPedidos).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Meus Pedidos" subtitle="Acompanhe o status dos seus pedidos" />
      {pedidos.length === 0 ? (
        <Card><p className="text-slate-400">Nenhum pedido encontrado</p></Card>
      ) : (
        pedidos.map((p) => {
          const statusInfo = STATUS_PEDIDO.find((s) => s.key === p.status);
          const steps = STATUS_PEDIDO.slice(0, 5);
          const currentIdx = steps.findIndex((s) => s.key === p.status);

          return (
            <Card key={p.id} className="mb-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{p.numero}</h3>
                  <p className="text-sm text-slate-500">{formatDate(p.createdAt)} · {formatCurrency(p.valor)}</p>
                </div>
                <Badge color={statusInfo?.color}>{statusInfo?.label || p.status}</Badge>
              </div>
              <div className="mt-4 flex gap-1">
                {steps.map((s, i) => (
                  <div key={s.key} className={`h-2 flex-1 rounded-full ${i <= currentIdx ? 'bg-primary-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              {p.ordemServico && (
                <p className="mt-2 text-sm text-slate-500">OS: {p.ordemServico.etapa.replace(/_/g, ' ')}</p>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
