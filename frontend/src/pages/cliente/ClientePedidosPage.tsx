import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clientePortalApi, agendamentoApi } from '../../services/modules.service';
import type { PedidoTimeline } from '../../types';
import { STATUS_PEDIDO, formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { ClienteAvaliacaoSection } from './ClienteAvaliacaoSection';

export function ClientePedidosPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const pedidoDestaque = searchParams.get('pedido');
  const [pedidos, setPedidos] = useState<PedidoTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const carregar = () => {
    clientePortalApi.pedidos().then(setPedidos).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!pedidoDestaque || loading) return;
    document.getElementById(`pedido-${pedidoDestaque}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pedidoDestaque, loading, pedidos]);

  const cancelarAgendamento = async (agendamentoId: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    setCancelando(agendamentoId);
    try {
      await agendamentoApi.cancelar(agendamentoId);
      toast('Agendamento cancelado', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao cancelar', 'error');
    } finally {
      setCancelando(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Meus Pedidos" subtitle="Acompanhe o status dos seus pedidos" />

      <ClienteAvaliacaoSection />

      {pedidos.length === 0 ? (
        <Card><p className="text-slate-400">Nenhum pedido encontrado</p></Card>
      ) : (
        pedidos.map((p) => {
          const statusInfo = STATUS_PEDIDO.find((s) => s.key === p.status);
          const ag = p.agendamento;
          const podeCancelar = ag && ['confirmado', 'a_caminho'].includes(ag.status);
          const pago = p.pagamentos?.some((pg) => pg.status === 'RECEIVED')
            || p.solicitacao?.status === 'pago'
            || ['em_execucao', 'em_processamento', 'finalizado'].includes(p.status);
          const precisaAgendar = Boolean(
            pago && !ag && p.solicitacao?.id && p.solicitacao.status !== 'agendado' && p.solicitacao.status !== 'cancelado'
          );

          return (
            <div key={p.id} id={`pedido-${p.id}`}>
            <Card className={`mb-4 ${pedidoDestaque === p.id ? 'ring-2 ring-accent-500' : ''}`}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-primary-800">{p.numero}</h3>
                  <p className="text-sm text-slate-500">
                    {formatDate(p.createdAt)} · {formatCurrency(p.valor)}
                  </p>
                  {p.solicitacao?.servico && (
                    <p className="mt-1 text-sm text-primary-600">{p.solicitacao.servico.nome}</p>
                  )}
                </div>
                <Badge color={statusInfo?.color}>{statusInfo?.label || p.status}</Badge>
              </div>

              {p.timeline && p.timeline.length > 0 && (
                <div className="mt-4 space-y-3">
                  {p.timeline.map((step) => (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                        step.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {step.done ? '✓' : '·'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${step.done ? 'text-primary-800' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-xs text-slate-400">{formatDate(String(step.date))}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {precisaAgendar && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-sm font-medium text-amber-800">
                    Pagamento confirmado — falta escolher o dia e horário.
                  </p>
                  <Link to={`/cliente/agendar?agendar=${p.solicitacao!.id}`}>
                    <Button variant="cta">Agendar horário</Button>
                  </Link>
                </div>
              )}

              {ag && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-medium text-primary-700">Agendamento</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(ag.data)} · {ag.horarioInicio}
                    {ag.horarioFim ? ` — ${ag.horarioFim}` : ''}
                  </p>
                  <Badge color="bg-blue-100 text-blue-700">{ag.status}</Badge>
                  {podeCancelar && (
                    <Button
                      variant="danger"
                      className="mt-2"
                      disabled={cancelando === ag.id}
                      onClick={() => cancelarAgendamento(ag.id)}
                    >
                      Cancelar agendamento
                    </Button>
                  )}
                </div>
              )}

              {p.ordemServico && (
                <p className="mt-2 text-sm text-slate-500">
                  OS: {p.ordemServico.etapa.replace(/_/g, ' ')}
                </p>
              )}
            </Card>
            </div>
          );
        })
      )}
    </div>
  );
}
