import { useEffect, useMemo, useState } from 'react';
import { catalogoAdminApi, adminApi, tecnicoApi } from '../../services/modules.service';
import { formatDate, formatEndereco } from '../../types';
import { PageHeader, Loading, Badge, Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';

export type AgendaItem = {
  id: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  status: string;
  servicoNome?: string;
  cliente: { nome: string; telefone: string; endereco?: Record<string, string> | null };
  tecnico?: { id?: string; nome: string } | null;
  pedido: { numero: string; descricao?: string };
};

type SlotPadrao = { inicio: string; fim: string };

const STATUS_COR: Record<string, string> = {
  confirmado: 'bg-blue-100 text-blue-800 border-blue-200',
  reagendado: 'bg-violet-100 text-violet-800 border-violet-200',
  a_caminho: 'bg-amber-100 text-amber-900 border-amber-200',
  em_execucao: 'bg-emerald-100 text-emerald-900 border-emerald-200',
};

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function inicioSemana(ref: Date) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

function labelStatus(status: string) {
  return status.replace(/_/g, ' ');
}

interface Props {
  /** admin/comercial: atribuir técnico; tecnico: só visualização */
  modo?: 'gestao' | 'visualizacao';
}

export function AgendaVirtualPage({ modo = 'gestao' }: Props) {
  const { toast } = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const podeAtribuir = modo === 'gestao' && (role === 'admin' || role === 'comercial');

  const [semanaInicio, setSemanaInicio] = useState(() => toYmd(inicioSemana(new Date())));
  const [agendamentos, setAgendamentos] = useState<AgendaItem[]>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [slotsPadrao, setSlotsPadrao] = useState<SlotPadrao[]>([
    { inicio: '08:00', fim: '10:00' },
    { inicio: '10:00', fim: '12:00' },
    { inicio: '14:00', fim: '16:00' },
    { inicio: '16:00', fim: '18:00' },
  ]);
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [somenteMeus, setSomenteMeus] = useState(modo === 'visualizacao');
  const [meuTecnicoId, setMeuTecnicoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<AgendaItem | null>(null);

  const diasSemana = useMemo(() => {
    const base = parseYmd(semanaInicio);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [semanaInicio]);

  const carregar = () => {
    setLoading(true);
    const promise =
      modo === 'visualizacao'
        ? tecnicoApi.agendaVirtual(semanaInicio, 7)
        : catalogoAdminApi.agenda(semanaInicio, 7);

    promise
      .then((r) => {
        setAgendamentos(r.agendamentos as AgendaItem[]);
        setTecnicos(r.tecnicos);
        if (r.slotsPadrao?.length) setSlotsPadrao(r.slotsPadrao);
        if ('meuTecnicoId' in r) {
          const id = (r as { meuTecnicoId?: string | null }).meuTecnicoId;
          setMeuTecnicoId(typeof id === 'string' ? id : null);
        }
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'Erro ao carregar agenda', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanaInicio, modo]);

  const filtrados = useMemo(() => {
    return agendamentos.filter((ag) => {
      if (somenteMeus && meuTecnicoId) {
        return ag.tecnico?.id === meuTecnicoId || !ag.tecnico?.id;
      }
      if (filtroTecnico === 'sem') return !ag.tecnico?.id;
      if (filtroTecnico) return ag.tecnico?.id === filtroTecnico;
      return true;
    });
  }, [agendamentos, filtroTecnico, somenteMeus, meuTecnicoId]);

  const porDiaHorario = (dia: Date, slot: SlotPadrao) => {
    const ymd = toYmd(dia);
    return filtrados.filter((ag) => {
      const dataAg = typeof ag.data === 'string' ? ag.data.slice(0, 10) : toYmd(new Date(ag.data));
      return dataAg === ymd && ag.horarioInicio === slot.inicio;
    });
  };

  const atribuir = async (agendamentoId: string, tecnicoId: string) => {
    try {
      await adminApi.atribuirTecnico(agendamentoId, tecnicoId || null);
      toast('Técnico atribuído!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const navegarSemana = (delta: number) => {
    const d = parseYmd(semanaInicio);
    d.setDate(d.getDate() + delta * 7);
    setSemanaInicio(toYmd(inicioSemana(d)));
  };

  const tituloPeriodo = `${formatDate(toYmd(diasSemana[0]))} — ${formatDate(toYmd(diasSemana[6]))}`;

  return (
    <div>
      <PageHeader
        title="Agenda Virtual"
        subtitle={
          modo === 'visualizacao'
            ? 'Veja seus atendimentos da semana'
            : 'Visão semanal da operação — atribua técnicos e acompanhe a equipe'
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navegarSemana(-1)}>
            ← Semana
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSemanaInicio(toYmd(inicioSemana(new Date())))}
          >
            Hoje
          </Button>
          <Button variant="secondary" onClick={() => navegarSemana(1)}>
            Semana →
          </Button>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Início da semana</label>
          <input
            type="date"
            value={semanaInicio}
            onChange={(e) => setSemanaInicio(toYmd(inicioSemana(parseYmd(e.target.value || toYmd(new Date())))))}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        {podeAtribuir && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Filtrar técnico</label>
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="sem">Sem técnico</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {modo === 'visualizacao' && meuTecnicoId && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={somenteMeus}
              onChange={(e) => setSomenteMeus(e.target.checked)}
            />
            Só meus + disponíveis
          </label>
        )}
        <p className="text-sm text-slate-500">{tituloPeriodo}</p>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[900px] w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 border-b border-r bg-slate-50 px-3 py-3 text-left font-semibold text-slate-600">
                    Horário
                  </th>
                  {diasSemana.map((dia) => {
                    const hoje = toYmd(dia) === toYmd(new Date());
                    return (
                      <th
                        key={toYmd(dia)}
                        className={`border-b px-2 py-3 text-center font-semibold ${
                          hoje ? 'bg-primary-50 text-primary-800' : 'text-slate-700'
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          {dia.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </div>
                        <div>{dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {slotsPadrao.map((slot) => (
                  <tr key={`${slot.inicio}-${slot.fim}`} className="align-top">
                    <td className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2 font-medium text-slate-600">
                      {slot.inicio}
                      <span className="block text-xs font-normal text-slate-400">até {slot.fim}</span>
                    </td>
                    {diasSemana.map((dia) => {
                      const itens = porDiaHorario(dia, slot);
                      return (
                        <td key={`${toYmd(dia)}-${slot.inicio}`} className="border-b border-l px-1.5 py-1.5">
                          <div className="min-h-[72px] space-y-1">
                            {itens.length === 0 ? (
                              <div className="rounded-md border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-300">
                                Livre
                              </div>
                            ) : (
                              itens.map((ag) => (
                                <button
                                  key={ag.id}
                                  type="button"
                                  onClick={() => setSelecionado(ag)}
                                  className={`block w-full rounded-lg border px-2 py-1.5 text-left transition hover:ring-2 hover:ring-primary-300 ${
                                    STATUS_COR[ag.status] || 'bg-slate-100 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  <p className="truncate text-xs font-semibold">{ag.cliente.nome}</p>
                                  <p className="truncate text-[11px] opacity-80">
                                    {ag.servicoNome || ag.pedido.descricao || ag.pedido.numero}
                                  </p>
                                  <p className="truncate text-[10px] opacity-70">
                                    {ag.tecnico?.nome || 'Sem técnico'}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card>
            <h3 className="mb-3 font-semibold text-primary-800">Lista do período ({filtrados.length})</h3>
            {filtrados.length === 0 ? (
              <p className="text-slate-400">Nenhum agendamento nesta semana</p>
            ) : (
              <div className="space-y-2">
                {filtrados.map((ag) => (
                  <div
                    key={ag.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDate(ag.data)} · {ag.horarioInicio}–{ag.horarioFim}
                      </p>
                      <p className="text-slate-600">
                        {ag.cliente.nome} · {ag.pedido.numero}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ag.servicoNome || ag.pedido.descricao || 'Serviço'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {podeAtribuir ? (
                        <select
                          value={ag.tecnico?.id || ''}
                          onChange={(e) => atribuir(ag.id, e.target.value)}
                          className="min-w-[160px] rounded-lg border px-2 py-1.5 text-xs"
                        >
                          <option value="">Atribuir técnico…</option>
                          {tecnicos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-500">{ag.tecnico?.nome || 'Sem técnico'}</span>
                      )}
                      <Badge>{labelStatus(ag.status)}</Badge>
                      <Button variant="secondary" className="text-xs" onClick={() => setSelecionado(ag)}>
                        Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {selecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelecionado(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-primary-800">{selecionado.cliente.nome}</h3>
                <p className="text-sm text-slate-500">{selecionado.pedido.numero}</p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setSelecionado(null)}>
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Quando:</span>{' '}
                {formatDate(selecionado.data)} · {selecionado.horarioInicio}–{selecionado.horarioFim}
              </p>
              <p>
                <span className="text-slate-500">Serviço:</span>{' '}
                {selecionado.servicoNome || selecionado.pedido.descricao || '—'}
              </p>
              <p>
                <span className="text-slate-500">Telefone:</span> {selecionado.cliente.telefone}
              </p>
              <p>
                <span className="text-slate-500">Endereço:</span>{' '}
                {formatEndereco(selecionado.cliente.endereco)}
              </p>
              <p>
                <span className="text-slate-500">Técnico:</span> {selecionado.tecnico?.nome || 'Não atribuído'}
              </p>
              <p>
                <span className="text-slate-500">Status:</span> {labelStatus(selecionado.status)}
              </p>
            </div>
            {podeAtribuir && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-500">Atribuir técnico</label>
                <select
                  value={selecionado.tecnico?.id || ''}
                  onChange={(e) => {
                    void atribuir(selecionado.id, e.target.value);
                    setSelecionado(null);
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Sem técnico</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Rota admin/comercial/operacional — gestão ou visualização conforme perfil */
export function AgendaAdminPage() {
  const role = useAuthStore((s) => s.user?.role);
  return <AgendaVirtualPage modo={role === 'operacional' ? 'visualizacao' : 'gestao'} />;
}

/** Rota técnico — visualização */
export function AgendaTecnicoPage() {
  return <AgendaVirtualPage modo="visualizacao" />;
}
