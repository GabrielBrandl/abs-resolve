import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pedidosApi, osApi } from '../../services/modules.service';
import type { Pedido, OrdemServico } from '../../types';
import { STATUS_PEDIDO, ETAPAS_OS, formatCurrency, formatDate, formatEndereco } from '../../types';
import { PageHeader, Loading, Badge, Button, Card } from '../../components/ui';
import { BotaoVerFotos } from '../../components/GaleriaFotos';
import { useToast } from '../../components/Toast';

type PedidoDetalhe = Pedido & {
  solicitacao?: OrdemServico['pedido'] extends infer P
    ? P extends { solicitacao?: infer S }
      ? S
      : never
    : never;
  agendamentos?: NonNullable<OrdemServico['pedido']>['agendamentos'];
  ordemServico?: OrdemServico;
};

function fotosSolicitacao(fotos: unknown): string[] {
  if (!Array.isArray(fotos)) return [];
  return fotos.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u));
}

function fotosChecklist(checklist?: Record<string, string> | null): string[] {
  if (!checklist) return [];
  return [checklist.fotoAntes, checklist.fotoDepois, checklist.fotoConclusao, checklist.assinaturaCliente]
    .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));
}

export function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregar = () => {
    if (!id) return;
    setLoading(true);
    pedidosApi.buscar(id).then(setPedido).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [id]);

  const mudarStatus = async (status: string) => {
    if (!id) return;
    try {
      const updated = await pedidosApi.status(id, status);
      setPedido(updated as PedidoDetalhe);
      toast('Status atualizado', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const criarOS = async () => {
    if (!id) return;
    try {
      await pedidosApi.criarOS(id, { parceiro: 'A definir' });
      carregar();
      toast('OS criada!', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar OS', 'error');
    }
  };

  const mudarEtapaOS = async (etapa: string) => {
    if (!pedido?.ordemServico) return;
    try {
      await osApi.etapa(pedido.ordemServico.id, etapa);
      carregar();
      toast('Etapa da OS atualizada', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  if (loading) return <Loading />;
  if (!pedido) return <p>Pedido não encontrado</p>;

  const statusIdx = STATUS_PEDIDO.findIndex((s) => s.key === pedido.status);
  const os = pedido.ordemServico;
  const osIdx = os ? ETAPAS_OS.findIndex((e) => e.key === os.etapa) : -1;
  const servicoNome = pedido.solicitacao?.servico?.nome || pedido.servico?.nome || pedido.descricao;

  return (
    <div>
      <PageHeader title={pedido.numero} subtitle={pedido.cliente?.nome} />

      <Card className="mb-6">
        <h3 className="mb-4 font-semibold">Fluxo do Pedido</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_PEDIDO.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i <= statusIdx ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{i + 1}</div>
              <span className={`text-xs ${i <= statusIdx ? 'text-primary-600 font-medium' : 'text-slate-400'}`}>{s.label}</span>
              {i < STATUS_PEDIDO.length - 1 && <span className="mx-1 text-slate-300">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_PEDIDO.filter((s) => s.key !== pedido.status).slice(0, 3).map((s) => (
            <Button key={s.key} variant="secondary" onClick={() => mudarStatus(s.key)}>{s.label}</Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Detalhes</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Valor:</span> {formatCurrency(pedido.valor)}</p>
            <p><span className="text-slate-500">Serviço:</span> {servicoNome || '—'}</p>
            <p><span className="text-slate-500">Responsável:</span> {pedido.responsavel}</p>
            <p><span className="text-slate-500">Status:</span> <Badge>{pedido.status.replace(/_/g, ' ')}</Badge></p>
            <p><span className="text-slate-500">Criado em:</span> {formatDate(pedido.createdAt)}</p>
            {pedido.descricao && <p><span className="text-slate-500">Descrição:</span> {pedido.descricao}</p>}
            {pedido.cliente && (
              <>
                <p><span className="text-slate-500">Cliente:</span>{' '}
                  {pedido.cliente.id ? (
                    <Link to={`/clientes/${pedido.cliente.id}`} className="text-primary-600 underline">{pedido.cliente.nome}</Link>
                  ) : pedido.cliente.nome}
                </p>
                {pedido.cliente.telefone && <p><span className="text-slate-500">Telefone:</span> {pedido.cliente.telefone}</p>}
                {'endereco' in (pedido.cliente as object) && (
                  <p><span className="text-slate-500">Endereço:</span> {formatEndereco((pedido.cliente as { endereco?: Record<string, string> }).endereco)}</p>
                )}
              </>
            )}
            <BotaoVerFotos
              fotos={fotosSolicitacao(pedido.solicitacao?.fotos)}
              label="Fotos da solicitação"
              titulo="Fotos do cliente"
            />
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Ordem de Serviço</h3>
            {!os && <Button onClick={criarOS}>Criar OS</Button>}
          </div>
          {os ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {ETAPAS_OS.map((e, i) => (
                  <button key={e.key} type="button" onClick={() => mudarEtapaOS(e.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      i <= osIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{e.label}</button>
                ))}
              </div>
              <p><span className="text-slate-500">Técnico:</span> {os.tecnico?.nome || '—'}</p>
              <p><span className="text-slate-500">Parceiro:</span> {os.parceiro || '—'}</p>
              <p><span className="text-slate-500">Checklist:</span> {os.checklistCompleto ? 'Completo' : 'Pendente'}</p>
              <p><span className="text-slate-500">Obs:</span> {os.observacoes || '—'}</p>
              {os.checklist && Object.keys(os.checklist).length > 0 && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs">
                  {Object.entries(os.checklist).map(([k, v]) => (
                    <p key={k}><span className="text-slate-400">{k}:</span> {/^https?:\/\//i.test(v) ? 'anexo' : (v || '—')}</p>
                  ))}
                  <BotaoVerFotos fotos={fotosChecklist(os.checklist)} label="Ver fotos" titulo="Checklist" className="mt-1" />
                </div>
              )}
              <Link to="/ordens-servico" className="inline-block text-primary-600 underline">Ver todas as OS</Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma OS criada</p>
          )}
        </Card>

        {!!pedido.agendamentos?.length && (
          <Card>
            <h3 className="mb-3 font-semibold">Agendamentos</h3>
            <ul className="space-y-2 text-sm">
              {pedido.agendamentos.map((ag) => (
                <li key={ag.id} className="rounded-lg border border-abs-gray px-3 py-2">
                  <p>{formatDate(ag.data)} · {ag.horarioInicio}–{ag.horarioFim}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {ag.status}{ag.tecnico ? ` · ${ag.tecnico.nome}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!!pedido.pagamentos?.length && (
          <Card>
            <h3 className="mb-3 font-semibold">Pagamentos</h3>
            <ul className="space-y-2 text-sm">
              {pedido.pagamentos.map((p) => (
                <li key={p.id} className="flex justify-between rounded-lg border border-abs-gray px-3 py-2">
                  <span>{formatCurrency(p.valor)} · {p.metodo}</span>
                  <span className="text-xs text-slate-500">{p.status}{p.paymentDate ? ` · ${formatDate(p.paymentDate)}` : ''}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
