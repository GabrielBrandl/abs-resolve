import { useEffect, useState } from 'react';
import { pagamentosApi, clientesApi } from '../../services/modules.service';
import type { Pagamento, Cliente } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Modal, Input, Select, Button, Card, TableWrapper } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function FinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [dashboard, setDashboard] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [modalVia, setModalVia] = useState(false);
  const [viaData, setViaData] = useState<{ invoiceUrl?: string; pixCode?: string } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({ clienteId: '', valor: '', metodo: 'PIX', dueDate: '' });
  const { toast } = useToast();

  const carregar = async () => {
    setLoading(true);
    const [lista, dash] = await Promise.all([
      pagamentosApi.listar(status ? { status } : undefined),
      pagamentosApi.dashboard(),
    ]);
    setPagamentos(lista);
    setDashboard(dash);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [status]);

  const abrirModal = async () => {
    const r = await clientesApi.listar({ status: 'ativo' });
    setClientes(r.clientes);
    setModal(true);
  };

  const cobrar = async () => {
    await pagamentosApi.cobrar({ ...form, valor: parseFloat(form.valor) });
    setModal(false);
    toast('Cobrança gerada!', 'success');
    carregar();
  };

  const segundaVia = async (id: string) => {
    try {
      const data = await pagamentosApi.segundaVia(id) as Pagamento & { invoiceUrl?: string; pixCode?: string };
      setViaData({ invoiceUrl: data.invoiceUrl, pixCode: data.pixCode });
      setModalVia(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao gerar 2ª via', 'error');
    }
  };

  const statusColor: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    RECEIVED: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-slate-100 text-slate-600',
  };

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Cobranças e pagamentos" action={<Button onClick={abrirModal}>Nova Cobrança</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Receita do Mês', value: formatCurrency(dashboard.receitaMes || 0), color: 'text-green-600' },
          { label: 'Pendente', value: formatCurrency(dashboard.totalPendente || 0), color: 'text-amber-600' },
          { label: 'Vencido', value: formatCurrency(dashboard.totalVencido || 0), color: 'text-red-600' },
          { label: 'Inadimplência', value: `${(dashboard.inadimplencia || 0).toFixed(1)}%`, color: 'text-red-600' },
        ].map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4 rounded-lg border px-3 py-2 text-sm">
        <option value="">Todos os status</option>
        <option value="PENDING">Pendente</option>
        <option value="RECEIVED">Recebido</option>
        <option value="OVERDUE">Vencido</option>
      </select>

      {loading ? <Loading /> : (
        <TableWrapper>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{p.cliente?.nome}</td>
                  <td className="px-4 py-3">{formatCurrency(p.valor)}</td>
                  <td className="px-4 py-3">{p.metodo}</td>
                  <td className="px-4 py-3">{formatDate(p.dueDate)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-3">
                    {p.status !== 'RECEIVED' && (
                      <Button variant="secondary" onClick={() => segundaVia(p.id)} className="text-xs">2ª via</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Cobrança">
        <Select label="Cliente" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
          <option value="">Selecione...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Input label="Valor" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        <Select label="Método" value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
          <option value="PIX">PIX</option>
          <option value="BOLETO">Boleto</option>
          <option value="CARTAO">Cartão</option>
        </Select>
        <Input label="Vencimento" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <Button onClick={cobrar} className="mt-2">Gerar Cobrança</Button>
      </Modal>

      <Modal open={modalVia} onClose={() => setModalVia(false)} title="2ª Via de Cobrança">
        {viaData?.invoiceUrl && (
          <p className="mb-3">
            <a href={viaData.invoiceUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">
              Abrir fatura / boleto
            </a>
          </p>
        )}
        {viaData?.pixCode && (
          <div>
            <p className="mb-1 text-sm text-slate-500">Código PIX copia e cola:</p>
            <textarea readOnly value={viaData.pixCode} className="w-full rounded border p-2 text-xs" rows={4} />
          </div>
        )}
        {!viaData?.invoiceUrl && !viaData?.pixCode && (
          <p className="text-slate-500">Nenhum link disponível para este pagamento.</p>
        )}
      </Modal>
    </div>
  );
}
