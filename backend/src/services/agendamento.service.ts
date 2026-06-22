import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { pagamentosService } from './pagamentos.service.js';
import { notificacaoService } from './notificacao.service.js';
import { listarHorariosDisponiveis } from '../engines/capacity.engine.js';

function parseHorario(data: Date, horario: string) {
  const [h, m] = horario.split(':').map(Number);
  const dt = new Date(data);
  dt.setHours(h, m, 0, 0);
  return dt;
}

export class AgendamentoService {
  async cancelar(agendamentoId: string, clienteId: string) {
    const ag = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, clienteId, status: { not: 'cancelado' } },
      include: { cliente: true, solicitacao: { include: { servico: true } } },
    });
    if (!ag) throw new Error('Agendamento não encontrado');

    const config = await prisma.configSistema.findUnique({ where: { id: 'default' } });
    const taxa = toNumber(config?.taxaCancelamento || 49);

    const inicio = parseHorario(ag.data, ag.horarioInicio);
    const horasRestantes = (inicio.getTime() - Date.now()) / (1000 * 60 * 60);
    const cobrarTaxa = horasRestantes < 2;

    let pagamento = null;
    if (cobrarTaxa) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      pagamento = await pagamentosService.criarCobranca({
        clienteId,
        valor: taxa,
        metodo: 'PIX',
        dueDate: dueDate.toISOString().split('T')[0],
      });
      await notificacaoService.enviarEmail(
        ag.cliente.email,
        'Taxa de cancelamento — ABS Resolve',
        `<p>Cancelamento com menos de 2h de antecedência. Taxa: R$ ${taxa.toFixed(2)}</p>`
      );
    } else {
      await notificacaoService.enviarEmail(
        ag.cliente.email,
        'Agendamento cancelado — ABS Resolve',
        '<p>Seu agendamento foi cancelado sem custos.</p>'
      );
    }

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: {
        status: 'cancelado',
        canceladoEm: new Date(),
        taxaCobrada: cobrarTaxa ? taxa : null,
      },
    });

    if (ag.solicitacaoId) {
      await prisma.solicitacaoServico.update({
        where: { id: ag.solicitacaoId },
        data: { status: 'cancelado' },
      });
    }

    return { cobrarTaxa, taxa: cobrarTaxa ? taxa : 0, pagamento, mensagem: cobrarTaxa ? 'Taxa operacional cobrada (< 2h)' : 'Cancelamento gratuito' };
  }

  async registrarAusencia(agendamentoId: string) {
    const ag = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { cliente: true },
    });
    if (!ag) throw new Error('Agendamento não encontrado');

    const cliente = await prisma.cliente.update({
      where: { id: ag.clienteId },
      data: { ocorrenciasAusencia: { increment: 1 } },
    });

    const config = await prisma.configSistema.findUnique({ where: { id: 'default' } });
    const taxa = toNumber(config?.taxaAusencia || 49);
    const primeiraVez = cliente.ocorrenciasAusencia === 1;

    let pagamento = null;
    if (!primeiraVez) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      pagamento = await pagamentosService.criarCobranca({
        clienteId: ag.clienteId,
        valor: taxa,
        metodo: 'PIX',
        dueDate: dueDate.toISOString().split('T')[0],
      });
    }

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'ausente', taxaCobrada: primeiraVez ? null : taxa },
    });

    const pontos = ag.pontosUsados;
    const horarios = await listarHorariosDisponiveis(pontos);

    await notificacaoService.enviarEmail(
      ag.cliente.email,
      primeiraVez ? 'Reagendamento gratuito — ABS Resolve' : 'Taxa por ausência — ABS Resolve',
      primeiraVez
        ? '<p>Cliente ausente — reagendamento gratuito disponível.</p>'
        : `<p>Segunda ausência. Taxa de R$ ${taxa.toFixed(2)} aplicada.</p>`
    );

    return {
      primeiraVez,
      taxa: primeiraVez ? 0 : taxa,
      pagamento,
      horariosDisponiveis: horarios.slots.slice(0, 4),
    };
  }

  async reagendar(agendamentoId: string, clienteId: string, data: { data: string; horarioInicio: string; horarioFim: string }) {
    const ag = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, clienteId, status: 'ausente' },
    });
    if (!ag) throw new Error('Agendamento não elegível para reagendamento');

    const { reservarCapacidade } = await import('../engines/capacity.engine.js');
    const dataAgenda = new Date(data.data + 'T12:00:00');

    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'reagendado' },
    });

    return reservarCapacidade(
      dataAgenda,
      ag.pontosUsados,
      clienteId,
      ag.solicitacaoId || '',
      data.horarioInicio,
      data.horarioFim,
      ag.express
    );
  }
}

export const agendamentoService = new AgendamentoService();
