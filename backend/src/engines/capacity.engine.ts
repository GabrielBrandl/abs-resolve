import { prisma } from '../utils/prisma.js';
import { HORARIOS_PADRAO } from '../config/catalogo.js';

export type EscassezNivel = 'disponivel' | 'poucos' | 'ultimo' | 'lotado';

export interface SlotDisponivel {
  data: string;
  horarioInicio: string;
  horarioFim: string;
  label: string;
  escassez: EscassezNivel;
}

/** Fuso operacional ABS Resolve (Manaus). */
export const TZ_OPERACAO = 'America/Manaus';

function partsInTz(date: Date, timeZone = TZ_OPERACAO) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** YYYY-MM-DD no fuso de Manaus */
export function dataLocalISO(date: Date = new Date(), timeZone = TZ_OPERACAO) {
  const { y, m, d } = partsInTz(date, timeZone);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDaysISO(dataISO: string, n: number) {
  const [y, m, d] = dataISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Interpreta data+hora no fuso de Manaus como instante UTC. */
export function instanteManaus(dataISO: string, horarioHHMM: string) {
  const [y, m, d] = dataISO.split('-').map(Number);
  const [hh, mm] = horarioHHMM.split(':').map((v) => parseInt(v, 10) || 0);
  // Manaus = UTC-4 o ano todo (sem DST)
  return new Date(Date.UTC(y, m - 1, d, hh + 4, mm, 0));
}

export function assertSlotNaoRetroativo(dataISO: string, horarioInicio: string) {
  const inicio = instanteManaus(dataISO, horarioInicio);
  if (inicio.getTime() <= Date.now()) {
    throw new Error('Não é possível agendar em data ou horário já passado. Escolha um horário futuro.');
  }
}

function labelDia(offset: number, dataISO: string) {
  if (offset === 0) return 'Hoje';
  if (offset === 1) return 'Amanhã';
  const [y, m, d] = dataISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

async function capacidadeTotalDia(_dataISO: string): Promise<number> {
  const tecnicos = await prisma.tecnico.findMany({ where: { ativo: true } });
  return tecnicos.reduce((s, t) => s + t.capacidadeDiaria, 0);
}

async function pontosUsadosDia(dataISO: string): Promise<number> {
  const [y, m, d] = dataISO.split('-').map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, d - 1, 0, 0, 0));
  const fim = new Date(Date.UTC(y, m - 1, d + 2, 0, 0, 0));
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      data: { gte: inicio, lt: fim },
      status: { notIn: ['cancelado'] },
    },
  });
  return agendamentos
    .filter((a) => dataLocalISO(a.data) === dataISO)
    .reduce((s, a) => s + a.pontosUsados, 0);
}

function escassezFromOcupacao(ratio: number): EscassezNivel {
  if (ratio >= 1) return 'lotado';
  if (ratio >= 0.85) return 'ultimo';
  if (ratio >= 0.6) return 'poucos';
  return 'disponivel';
}

export async function listarHorariosDisponiveis(pontosNecessarios: number, dias = 7): Promise<{
  slots: SlotDisponivel[];
  proximaDisponibilidade: string | null;
}> {
  const slots: SlotDisponivel[] = [];
  const hojeISO = dataLocalISO(new Date());
  let proximaDisponibilidade: string | null = null;
  const agora = Date.now();

  for (let d = 0; d < dias; d++) {
    const dataISO = addDaysISO(hojeISO, d);
    const capacidade = await capacidadeTotalDia(dataISO);
    if (capacidade === 0) continue;

    const usados = await pontosUsadosDia(dataISO);
    const restantes = capacidade - usados;
    if (restantes < pontosNecessarios) continue;

    for (const h of HORARIOS_PADRAO) {
      const inicioMs = instanteManaus(dataISO, h.inicio).getTime();
      if (inicioMs <= agora) continue; // sem horário retroativo / já passado

      const slotRatio = (usados + pontosNecessarios) / capacidade;
      if (slotRatio > 1) continue;

      const escassez = escassezFromOcupacao(slotRatio);
      const prefix = labelDia(d, dataISO);
      slots.push({
        data: dataISO,
        horarioInicio: h.inicio,
        horarioFim: h.fim,
        label: `${prefix} ${h.inicio} às ${h.fim}`,
        escassez,
      });
    }

    if (slots.length > 0 && !proximaDisponibilidade) {
      proximaDisponibilidade = slots[0].label;
    }
  }

  if (slots.length === 0) {
    for (let d = dias; d < dias + 14; d++) {
      const dataISO = addDaysISO(hojeISO, d);
      const capacidade = await capacidadeTotalDia(dataISO);
      const usados = await pontosUsadosDia(dataISO);
      if (capacidade > 0 && capacidade - usados >= pontosNecessarios) {
        proximaDisponibilidade = labelDia(d, dataISO);
        break;
      }
    }
  }

  return { slots, proximaDisponibilidade };
}

export async function reservarCapacidade(
  data: Date | string,
  pontos: number,
  clienteId: string,
  solicitacaoId: string | null,
  horarioInicio: string,
  horarioFim: string,
  express: boolean,
  extra?: { pedidoId?: string | null; tecnicoId?: string | null }
) {
  const dataStr =
    typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)
      ? data
      : dataLocalISO(data instanceof Date ? data : new Date(data));

  assertSlotNaoRetroativo(dataStr, horarioInicio);

  const capacidade = await capacidadeTotalDia(dataStr);
  const usados = await pontosUsadosDia(dataStr);
  if (usados + pontos > capacidade) {
    throw new Error('Horário indisponível. Capacidade operacional atingida.');
  }

  const [y, m, d] = dataStr.split('-').map(Number);
  const dataPersistida = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  return prisma.agendamento.create({
    data: {
      clienteId,
      solicitacaoId: solicitacaoId || undefined,
      pedidoId: extra?.pedidoId || undefined,
      tecnicoId: extra?.tecnicoId || undefined,
      data: dataPersistida,
      horarioInicio,
      horarioFim,
      pontosUsados: pontos,
      express,
      status: 'confirmado',
    },
  });
}
