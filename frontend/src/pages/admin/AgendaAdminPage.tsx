import { useEffect, useState } from 'react';
import { catalogoAdminApi, adminApi } from '../../services/modules.service';
import { formatDate } from '../../types';
import { PageHeader, Loading, Badge, Card } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function AgendaAdminPage() {
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<Array<{
    id: string; data: string; horarioInicio: string; horarioFim: string; status: string;
    cliente: { nome: string; telefone: string }; tecnico?: { id?: string; nome: string };
    pedido: { numero: string; descricao?: string };
  }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');

  const carregar = () => {
    setLoading(true);
    catalogoAdminApi.agenda(dataInicio || undefined).then((r) => {
      setAgendamentos(r.agendamentos);
      setTecnicos(r.tecnicos);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [dataInicio]);

  const atribuir = async (agendamentoId: string, tecnicoId: string) => {
    try {
      await adminApi.atribuirTecnico(agendamentoId, tecnicoId || null);
      toast('Técnico atribuído!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const porData = agendamentos.reduce<Record<string, typeof agendamentos>>((acc, ag) => {
    const key = formatDate(ag.data);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ag);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Agenda Operacional" subtitle="Atribua técnicos aos serviços agendados" />

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">Data início</label>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <p className="mb-4 text-sm text-slate-500">{tecnicos.length} técnico(s) ativos</p>

      {loading ? <Loading /> : Object.keys(porData).length === 0 ? (
        <Card><p className="text-slate-400">Nenhum agendamento no período</p></Card>
      ) : (
        Object.entries(porData).map(([data, items]) => (
          <Card key={data} className="mb-4">
            <h3 className="mb-3 font-semibold text-primary-800">{data}</h3>
            <div className="space-y-2">
              {items.map((ag) => (
                <div key={ag.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="font-medium">{ag.horarioInicio} — {ag.horarioFim}</p>
                    <p className="text-slate-600">{ag.cliente.nome} · {ag.pedido.numero}</p>
                    {ag.pedido.descricao && <p className="text-xs text-slate-400">{ag.pedido.descricao}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={ag.tecnico?.id || ''}
                      onChange={(e) => atribuir(ag.id, e.target.value)}
                      className="min-w-[160px] rounded-lg border px-2 py-1.5 text-xs"
                    >
                      <option value="">Atribuir técnico…</option>
                      {tecnicos.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                    <Badge color="bg-blue-100 text-blue-700">{ag.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
