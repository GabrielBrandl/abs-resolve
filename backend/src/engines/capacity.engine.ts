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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function capacidadeTotalDia(data: Date): Promise<number> {
  const tecnicos = await prisma.tecnico.findMany({ where: { ativo: true } });
  return tecnicos.reduce((s, t) => s + t.capacidadeDiaria, 0);
}

async function pontosUsadosDia(data: Date): Promise<number> {
  const inicio = startOfDay(data);
  const fim = addDays(inicio, 1);
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      data: { gte: inicio, lt: fim },
      status: { notIn: ['cancelado'] },
    },
  });
  return agendamentos.reduce((s, a) => s + a.pontosUsados, 0);
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
  const hoje = startOfDay(new Date());
  let proximaDisponibilidade: string | null = null;

  for (let d = 0; d < dias; d++) {
    const data = addDays(hoje, d);
    const capacidade = await capacidadeTotalDia(data);
    if (capacidade === 0) continue;

    const usados = await pontosUsadosDia(data);
    const restantes = capacidade - usados;
    if (restantes < pontosNecessarios) {
      if (!proximaDisponibilidade) continue;
      continue;
    }

    const ratio = usados / capacidade;

    for (const h of HORARIOS_PADRAO) {
      const slotRatio = (usados + pontosNecessarios) / capacidade;
      if (slotRatio > 1) continue;

      const escassez = escassezFromOcupacao(slotRatio);
      const dataStr = data.toISOString().split('T')[0];
      const label = d === 0
        ? `Hoje ${h.inicio} às ${h.fim}`
        : d === 1
          ? `Amanhã ${h.inicio} às ${h.fim}`
          : `${data.toLocaleDateString('pt-BR')} ${h.inicio} às ${h.fim}`;

      slots.push({
        data: dataStr,
        horarioInicio: h.inicio,
        horarioFim: h.fim,
        label,
        escassez,
      });
    }

    if (slots.length > 0 && !proximaDisponibilidade) {
      proximaDisponibilidade = slots[0].label;
    }
  }

  if (slots.length === 0) {
    for (let d = dias; d < dias + 14; d++) {
      const data = addDays(hoje, d);
      const capacidade = await capacidadeTotalDia(data);
      const usados = await pontosUsadosDia(data);
      if (capacidade > 0 && capacidade - usados >= pontosNecessarios) {
        proximaDisponibilidade = data.toLocaleDateString('pt-BR');
        break;
      }
    }
  }

  return { slots, proximaDisponibilidade };
}

export async function reservarCapacidade(
  data: Date,
  pontos: number,
  clienteId: string,
  solicitacaoId: string,
  horarioInicio: string,
  horarioFim: string,
  express: boolean
) {
  const capacidade = await capacidadeTotalDia(data);
  const usados = await pontosUsadosDia(data);
  if (usados + pontos > capacidade) {
    throw new Error('Horário indisponível. Capacidade operacional atingida.');
  }

  return prisma.agendamento.create({
    data: {
      clienteId,
      solicitacaoId,
      data: startOfDay(data),
      horarioInicio,
      horarioFim,
      pontosUsados: pontos,
      express,
      status: 'confirmado',
    },
  });
}
