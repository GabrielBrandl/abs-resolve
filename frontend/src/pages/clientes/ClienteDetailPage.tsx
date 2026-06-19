import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { clientesApi } from '../../services/modules.service';
import type { Cliente } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Tabs, Badge, Button, Card } from '../../components/ui';

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tab, setTab] = useState('dados');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) clientesApi.buscar(id).then(setCliente).finally(() => setLoading(false));
  }, [id]);

  const mudarStatus = async (status: string) => {
    if (!id) return;
    const updated = await clientesApi.status(id, status);
    setCliente((c) => c ? { ...c, status: updated.status } : c);
  };

  if (loading) return <Loading />;
  if (!cliente) return <p>Cliente não encontrado</p>;

  const end = cliente.endereco as Record<string, string>;

  return (
    <div>
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.tipo} · ${cliente.email}`}
        action={
          <div className="flex gap-2">
            <Badge>{cliente.status}</Badge>
            {cliente.status !== 'ativo' && <Button variant="secondary" onClick={() => mudarStatus('ativo')}>Ativar</Button>}
            {cliente.status !== 'bloqueado' && <Button variant="danger" onClick={() => mudarStatus('bloqueado')}>Bloquear</Button>}
          </div>
        }
      />

      <Tabs
        tabs={[
          { key: 'dados', label: 'Dados' },
          { key: 'pedidos', label: 'Pedidos' },
          { key: 'crm', label: 'Histórico CRM' },
          { key: 'financeiro', label: 'Financeiro' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'dados' && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><span className="text-slate-500">Tipo:</span> {cliente.tipo}</div>
            <div><span className="text-slate-500">Documento:</span> {cliente.cpf || cliente.cnpj}</div>
            <div><span className="text-slate-500">Telefone:</span> {cliente.telefone}</div>
            <div><span className="text-slate-500">WhatsApp:</span> {cliente.whatsapp || '-'}</div>
            <div className="sm:col-span-2"><span className="text-slate-500">Endereço:</span> {end.rua}, {end.numero} — {end.bairro}, {end.cidade}/{end.uf}</div>
            <div><span className="text-slate-500">LGPD:</span> {cliente.consentimentoLgpd ? 'Aceito' : 'Pendente'}</div>
          </div>
        </Card>
      )}

      {tab === 'pedidos' && (
        <Card>
          {cliente.pedidos?.length ? cliente.pedidos.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-slate-100 py-3 last:border-0">
              <div>
                <p className="font-medium">{p.numero}</p>
                <p className="text-sm text-slate-500">{formatDate(p.createdAt)}</p>
              </div>
              <div className="text-right">
                <Badge>{p.status.replace(/_/g, ' ')}</Badge>
                <p className="mt-1 text-sm font-medium">{formatCurrency(p.valor)}</p>
              </div>
            </div>
          )) : <p className="text-slate-400">Nenhum pedido</p>}
        </Card>
      )}

      {tab === 'crm' && (
        <Card>
          {cliente.interacoes?.length ? cliente.interacoes.map((i) => (
            <div key={i.id} className="border-b border-slate-100 py-3 last:border-0">
              <div className="flex justify-between">
                <Badge color="bg-purple-100 text-purple-700">{i.tipo}</Badge>
                <span className="text-xs text-slate-400">{formatDate(i.data)}</span>
              </div>
              <p className="mt-1 text-sm">{i.descricao}</p>
              <p className="text-xs text-slate-400">{i.usuario?.nome}</p>
            </div>
          )) : <p className="text-slate-400">Nenhuma interação</p>}
        </Card>
      )}

      {tab === 'financeiro' && (
        <Card>
          {cliente.pagamentos?.length ? cliente.pagamentos.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-slate-100 py-3 last:border-0">
              <div>
                <Badge color={p.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>{p.status}</Badge>
                <p className="mt-1 text-sm text-slate-500">{p.metodo} · Venc. {formatDate(p.dueDate)}</p>
              </div>
              <p className="font-medium">{formatCurrency(p.valor)}</p>
            </div>
          )) : <p className="text-slate-400">Nenhuma cobrança</p>}
        </Card>
      )}
    </div>
  );
}
