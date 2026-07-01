import { prisma } from '../utils/prisma.js';
import { notificacaoService } from './notificacao.service.js';

const UMA_HORA_MS = 60 * 60 * 1000;
const UM_DIA_MS = 24 * UMA_HORA_MS;
const DUAS_HORAS_MS = 2 * UMA_HORA_MS;
/** Janela de envio — alinhada ao intervalo do cron (15 min) */
const JANELA_MS = 20 * 60 * 1000;

function parseInicioAgendamento(data: Date, horarioInicio: string): Date {
  const [h, m] = horarioInicio.split(':').map((v) => parseInt(v, 10) || 0);
  const dt = new Date(data);
  dt.setHours(h, m, 0, 0);
  return dt;
}

function naJanela(msAteInicio: number, alvoMs: number): boolean {
  return msAteInicio > 0 && msAteInicio >= alvoMs - JANELA_MS && msAteInicio <= alvoMs + JANELA_MS;
}

export async function processarLembretesAgendamento(): Promise<{ enviados1d: number; enviados2h: number }> {
  const agora = Date.now();
  let enviados1d = 0;
  let enviados2h = 0;

  const agendamentos = await prisma.agendamento.findMany({
    where: { status: { in: ['confirmado', 'a_caminho', 'em_atendimento'] } },
    include: {
      cliente: true,
      pedido: { select: { numero: true } },
      solicitacao: { include: { servico: { select: { nome: true } } } },
    },
  });

  for (const ag of agendamentos) {
    const inicio = parseInicioAgendamento(ag.data, ag.horarioInicio);
    const msAteInicio = inicio.getTime() - agora;
    if (msAteInicio <= 0) continue;

    const dataIso = inicio.toISOString().split('T')[0];
    const base = {
      clienteNome: ag.cliente.nome,
      email: ag.cliente.email,
      telefone: ag.cliente.telefone,
      whatsapp: ag.cliente.whatsapp,
      data: dataIso,
      horarioInicio: ag.horarioInicio,
      horarioFim: ag.horarioFim,
      pedidoNumero: ag.pedido?.numero,
      servicoNome: ag.solicitacao?.servico?.nome,
    };

    if (!ag.lembrete1dEnviado && naJanela(msAteInicio, UM_DIA_MS)) {
      const ok = await notificacaoService.notificarLembreteAgendamento({ ...base, tipo: '1d' });
      if (ok) {
        await prisma.agendamento.update({
          where: { id: ag.id },
          data: { lembrete1dEnviado: true },
        });
        enviados1d++;
      }
    }

    if (!ag.lembrete2hEnviado && naJanela(msAteInicio, DUAS_HORAS_MS)) {
      const ok = await notificacaoService.notificarLembreteAgendamento({ ...base, tipo: '2h' });
      if (ok) {
        await prisma.agendamento.update({
          where: { id: ag.id },
          data: { lembrete2hEnviado: true },
        });
        enviados2h++;
      }
    }
  }

  return { enviados1d, enviados2h };
}
