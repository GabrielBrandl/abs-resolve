import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { nfseAdminApi } from '../../services/modules.service';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Button, Card, Input, Select, TableWrapper } from '../../components/ui';
import { useToast } from '../../components/Toast';

type NfseItem = {
  id: string;
  status: string;
  numero?: string | null;
  codigoVerificacao?: string | null;
  pdfUrl?: string | null;
  mensagemErro?: string | null;
  createdAt: string;
  pedido?: {
    id: string;
    numero: string;
    valor?: number | string | null;
    cliente?: { id: string; nome: string } | null;
  } | null;
  pagamento?: {
    id: string;
    valor?: number | string | null;
    metodo?: string | null;
    status?: string | null;
  } | null;
};

type Dashboard = {
  total: number;
  autorizadas: number;
  processando: number;
  erro: number;
  valorEmitido: number;
  mockMode: boolean;
  ambiente: string;
  provider: string;
};

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'autorizada', label: 'Autorizada' },
  { value: 'processando', label: 'Processando' },
  { value: 'erro', label: 'Erro' },
  { value: 'cancelada', label: 'Cancelada' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'autorizada':
      return <Badge color="bg-green-100 text-green-800">Autorizada</Badge>;
    case 'processando':
      return <Badge color="bg-amber-100 text-amber-800">Processando</Badge>;
    case 'erro':
      return <Badge color="bg-red-100 text-red-800">Erro</Badge>;
    case 'cancelada':
      return <Badge color="bg-slate-100 text-slate-700">Cancelada</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function NfseAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [lista, setLista] = useState<NfseItem[]>([]);
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [pagamentoId, setPagamentoId] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (busca.trim()) params.busca = busca.trim();
      const [d, l] = await Promise.all([nfseAdminApi.dashboard(), nfseAdminApi.listar(params)]);
      setDash(d);
      setLista(l);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao carregar NFS-e', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, busca, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const consultar = async (id: string) => {
    setBusyId(id);
    try {
      await nfseAdminApi.consultar(id);
      toast('Consulta atualizada', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao consultar', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const reemitir = async (id: string) => {
    if (!window.confirm('Reemitir esta NFS-e?')) return;
    setBusyId(id);
    try {
      await nfseAdminApi.reemitir(id);
      toast('Reemissão solicitada', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao reemitir', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const emitirPagamento = async () => {
    if (!pagamentoId.trim()) {
      toast('Informe o ID do pagamento', 'error');
      return;
    }
    setBusyId('emitir');
    try {
      await nfseAdminApi.emitir(pagamentoId.trim());
      toast('Emissão solicitada', 'success');
      setPagamentoId('');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao emitir', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !dash) return <Loading />;

  return (
    <div>
      <PageHeader
        title="NFS-e"
        subtitle={
          dash
            ? `${dash.provider} · ${dash.ambiente}${dash.mockMode ? ' · modo mock' : ''}`
            : 'Notas fiscais de serviço'
        }
      />

      {dash && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Total', dash.total],
            ['Autorizadas', dash.autorizadas],
            ['Processando', dash.processando],
            ['Com erro', dash.erro],
            ['Valor emitido', formatCurrency(dash.valorEmitido)],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="mb-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Número, pedido ou cliente"
          />
          <Input
            label="Emitir por pagamento (ID)"
            value={pagamentoId}
            onChange={(e) => setPagamentoId(e.target.value)}
            placeholder="UUID do pagamento"
          />
          <div className="flex items-end gap-2">
            <Button onClick={carregar} variant="secondary">
              Atualizar
            </Button>
            <Button onClick={emitirPagamento} disabled={busyId === 'emitir'}>
              Emitir
            </Button>
          </div>
        </div>
      </Card>

      <TableWrapper>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Pedido</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  Nenhuma NFS-e encontrada
                </td>
              </tr>
            )}
            {lista.map((n) => (
              <tr key={n.id} className="border-b border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(n.createdAt)}</td>
                <td className="px-3 py-2 font-medium">{n.numero || '—'}</td>
                <td className="px-3 py-2">
                  {n.pedido ? (
                    <Link to={`/pedidos/${n.pedido.id}`} className="text-primary-600 hover:underline">
                      {n.pedido.numero}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">{n.pedido?.cliente?.nome || '—'}</td>
                <td className="px-3 py-2">
                  {formatCurrency(Number(n.pagamento?.valor ?? n.pedido?.valor ?? 0))}
                </td>
                <td className="px-3 py-2">
                  {statusBadge(n.status)}
                  {n.mensagemErro && (
                    <p className="mt-1 max-w-[200px] truncate text-[11px] text-red-600" title={n.mensagemErro}>
                      {n.mensagemErro}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="secondary"
                      disabled={busyId === n.id}
                      onClick={() => consultar(n.id)}
                    >
                      Consultar
                    </Button>
                    {(n.status === 'erro' || n.status === 'processando') && (
                      <Button variant="secondary" disabled={busyId === n.id} onClick={() => reemitir(n.id)}>
                        Reemitir
                      </Button>
                    )}
                    {n.pdfUrl && (
                      <a
                        href={n.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg bg-abs-gray px-3 py-2 text-sm font-medium text-primary-700 hover:bg-slate-200"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
}
