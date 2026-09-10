import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientesApi } from '../../services/modules.service';
import { exportarCsv } from '../../utils/export';
import { useToast } from '../../components/Toast';
import type { Cliente } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Button, TableWrapper } from '../../components/ui';

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const { toast } = useToast();

  const carregar = () => {
    setLoading(true);
    clientesApi.listar({ busca, tipo, status }).then((r) => setClientes(r.clientes)).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [busca, tipo, status]);

  const statusColor: Record<string, string> = {
    ativo: 'bg-green-100 text-green-700',
    inativo: 'bg-slate-100 text-slate-600',
    bloqueado: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Gestão de clientes PF e PJ"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportarCsv(() => clientesApi.exportar(), 'clientes.csv').then(() => toast('Exportado!', 'success'))}>Exportar CSV</Button>
            <Link to="/clientes/novo"><Button>Novo Cliente</Button></Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          <option value="PF">PF</option>
          <option value="PJ">PJ</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      {loading ? <Loading /> : (
        <TableWrapper className="border-slate-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Última compra</th>
                <th className="px-4 py-3">Nº serviços</th>
                <th className="px-4 py-3">Total gasto</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ver</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3">{c.telefone}</td>
                  <td className="px-4 py-3">{c.ultimaCompra ? formatDate(c.ultimaCompra) : '—'}</td>
                  <td className="px-4 py-3">{c.numeroServicos ?? 0}</td>
                  <td className="px-4 py-3">{formatCurrency(c.totalGasto ?? 0)}</td>
                  <td className="px-4 py-3 capitalize">{c.origem || '—'}</td>
                  <td className="px-4 py-3"><Badge color={statusColor[c.status]}>{c.status}</Badge></td>
                  <td className="px-4 py-3">
                    <Link to={`/clientes/${c.id}`} className="text-primary-600 hover:underline">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}
    </div>
  );
}
