import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clientesApi } from '../../services/modules.service';
import type { Cliente } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Tabs, Badge, Button, Card, Input, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tab, setTab] = useState('dados');
  const [loading, setLoading] = useState(true);
  const [interacao, setInteracao] = useState({ tipo: 'observacao', descricao: '' });

  const carregar = () => {
    if (!id) return;
    clientesApi.buscar(id).then(setCliente).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [id]);

  const mudarStatus = async (status: string) => {
    if (!id) return;
    await clientesApi.status(id, status);
    toast('Status atualizado', 'success');
    carregar();
  };

  const registrarInteracao = async () => {
    if (!id || !interacao.descricao) return;
    await clientesApi.interacao(id, interacao);
    setInteracao({ tipo: 'observacao', descricao: '' });
    toast('Interação registrada', 'success');
    carregar();
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
            <Link to={`/clientes/${id}/editar`}><Button variant="secondary">Editar</Button></Link>
            <Badge>{cliente.status}</Badge>
            {cliente.status !== 'ativo' && <Button variant="secondary" onClick={() => mudarStatus('ativo')}>Ativar</Button>}
            {cliente.status !== 'bloqueado' && <Button variant="danger" onClick={() => mudarStatus('bloqueado')}>Bloquear</Button>}
          </div>
        }
      />

      <Tabs tabs={[{ key: 'dados', label: 'Dados' }, { key: 'pedidos', label: 'Pedidos' }, { key: 'crm', label: 'Histórico CRM' }, { key: 'financeiro', label: 'Financeiro' }]} active={tab} onChange={setTab} />

      {tab === 'dados' && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><span className="text-slate-500">Documento:</span> {cliente.cpf || cliente.cnpj}</div>
            <div><span className="text-slate-500">Telefone:</span> {cliente.telefone}</div>
            <div className="sm:col-span-2"><span className="text-slate-500">Endereço:</span> {end.rua}, {end.numero} — {end.cidade}/{end.uf}</div>
          </div>
        </Card>
      )}

      {tab === 'pedidos' && (
        <Card>
          {cliente.pedidos?.length ? cliente.pedidos.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-3 last:border-0">
              <div><p className="font-medium">{p.numero}</p><p className="text-sm text-slate-500">{formatDate(p.createdAt)}</p></div>
              <div className="text-right"><Badge>{p.status}</Badge><p className="mt-1 font-medium">{formatCurrency(p.valor)}</p></div>
            </div>
          )) : <p className="text-slate-400">Nenhum pedido</p>}
        </Card>
      )}

      {tab === 'crm' && (
        <Card>
          <div className="mb-4 rounded-lg border border-slate-200 p-4">
            <h4 className="mb-2 font-medium">Nova interação</h4>
            <Select label="Tipo" value={interacao.tipo} onChange={(e) => setInteracao({ ...interacao, tipo: e.target.value })}>
              <option value="ligacao">Ligação</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="observacao">Observação</option>
            </Select>
            <Input label="Descrição" value={interacao.descricao} onChange={(e) => setInteracao({ ...interacao, descricao: e.target.value })} />
            <Button onClick={registrarInteracao}>Registrar</Button>
          </div>
          {cliente.interacoes?.map((i) => (
            <div key={i.id} className="border-b py-3 last:border-0">
              <div className="flex justify-between"><Badge>{i.tipo}</Badge><span className="text-xs text-slate-400">{formatDate(i.data)}</span></div>
              <p className="mt-1 text-sm">{i.descricao}</p>
              <p className="text-xs text-slate-400">{i.usuario?.nome}</p>
            </div>
          )) || <p className="text-slate-400">Nenhuma interação</p>}
        </Card>
      )}

      {tab === 'financeiro' && (
        <Card>
          {cliente.pagamentos?.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-3 last:border-0">
              <Badge>{p.status}</Badge>
              <span className="font-medium">{formatCurrency(p.valor)}</span>
            </div>
          )) || <p className="text-slate-400">Nenhuma cobrança</p>}
        </Card>
      )}
    </div>
  );
}
