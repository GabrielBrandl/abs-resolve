import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pedidosApi } from '../../services/modules.service';
import { exportarCsv } from '../../utils/export';
import { useToast } from '../../components/Toast';
import type { Pedido } from '../../types';
import { STATUS_PEDIDO, formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Button, TableWrapper } from '../../components/ui';

export function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    pedidosApi.listar({ busca, status }).then(setPedidos).finally(() => setLoading(false));
  }, [busca, status]);

  const statusInfo = (s: string) => STATUS_PEDIDO.find((x) => x.key === s);

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Acompanhamento de pedidos"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                exportarCsv(() => pedidosApi.exportar(), 'pedidos.csv').then(() =>
                  toast('Exportado!', 'success')
                )
              }
            >
              Exportar CSV
            </Button>
            <Button onClick={() => navigate('/pedidos/nova-venda')}>Nova Venda</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm sm:flex-1"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm sm:w-auto"
        >
          <option value="">Todos</option>
          {STATUS_PEDIDO.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <TableWrapper>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const pago = p.pagamentos?.some((pg) => pg.status === 'RECEIVED');
                return (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{p.numero}</td>
                    <td className="px-4 py-3">{p.cliente?.nome}</td>
                    <td className="px-4 py-3">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge color={statusInfo(p.status)?.color}>
                          {statusInfo(p.status)?.label || p.status}
                        </Badge>
                        {pago && <Badge color="bg-green-100 text-green-700">Pago</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/pedidos/${p.id}`} className="text-primary-600 hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
      )}
    </div>
  );
}
