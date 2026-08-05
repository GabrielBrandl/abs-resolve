import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogoAdminApi, adminApi, tecnicoApi } from '../../services/modules.service';
import { formatDate, formatEndereco, mapsLink } from '../../types';
import { PageHeader, Loading, Button } from '../../components/ui';
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
type Visao = 'semana' | 'dia' | 'equipe' | 'lista';

const STATUS_META: Record<string, { label: string; chip: string; bar: string }> = {
  confirmado: {
    label: 'Confirmado',
    chip: 'bg-blue-50 text-blue-800 border-blue-200',
    bar: 'bg-blue-500',
  },
  reagendado: {
    label: 'Reagendado',
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    bar: 'bg-violet-500',
  },
  a_caminho: {
    label: 'A caminho',
    chip: 'bg-amber-50 text-amber-900 border-amber-200',
    bar: 'bg-amber-500',
  },
  em_execucao: {
    label: 'Em execução',
    chip: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    bar: 'bg-emerald-500',
  },
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

function dataAgYmd(ag: AgendaItem) {
  return typeof ag.data === 'string' ? ag.data.slice(0, 10) : toYmd(new Date(ag.data));
}

function statusMeta(status: string) {
  return (
    STATUS_META[status] || {
      label: status.replace(/_/g, ' '),
      chip: 'bg-slate-50 text-slate-700 border-slate-200',
      bar: 'bg-slate-400',
    }
  );
}

function CardAgendamento({
  ag,
  compact,
  onOpen,
}: {
  ag: AgendaItem;
  compact?: boolean;
  onOpen: () => void;
}) {
  const meta = statusMeta(ag.status);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.chip}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
      <div className={`pl-3 ${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}>
        <div className="flex items-start justify-between gap-2">
          <p className={`truncate font-semibold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            {ag.cliente.nome}
          </p>
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide opacity-70">
            {ag.horarioInicio}
          </span>
        </div>
        <p className={`truncate text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {ag.servicoNome || ag.pedido.descricao || ag.pedido.numero}
        </p>
        {!compact && (
          <p className="mt-1 truncate text-[11px] text-slate-500">
            {ag.tecnico?.nome || 'Sem técnico'} · {meta.label}
          </p>
        )}
      </div>
    </button>
  );
}

interface Props {
  modo?: 'gestao' | 'visualizacao';
}

export function AgendaVirtualPage({ modo = 'gestao' }: Props) {
  const { toast } = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const podeAtribuir = modo === 'gestao' && (role === 'admin' || role === 'comercial');

  const [visao, setVisao] = useState<Visao>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'dia' : 'semana'
  );
  const [semanaInicio, setSemanaInicio] = useState(() => toYmd(inicioSemana(new Date())));
  const [diaFoco, setDiaFoco] = useState(() => toYmd(new Date()));
  const [agendamentos, setAgendamentos] = useState<AgendaItem[]>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [slotsPadrao, setSlotsPadrao] = useState<SlotPadrao[]>([
    { inicio: '08:00', fim: '10:00' },
    { inicio: '10:00', fim: '12:00' },
    { inicio: '14:00', fim: '16:00' },
    { inicio: '16:00', fim: '18:00' },
  ]);
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [busca, setBusca] = useState('');
  const [somenteMeus, setSomenteMeus] = useState(modo === 'visualizacao');
  const [meuTecnicoId, setMeuTecnicoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [selecionado, setSelecionado] = useState<AgendaItem | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const diasSemana = useMemo(() => {
    const base = parseYmd(semanaInicio);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [semanaInicio]);

  const carregar = useCallback(
    (silencioso = false) => {
      if (silencioso) setAtualizando(true);
      else setLoading(true);

      const dataBase = visao === 'dia' ? diaFoco : semanaInicio;
      const promise =
        modo === 'visualizacao'
          ? tecnicoApi.agendaVirtual(visao === 'dia' ? toYmd(inicioSemana(parseYmd(diaFoco))) : semanaInicio, 7)
          : catalogoAdminApi.agenda(
              visao === 'dia' ? toYmd(inicioSemana(parseYmd(diaFoco))) : dataBase,
              7
            );

      promise
        .then((r) => {
          setAgendamentos(r.agendamentos as AgendaItem[]);
          setTecnicos(r.tecnicos);
          if (r.slotsPadrao?.length) setSlotsPadrao(r.slotsPadrao);
          if ('meuTecnicoId' in r) {
            const id = (r as { meuTecnicoId?: string | null }).meuTecnicoId;
            setMeuTecnicoId(typeof id === 'string' ? id : null);
          }
          setUltimaAtualizacao(new Date());
        })
        .catch((e) => toast(e instanceof Error ? e.message : 'Erro ao carregar agenda', 'error'))
        .finally(() => {
          setLoading(false);
          setAtualizando(false);
        });
    },
    [modo, semanaInicio, diaFoco, visao, toast]
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const id = window.setInterval(() => carregar(true), 60000);
    return () => window.clearInterval(id);
  }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return agendamentos.filter((ag) => {
      if ((visao === 'dia' || visao === 'equipe') && dataAgYmd(ag) !== diaFoco) return false;
      if (somenteMeus && meuTecnicoId) {
        if (!(ag.tecnico?.id === meuTecnicoId || !ag.tecnico?.id)) return false;
      }
      if (filtroTecnico === 'sem' && ag.tecnico?.id) return false;
      if (filtroTecnico && filtroTecnico !== 'sem' && ag.tecnico?.id !== filtroTecnico) return false;
      if (q) {
        const hay = `${ag.cliente.nome} ${ag.pedido.numero} ${ag.servicoNome || ''} ${ag.pedido.descricao || ''} ${ag.tecnico?.nome || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agendamentos, filtroTecnico, somenteMeus, meuTecnicoId, busca, visao, diaFoco]);

  const kpis = useMemo(() => {
    const base = filtrados;
    return {
      total: base.length,
      semTecnico: base.filter((a) => !a.tecnico?.id).length,
      aCaminho: base.filter((a) => a.status === 'a_caminho').length,
      emExecucao: base.filter((a) => a.status === 'em_execucao').length,
      confirmados: base.filter((a) => a.status === 'confirmado' || a.status === 'reagendado').length,
    };
  }, [filtrados]);

  const porDiaHorario = (dia: Date, slot: SlotPadrao) => {
    const ymd = toYmd(dia);
    return filtrados.filter((ag) => dataAgYmd(ag) === ymd && ag.horarioInicio === slot.inicio);
  };

  const porTecnicoDia = (tecnicoId: string | null, diaYmd: string) =>
    filtrados.filter((ag) => {
      if (dataAgYmd(ag) !== diaYmd) return false;
      if (tecnicoId === null) return !ag.tecnico?.id;
      return ag.tecnico?.id === tecnicoId;
    });

  const atribuir = async (agendamentoId: string, tecnicoId: string) => {
    try {
      await adminApi.atribuirTecnico(agendamentoId, tecnicoId || null);
      toast('Técnico atribuído!', 'success');
      carregar(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const navegarSemana = (delta: number) => {
    const d = parseYmd(semanaInicio);
    d.setDate(d.getDate() + delta * 7);
    const ini = toYmd(inicioSemana(d));
    setSemanaInicio(ini);
    setDiaFoco(ini);
  };

  const navegarDia = (delta: number) => {
    const d = parseYmd(diaFoco);
    d.setDate(d.getDate() + delta);
    setDiaFoco(toYmd(d));
    setSemanaInicio(toYmd(inicioSemana(d)));
  };

  const irHoje = () => {
    const hoje = toYmd(new Date());
    setDiaFoco(hoje);
    setSemanaInicio(toYmd(inicioSemana(new Date())));
  };

  const mapa = selecionado ? mapsLink(selecionado.cliente.endereco) : null;
  const tituloPeriodo =
    visao === 'dia'
      ? parseYmd(diaFoco).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })
      : `${formatDate(toYmd(diasSemana[0]))} — ${formatDate(toYmd(diasSemana[6]))}`;

  const visoes: Array<{ id: Visao; label: string }> = [
    { id: 'semana', label: 'Semana' },
    { id: 'dia', label: 'Dia' },
    { id: 'equipe', label: 'Equipe' },
    { id: 'lista', label: 'Lista' },
  ];

  return (
    <div className="pb-8">
      <PageHeader
        title="Agenda operacional"
        subtitle={
          modo === 'visualizacao'
            ? 'Sua programação de atendimentos — acompanhe horários, clientes e status'
            : 'Central de despacho — visualize a equipe, preencha vagas e acompanhe a operação'
        }
        action={
          <Button variant="secondary" onClick={() => carregar(true)} disabled={atualizando}>
            {atualizando ? 'Atualizando…' : 'Atualizar'}
          </Button>
        }
      />

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Atendimentos', value: kpis.total, tone: 'text-primary-800' },
          { label: 'Confirmados', value: kpis.confirmados, tone: 'text-blue-700' },
          { label: 'Sem técnico', value: kpis.semTecnico, tone: 'text-rose-700' },
          { label: 'A caminho', value: kpis.aCaminho, tone: 'text-amber-700' },
          { label: 'Em execução', value: kpis.emExecucao, tone: 'text-emerald-700' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{k.label}</p>
            <p className={`mt-1 text-2xl font-bold ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {visoes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVisao(v.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  visao === v.id ? 'bg-primary-700 text-white shadow' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => (visao === 'dia' ? navegarDia(-1) : navegarSemana(-1))}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50"
              aria-label="Anterior"
            >
              ←
            </button>
            <button
              type="button"
              onClick={irHoje}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-50"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => (visao === 'dia' ? navegarDia(1) : navegarSemana(1))}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50"
              aria-label="Próximo"
            >
              →
            </button>
          </div>

          <input
            type="date"
            value={visao === 'dia' ? diaFoco : semanaInicio}
            onChange={(e) => {
              const v = e.target.value || toYmd(new Date());
              if (visao === 'dia') {
                setDiaFoco(v);
                setSemanaInicio(toYmd(inicioSemana(parseYmd(v))));
              } else {
                setSemanaInicio(toYmd(inicioSemana(parseYmd(v))));
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, pedido, serviço…"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
          />

          {podeAtribuir && (
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="">Todos os técnicos</option>
              <option value="sem">Sem técnico</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          )}

          {modo === 'visualizacao' && meuTecnicoId && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={somenteMeus}
                onChange={(e) => setSomenteMeus(e.target.checked)}
              />
              Só meus + livres
            </label>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-sm font-medium capitalize text-slate-700">{tituloPeriodo}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.bar}`} />
                {meta.label}
              </span>
            ))}
            {ultimaAtualizacao && (
              <span className="text-[10px] text-slate-400">
                Atualizado às{' '}
                {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          {/* SEMANA */}
          {visao === 'semana' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[980px] w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-24 border-b bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Turno
                    </th>
                    {diasSemana.map((dia) => {
                      const hoje = toYmd(dia) === toYmd(new Date());
                      return (
                        <th
                          key={toYmd(dia)}
                          className={`border-b px-2 py-3 text-center ${hoje ? 'bg-primary-50' : 'bg-slate-50'}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setDiaFoco(toYmd(dia));
                              setVisao('dia');
                            }}
                            className="w-full"
                          >
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {dia.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold ${hoje ? 'text-primary-800' : 'text-slate-800'}`}>
                              {dia.getDate()}
                            </div>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {slotsPadrao.map((slot) => (
                    <tr key={`${slot.inicio}-${slot.fim}`} className="align-top">
                      <td className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-slate-700">{slot.inicio}</p>
                        <p className="text-[11px] text-slate-400">{slot.fim}</p>
                      </td>
                      {diasSemana.map((dia) => {
                        const itens = porDiaHorario(dia, slot);
                        return (
                          <td key={`${toYmd(dia)}-${slot.inicio}`} className="border-b border-l bg-slate-50/40 p-1.5">
                            <div className="min-h-[88px] space-y-1.5">
                              {itens.length === 0 ? (
                                <div className="flex h-full min-h-[88px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-300">
                                  Livre
                                </div>
                              ) : (
                                itens.map((ag) => (
                                  <CardAgendamento
                                    key={ag.id}
                                    ag={ag}
                                    compact
                                    onOpen={() => setSelecionado(ag)}
                                  />
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
          )}

          {/* DIA */}
          {visao === 'dia' && (
            <div className="space-y-3">
              {slotsPadrao.map((slot) => {
                const itens = filtrados.filter(
                  (ag) => dataAgYmd(ag) === diaFoco && ag.horarioInicio === slot.inicio
                );
                return (
                  <div key={slot.inicio} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-primary-900">
                        {slot.inicio} — {slot.fim}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {itens.length} atendimento{itens.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {itens.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                        Nenhum atendimento neste turno
                      </p>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {itens.map((ag) => (
                          <CardAgendamento key={ag.id} ag={ag} onOpen={() => setSelecionado(ag)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* EQUIPE — dispatch board */}
          {visao === 'equipe' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="min-w-[920px]">
                <div
                  className="grid border-b bg-slate-50"
                  style={{
                    gridTemplateColumns: `140px repeat(${tecnicos.length + 1}, minmax(160px, 1fr))`,
                  }}
                >
                  <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Técnico
                  </div>
                  <div className="border-l px-3 py-3 text-center text-xs font-semibold text-rose-700">
                    Sem técnico ({porTecnicoDia(null, diaFoco).length})
                  </div>
                  {tecnicos.map((t) => (
                    <div key={t.id} className="border-l px-3 py-3 text-center text-xs font-semibold text-slate-700">
                      {t.nome}
                      <span className="mt-0.5 block font-normal text-slate-400">
                        {porTecnicoDia(t.id, diaFoco).length} job
                        {porTecnicoDia(t.id, diaFoco).length === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-b bg-primary-50/60 px-3 py-2 text-xs font-medium text-primary-800">
                  Dia em foco:{' '}
                  {parseYmd(diaFoco).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => setVisao('dia')}
                  >
                    trocar dia
                  </button>
                </div>

                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `140px repeat(${tecnicos.length + 1}, minmax(160px, 1fr))`,
                  }}
                >
                  <div className="space-y-2 border-r bg-slate-50 p-2">
                    {slotsPadrao.map((s) => (
                      <div
                        key={s.inicio}
                        className="flex h-[100px] items-center px-2 text-xs font-semibold text-slate-600"
                      >
                        {s.inicio}
                      </div>
                    ))}
                  </div>

                  {/* coluna sem técnico */}
                  <div className="space-y-2 border-l bg-rose-50/30 p-2">
                    {slotsPadrao.map((slot) => {
                      const itens = porTecnicoDia(null, diaFoco).filter(
                        (a) => a.horarioInicio === slot.inicio
                      );
                      return (
                        <div key={`sem-${slot.inicio}`} className="min-h-[100px] space-y-1.5">
                          {itens.map((ag) => (
                            <CardAgendamento
                              key={ag.id}
                              ag={ag}
                              compact
                              onOpen={() => setSelecionado(ag)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {tecnicos.map((t) => (
                    <div key={t.id} className="space-y-2 border-l p-2">
                      {slotsPadrao.map((slot) => {
                        const itens = porTecnicoDia(t.id, diaFoco).filter(
                          (a) => a.horarioInicio === slot.inicio
                        );
                        return (
                          <div key={`${t.id}-${slot.inicio}`} className="min-h-[100px] space-y-1.5">
                            {itens.length === 0 ? (
                              <div className="flex h-[100px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-300">
                                —
                              </div>
                            ) : (
                              itens.map((ag) => (
                                <CardAgendamento
                                  key={ag.id}
                                  ag={ag}
                                  compact
                                  onOpen={() => setSelecionado(ag)}
                                />
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LISTA */}
          {visao === 'lista' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {filtrados.length === 0 ? (
                <p className="p-8 text-center text-slate-400">Nenhum atendimento no filtro atual</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtrados.map((ag) => {
                    const meta = statusMeta(ag.status);
                    return (
                      <div
                        key={ag.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{ag.cliente.nome}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            {formatDate(ag.data)} · {ag.horarioInicio}–{ag.horarioFim} ·{' '}
                            {ag.servicoNome || ag.pedido.descricao || ag.pedido.numero}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ag.tecnico?.nome || 'Sem técnico'} · {ag.pedido.numero}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {podeAtribuir && (
                            <select
                              value={ag.tecnico?.id || ''}
                              onChange={(e) => atribuir(ag.id, e.target.value)}
                              className="rounded-lg border px-2 py-1.5 text-xs"
                            >
                              <option value="">Atribuir…</option>
                              {tecnicos.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nome}
                                </option>
                              ))}
                            </select>
                          )}
                          <Button variant="secondary" className="text-xs" onClick={() => setSelecionado(ag)}>
                            Abrir
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Painel lateral de detalhes */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            aria-label="Fechar"
            onClick={() => setSelecionado(null)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="border-b bg-primary-800 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Atendimento</p>
                  <h3 className="text-xl font-bold">{selecionado.cliente.nome}</h3>
                  <p className="text-sm text-accent-400">{selecionado.pedido.numero}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelecionado(null)}
                  className="rounded-lg px-2 py-1 text-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta(selecionado.status).chip}`}>
                {statusMeta(selecionado.status).label}
              </div>

              <section className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quando</p>
                <p className="font-medium text-slate-900">
                  {formatDate(selecionado.data)} · {selecionado.horarioInicio}–{selecionado.horarioFim}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Serviço</p>
                <p className="font-medium text-slate-900">
                  {selecionado.servicoNome || selecionado.pedido.descricao || '—'}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cliente</p>
                <p className="font-medium">{selecionado.cliente.nome}</p>
                <p className="text-slate-600">{selecionado.cliente.telefone}</p>
                <p className="mt-1 text-slate-500">{formatEndereco(selecionado.cliente.endereco)}</p>
                {mapa && (
                  <a
                    href={mapa}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-primary-700 underline"
                  >
                    Abrir no Google Maps
                  </a>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Técnico</p>
                {podeAtribuir ? (
                  <select
                    value={selecionado.tecnico?.id || ''}
                    onChange={(e) => {
                      void atribuir(selecionado.id, e.target.value);
                      setSelecionado({
                        ...selecionado,
                        tecnico: e.target.value
                          ? {
                              id: e.target.value,
                              nome: tecnicos.find((t) => t.id === e.target.value)?.nome || '',
                            }
                          : null,
                      });
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
                ) : (
                  <p className="font-medium">{selecionado.tecnico?.nome || 'Não atribuído'}</p>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AgendaAdminPage() {
  const role = useAuthStore((s) => s.user?.role);
  return <AgendaVirtualPage modo={role === 'operacional' ? 'visualizacao' : 'gestao'} />;
}

export function AgendaTecnicoPage() {
  return <AgendaVirtualPage modo="visualizacao" />;
}
