import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clientesApi } from '../../services/modules.service';
import type { Cliente } from '../../types';
import { formatCurrency, formatDate, formatEndereco, mapsLink } from '../../types';
import { PageHeader, Loading, Tabs, Badge, Button, Card, Input, Select } from '../../components/ui';
import { BotaoVerFotos } from '../../components/GaleriaFotos';
import { fotosDaSolicitacao } from '../../utils/fotos';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  const canEditPortal = hasRole('admin', 'comercial');
  const { toast } = useToast();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tab, setTab] = useState('dados');
  const [loading, setLoading] = useState(true);
  const [interacao, setInteracao] = useState({ tipo: 'observacao', descricao: '' });
  const [portalForm, setPortalForm] = useState({ nome: '', email: '', senha: '' });

  const carregar = () => {
    if (!id) return;
    clientesApi.buscar(id).then((c) => {
      setCliente(c);
      setPortalForm({ nome: c.nome, email: c.user?.email || c.email, senha: '' });
    }).finally(() => setLoading(false));
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

  const salvarPortal = async () => {
    if (!id) return;
    try {
      await clientesApi.atualizarAcessoPortal(id, {
        nome: portalForm.nome,
        email: portalForm.email,
        ...(portalForm.senha ? { senha: portalForm.senha } : {}),
      });
      toast('Acesso ao portal atualizado!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const excluirCliente = async () => {
    if (!id || !confirm('Excluir este cliente permanentemente? Só é possível se não houver pedidos.')) return;
    try {
      await clientesApi.excluir(id);
      toast('Cliente excluído', 'success');
      navigate('/clientes');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  if (loading) return <Loading />;
  if (!cliente) return <p>Cliente não encontrado</p>;

  const end = cliente.endereco as Record<string, string>;
  const mapUrl = mapsLink(end);

  const tabs = [
    { key: 'dados', label: 'Dados' },
    ...(canEditPortal ? [{ key: 'portal', label: 'Acesso portal' }] : []),
    { key: 'pedidos', label: 'Pedidos' },
    { key: 'fotos', label: 'Fotos enviadas' },
    { key: 'crm', label: 'Histórico CRM' },
    { key: 'financeiro', label: 'Financeiro' },
  ];

  return (
    <div>
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.tipo} · ${cliente.email}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to={`/clientes/${id}/editar`}><Button variant="secondary">Editar cadastro</Button></Link>
            <Badge>{cliente.status}</Badge>
            {cliente.status !== 'ativo' && <Button variant="secondary" onClick={() => mudarStatus('ativo')}>Ativar</Button>}
            {cliente.status !== 'bloqueado' && <Button variant="danger" onClick={() => mudarStatus('bloqueado')}>Bloquear</Button>}
            {isAdmin && <Button variant="danger" onClick={excluirCliente}>Excluir cliente</Button>}
          </div>
        }
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'dados' && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><span className="text-slate-500">Documento:</span> {cliente.cpf || cliente.cnpj}</div>
            <div><span className="text-slate-500">Telefone:</span> {cliente.telefone}</div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Endereço:</span> {formatEndereco(end)}
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="ml-2 text-sm text-primary-600 underline">
                  Ver no mapa
                </a>
              )}
            </div>
            {cliente.user && (
              <div className="sm:col-span-2 text-sm text-slate-600">
                Portal: <strong>{cliente.user.email}</strong>
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'portal' && canEditPortal && (
        <Card className="max-w-lg">
          {!cliente.user ? (
            <p className="text-slate-500">Este cliente ainda não possui usuário no portal. Crie o acesso em &quot;Editar cadastro&quot; com a opção de portal.</p>
          ) : (
            <>
              <h3 className="mb-3 font-semibold">Credenciais do portal</h3>
              <Input label="Nome exibido" value={portalForm.nome} onChange={(e) => setPortalForm({ ...portalForm, nome: e.target.value })} />
              <Input label="Email de login" value={portalForm.email} onChange={(e) => setPortalForm({ ...portalForm, email: e.target.value })} />
              <Input label="Nova senha (deixe vazio para manter)" type="password" value={portalForm.senha} onChange={(e) => setPortalForm({ ...portalForm, senha: e.target.value })} />
              <Button className="mt-2" onClick={salvarPortal}>Salvar acesso</Button>
            </>
          )}
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

      {tab === 'fotos' && (
        <Card>
          {cliente.solicitacoes?.length ? (
            cliente.solicitacoes.map((sol) => {
              const fotos = fotosDaSolicitacao(sol);
              if (!fotos.length) return null;
              return (
                <div key={sol.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0">
                  <div>
                    <p className="font-medium text-primary-800">{sol.servico?.nome || 'Solicitação'}</p>
                    <p className="text-sm text-slate-500">{formatDate(sol.createdAt)} · {sol.status}</p>
                  </div>
                  <BotaoVerFotos fotos={fotos} titulo={`Fotos — ${sol.servico?.nome || cliente.nome}`} />
                </div>
              );
            })
          ) : null}
          {!cliente.solicitacoes?.some((s) => fotosDaSolicitacao(s).length) && (
            <p className="text-slate-400">Nenhuma foto enviada por este cliente</p>
          )}
        </Card>
      )}

      {tab === 'crm' && (
        <Card>
          <div className="mb-4 flex gap-2">
            <Select label="" value={interacao.tipo} onChange={(e) => setInteracao({ ...interacao, tipo: e.target.value })}>
              <option value="observacao">Observação</option>
              <option value="ligacao">Ligação</option>
              <option value="email">Email</option>
              <option value="visita">Visita</option>
            </Select>
            <Input label="" value={interacao.descricao} onChange={(e) => setInteracao({ ...interacao, descricao: e.target.value })} placeholder="Descrição..." />
            <Button onClick={registrarInteracao} className="self-end">Registrar</Button>
          </div>
          {cliente.interacoes?.map((i) => (
            <div key={i.id} className="border-b py-2 text-sm last:border-0">
              <Badge>{i.tipo}</Badge>
              <span className="ml-2">{i.descricao}</span>
              <span className="float-right text-xs text-slate-400">{formatDate(i.data)}</span>
            </div>
          )) || <p className="text-slate-400">Nenhuma interação</p>}
        </Card>
      )}

      {tab === 'financeiro' && (
        <Card>
          {cliente.pagamentos?.length ? cliente.pagamentos.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-3 last:border-0">
              <div><p className="font-medium">{formatCurrency(p.valor)}</p><p className="text-sm text-slate-500">{p.createdAt ? formatDate(p.createdAt) : formatDate(p.dueDate)}</p></div>
              <Badge>{p.status}</Badge>
            </div>
          )) : <p className="text-slate-400">Nenhum pagamento</p>}
        </Card>
      )}
    </div>
  );
}
