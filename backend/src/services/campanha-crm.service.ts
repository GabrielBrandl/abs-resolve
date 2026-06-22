import { prisma } from '../utils/prisma.js';
import { notificacaoService } from './notificacao.service.js';

const CAMPANHAS_POR_SERVICO: Record<string, { meses: number; titulo: string; mensagem: string }> = {
  chuveiro: {
    meses: 6,
    titulo: 'Revisão preventiva do chuveiro',
    mensagem: 'Faz 6 meses desde a instalação do seu chuveiro. Que tal uma revisão preventiva? Evite surpresas e garanta segurança elétrica.',
  },
  'ar-condicionado': {
    meses: 12,
    titulo: 'Higienização do ar-condicionado',
    mensagem: 'Recomendamos higienização anual do seu ar-condicionado para melhor desempenho e economia.',
  },
  disjuntor: {
    meses: 12,
    titulo: 'Revisão do quadro elétrico',
    mensagem: 'Revisão preventiva do quadro elétrico — verifique se tudo está em ordem.',
  },
};

export class CampanhaCrmService {
  async agendarPosServico(clienteId: string, servicoSlug: string) {
    const cfg = CAMPANHAS_POR_SERVICO[servicoSlug];
    if (!cfg) return null;

    const agendadaPara = new Date();
    agendadaPara.setMonth(agendadaPara.getMonth() + cfg.meses);

    const existente = await prisma.campanhaCrm.findFirst({
      where: { clienteId, tipo: `revisao_${servicoSlug}`, status: 'pendente' },
    });
    if (existente) return existente;

    return prisma.campanhaCrm.create({
      data: {
        clienteId,
        tipo: `revisao_${servicoSlug}`,
        titulo: cfg.titulo,
        mensagem: cfg.mensagem,
        agendadaPara,
      },
    });
  }

  async processarPendentes() {
    const agora = new Date();
    const pendentes = await prisma.campanhaCrm.findMany({
      where: { status: 'pendente', agendadaPara: { lte: agora } },
      include: { cliente: true },
      take: 100,
    });

    const resultados = [];
    for (const c of pendentes) {
      await prisma.lead.create({
        data: {
          nome: c.cliente.nome,
          telefone: c.cliente.telefone,
          email: c.cliente.email,
          origem: 'campanha_automatica',
          interesse: c.titulo,
          responsavel: 'Automático',
          etapa: 'novo_lead',
        },
      });

      await notificacaoService.enviarEmail(c.cliente.email, c.titulo, `<p>${c.mensagem}</p>`);
      await notificacaoService.enviarWhatsApp(c.cliente.telefone, `${c.titulo}: ${c.mensagem}`);

      await prisma.campanhaCrm.update({
        where: { id: c.id },
        data: { status: 'enviada', enviadaEm: agora },
      });

      resultados.push({ id: c.id, cliente: c.cliente.nome, titulo: c.titulo });
    }

    return { processadas: resultados.length, campanhas: resultados };
  }

  async listar(status?: string) {
    return prisma.campanhaCrm.findMany({
      where: status ? { status } : undefined,
      include: { cliente: { select: { nome: true, email: true } } },
      orderBy: { agendadaPara: 'asc' },
      take: 100,
    });
  }
}

export const campanhaCrmService = new CampanhaCrmService();
