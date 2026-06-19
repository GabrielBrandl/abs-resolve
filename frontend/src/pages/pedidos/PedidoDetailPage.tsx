import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pedidosApi, osApi } from '../../services/modules.service';
import type { Pedido } from '../../types';
import { STATUS_PEDIDO, ETAPAS_OS, formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Button, Card } from '../../components/ui';

export function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) pedidosApi.buscar(id).then(setPedido).finally(() => setLoading(false));
  }, [id]);

  const mudarStatus = async (status: string) => {
    if (!id) return;
    const updated = await pedidosApi.status(id, status);
    setPedido(updated);
  };

  const criarOS = async () => {
    if (!id) return;
    await pedidosApi.criarOS(id, { parceiro: 'A definir' });
    const updated = await pedidosApi.buscar(id);
    setPedido(updated);
  };

  const mudarEtapaOS = async (etapa: string) => {
    if (!pedido?.ordemServico) return;
    await osApi.etapa(pedido.ordemServico.id, etapa);
    const updated = await pedidosApi.buscar(pedido.id);
    setPedido(updated);
  };

  if (loading) return <Loading />;
  if (!pedido) return <p>Pedido não encontrado</p>;

  const statusIdx = STATUS_PEDIDO.findIndex((s) => s.key === pedido.status);
  const osIdx = pedido.ordemServico ? ETAPAS_OS.findIndex((e) => e.key === pedido.ordemServico!.etapa) : -1;

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
            <p><span className="text-slate-500">Responsável:</span> {pedido.responsavel}</p>
            <p><span className="text-slate-500">Status:</span> <Badge>{pedido.status.replace(/_/g, ' ')}</Badge></p>
            <p><span className="text-slate-500">Criado em:</span> {formatDate(pedido.createdAt)}</p>
            {pedido.descricao && <p><span className="text-slate-500">Descrição:</span> {pedido.descricao}</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Ordem de Serviço</h3>
            {!pedido.ordemServico && <Button onClick={criarOS}>Criar OS</Button>}
          </div>
          {pedido.ordemServico ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {ETAPAS_OS.map((e, i) => (
                  <button key={e.key} onClick={() => mudarEtapaOS(e.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      i <= osIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{e.label}</button>
                ))}
              </div>
              <p className="text-sm"><span className="text-slate-500">Parceiro:</span> {pedido.ordemServico.parceiro || '-'}</p>
              <p className="text-sm"><span className="text-slate-500">Obs:</span> {pedido.ordemServico.observacoes || '-'}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma OS criada</p>
          )}
        </Card>
      </div>
    </div>
  );
}
