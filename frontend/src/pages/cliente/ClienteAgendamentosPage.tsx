import { useEffect, useState } from 'react';
import { solicitacaoApi, agendamentoApi } from '../../services/modules.service';
import type { SolicitacaoMinha } from '../../types';
import { formatDate } from '../../types';
import { PageHeader, Loading, Badge, Card, Button, Modal } from '../../components/ui';
import { useToast } from '../../components/Toast';

const STATUS_LABEL: Record<string, string> = {
  confirmado: 'Confirmado',
  a_caminho: 'A caminho',
  em_execucao: 'Em execução',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
  ausente: 'Ausente — reagendar',
};

export function ClienteAgendamentosPage() {
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reagendarModal, setReagendarModal] = useState<{ agId: string; solId: string } | null>(null);
  const [slots, setSlots] = useState<Array<{ data: string; horarioInicio: string; horarioFim: string; label: string }>>([]);
  const [slotSel, setSlotSel] = useState<{ data: string; horarioInicio: string; horarioFim: string } | null>(null);

  const carregar = () => {
    setLoading(true);
    solicitacaoApi.minhas().then(setSolicitacoes).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const comAgendamento = solicitacoes.filter((s) => s.agendamento);

  const cancelar = async (agendamentoId: string) => {
    if (!confirm('Deseja cancelar este agendamento? Taxa pode ser aplicada se faltar menos de 2h.')) return;
    setActionId(agendamentoId);
    try {
      await agendamentoApi.cancelar(agendamentoId);
      toast('Agendamento cancelado', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao cancelar', 'error');
    } finally {
      setActionId(null);
    }
  };

  const abrirReagendar = async (agId: string, solId: string) => {
    setReagendarModal({ agId, solId });
    setSlotSel(null);
    try {
      const h = await solicitacaoApi.horarios(solId);
      setSlots(h.slots);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao buscar horários', 'error');
    }
  };

  const confirmarReagendar = async () => {
    if (!reagendarModal || !slotSel) return;
    setActionId(reagendarModal.agId);
    try {
      await agendamentoApi.reagendar(reagendarModal.agId, slotSel);
      toast('Reagendamento confirmado!', 'success');
      setReagendarModal(null);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao reagendar', 'error');
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Meus Agendamentos" subtitle="Gerencie seus horários de atendimento" />

      {comAgendamento.length === 0 ? (
        <Card><p className="text-slate-400">Nenhum agendamento encontrado</p></Card>
      ) : (
        comAgendamento.map((s) => {
          const ag = s.agendamento!;
          const podeCancelar = ['confirmado', 'a_caminho'].includes(ag.status);
          const podeReagendar = ag.status === 'ausente';

          return (
            <Card key={s.id} className="mb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-primary-800">{s.servico?.nome || 'Serviço'}</h3>
                  {s.pedido && <p className="text-sm text-slate-500">Pedido {s.pedido.numero}</p>}
                  <p className="mt-2 text-sm">
                    📅 {formatDate(ag.data)} · {ag.horarioInicio} — {ag.horarioFim}
                  </p>
                </div>
                <Badge color={
                  ag.status === 'confirmado' ? 'bg-green-100 text-green-700'
                    : ag.status === 'cancelado' ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }>
                  {STATUS_LABEL[ag.status] || ag.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {podeCancelar && (
                  <Button variant="danger" disabled={actionId === ag.id} onClick={() => cancelar(ag.id)}>
                    Cancelar
                  </Button>
                )}
                {podeReagendar && (
                  <Button onClick={() => abrirReagendar(ag.id, s.id)}>Reagendar</Button>
                )}
              </div>
            </Card>
          );
        })
      )}

      <Modal open={!!reagendarModal} onClose={() => setReagendarModal(null)} title="Reagendar atendimento">
        {slots.length === 0 ? (
          <p className="text-slate-500">Nenhum horário disponível no momento.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlotSel({ data: s.data, horarioInicio: s.horarioInicio, horarioFim: s.horarioFim })}
                className={`w-full rounded-lg border p-3 text-left text-sm ${
                  slotSel?.data === s.data && slotSel?.horarioInicio === s.horarioInicio
                    ? 'border-primary-600 bg-primary-50' : 'border-abs-gray'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <Button variant="cta" className="mt-4 w-full" disabled={!slotSel || !!actionId} onClick={confirmarReagendar}>
          Confirmar novo horário
        </Button>
      </Modal>
    </div>
  );
}
