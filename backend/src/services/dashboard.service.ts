import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { getConfigPrecificacao, estimarLucro } from '../engines/pricing.engine.js';

function ymdBrasil(ref = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ref);
}

function inicioMesBrasil(ref = new Date()): Date {
  const [y, m] = ymdBrasil(ref).split('-');
  return new Date(`${y}-${m}-01T00:00:00-03:00`);
}

function dataEfetivaPagamento(p: { paymentDate: Date | null; createdAt: Date }) {
  return p.paymentDate ?? p.createdAt;
}

function pagamentoNoDiaBrasil(p: { paymentDate: Date | null; createdAt: Date }, diaYmd: string) {
  return ymdBrasil(dataEfetivaPagamento(p)) === diaYmd;
}

function pagamentoNoMesBrasil(p: { paymentDate: Date | null; createdAt: Date }, mesPrefix: string) {
  return ymdBrasil(dataEfetivaPagamento(p)).startsWith(mesPrefix);
}

export class DashboardService {
  async getKPIs() {
    const agora = new Date();
    const hojeYmd = ymdBrasil(agora);
    const mesPrefix = hojeYmd.slice(0, 7);
    const inicioMes = inicioMesBrasil(agora);
    const inicioJanela = new Date(inicioMes);
    inicioJanela.setDate(inicioJanela.getDate() - 2);

    const [
      totalLeads,
      leadsFechados,
      totalPedidos,
      pedidosCancelados,
      osEmAndamento,
      osConcluidas,
      pagamentosRecebidos,
      pagamentosJanela,
      totalClientes,
      leadsPorEtapa,
      pedidosPorStatus,
      solicitacoes,
      agendamentosCancelados,
      clientesRecorrentes,
      campanhasPendentes,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { etapa: 'fechado' } }),
      prisma.pedido.count(),
      prisma.pedido.count({ where: { status: 'cancelado' } }),
      prisma.ordemServico.count({ where: { etapa: { notIn: ['conclusao', 'avaliacao'] } } }),
      prisma.ordemServico.count({ where: { etapa: { in: ['conclusao', 'avaliacao'] } } }),
      prisma.pagamento.findMany({ where: { status: 'RECEIVED' } }),
      prisma.pagamento.findMany({
        where: {
          status: 'RECEIVED',
          OR: [
            { paymentDate: { gte: inicioJanela } },
            { paymentDate: null, createdAt: { gte: inicioJanela } },
          ],
        },
      }),
      prisma.cliente.count({ where: { status: 'ativo' } }),
      prisma.lead.groupBy({ by: ['etapa'], _count: true }),
      prisma.pedido.groupBy({ by: ['status'], _count: true }),
      prisma.solicitacaoServico.findMany({
        where: { status: { in: ['pago', 'agendado'] } },
        include: { servico: true },
      }),
      prisma.agendamento.count({ where: { status: 'cancelado' } }),
      prisma.pedido.groupBy({ by: ['clienteId'], _count: { _all: true } }),
      prisma.campanhaCrm.count({ where: { status: 'pendente' } }),
    ]);

    const pagamentosMes = pagamentosJanela.filter((p) => pagamentoNoMesBrasil(p, mesPrefix));
    const pagamentosDia = pagamentosJanela.filter((p) => pagamentoNoDiaBrasil(p, hojeYmd));

    const receitaTotal = pagamentosRecebidos.reduce((s, p) => s + toNumber(p.valor), 0);
    const receitaMes = pagamentosMes.reduce((s, p) => s + toNumber(p.valor), 0);
    const faturamentoDiario = pagamentosDia.reduce((s, p) => s + toNumber(p.valor), 0);
    const nTickets = pagamentosRecebidos.length;
    const ticketMedio = nTickets > 0 ? receitaTotal / nTickets : 0;
    const taxaConversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
    const clientesRecorrentesCount = clientesRecorrentes.filter((c) => c._count._all > 1).length;
    const pedidosFinalizados = pedidosPorStatus.find((p) => p.status === 'finalizado')?._count ?? 0;

    const vencidos = await prisma.pagamento.count({ where: { status: 'OVERDUE' } });
    const totalPagamentos = pagamentosRecebidos.length + vencidos;
    const inadimplencia = totalPagamentos > 0 ? (vencidos / totalPagamentos) * 100 : 0;

    const config = await getConfigPrecificacao();
    const overhead = toNumber(config.overhead);
    let lucroEstimado = 0;
    for (const p of pagamentosMes) {
      const valor = toNumber(p.valor);
      const custoEstimado = valor * (toNumber(config.impostos) + toNumber(config.taxaCartao) + 0.35);
      lucroEstimado += await estimarLucro(valor, custoEstimado + overhead);
    }

    const servicosPorCategoria: Record<string, number> = {};
    const margemPorServico: Record<string, { count: number; receita: number; margemEstimada: number }> = {};

    for (const s of solicitacoes) {
      const cat = s.servico.categoria;
      servicosPorCategoria[cat] = (servicosPorCategoria[cat] || 0) + 1;
      const slug = s.servico.slug;
      const valor = toNumber(s.precoFinal || 0);
      if (!margemPorServico[slug]) margemPorServico[slug] = { count: 0, receita: 0, margemEstimada: 0 };
      margemPorServico[slug].count += 1;
      margemPorServico[slug].receita += valor;
      margemPorServico[slug].margemEstimada += valor * toNumber(config.lucro);
    }

    const margemPorServicoList = Object.entries(margemPorServico).map(([servico, m]) => ({
      servico,
      ...m,
      margemPct: m.receita > 0 ? Math.round((m.margemEstimada / m.receita) * 100) : 0,
    }));

    return {
      comercial: {
        totalLeads,
        leadsFechados,
        taxaConversao: Math.round(taxaConversao * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        totalClientes,
        clientesRecorrentes: clientesRecorrentesCount,
        campanhasPendentes,
      },
      operacional: {
        totalPedidos,
        pedidosFinalizados,
        pedidosCancelados,
        osEmAndamento,
        servicosExecutados: osConcluidas,
        cancelamentos: agendamentosCancelados + pedidosCancelados,
        pedidosPorStatus,
        servicosPorCategoria: Object.entries(servicosPorCategoria).map(([categoria, total]) => ({ categoria, total })),
      },
      financeiro: {
        faturamentoDiario: Math.round(faturamentoDiario * 100) / 100,
        receitaMes: Math.round(receitaMes * 100) / 100,
        receitaTotal: Math.round(receitaTotal * 100) / 100,
        lucroEstimado: Math.round(lucroEstimado * 100) / 100,
        inadimplencia: Math.round(inadimplencia * 100) / 100,
        pagamentosMes: pagamentosMes.length,
        margemPorServico: margemPorServicoList,
      },
      leadsPorEtapa,
    };
  }

  async getReceitaMensal() {
    const pagamentos = await prisma.pagamento.findMany({
      where: { status: 'RECEIVED' },
      select: { valor: true, paymentDate: true, createdAt: true },
    });

    const porMes: Record<string, number> = {};
    pagamentos.forEach((p) => {
      const key = ymdBrasil(dataEfetivaPagamento(p)).slice(0, 7);
      porMes[key] = (porMes[key] || 0) + toNumber(p.valor);
    });

    return Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({ mes, valor }));
  }

  async getFaturamentoDiario(dias = 14) {
    const resultado: { dia: string; valor: number }[] = [];
    const hojeYmd = ymdBrasil();
    const [y, m, d] = hojeYmd.split('-').map(Number);
    const inicioJanela = new Date(Date.UTC(y, m - 1, d - (dias + 1)));

    const pagamentos = await prisma.pagamento.findMany({
      where: {
        status: 'RECEIVED',
        OR: [
          { paymentDate: { gte: inicioJanela } },
          { paymentDate: null, createdAt: { gte: inicioJanela } },
        ],
      },
      select: { valor: true, paymentDate: true, createdAt: true },
    });

    for (let i = dias - 1; i >= 0; i--) {
      const ref = new Date(Date.UTC(y, m - 1, d - i, 15, 0, 0));
      const diaKey = ymdBrasil(ref);
      const valor = pagamentos
        .filter((p) => ymdBrasil(dataEfetivaPagamento(p)) === diaKey)
        .reduce((s, p) => s + toNumber(p.valor), 0);
      const [, mm, dd] = diaKey.split('-');
      resultado.push({ dia: `${dd}/${mm}`, valor });
    }

    return resultado;
  }
}

export const dashboardService = new DashboardService();

export class AdminService {
  async listarUsuarios() {
    return prisma.user.findMany({
      select: { id: true, nome: true, email: true, role: true, createdAt: true, clienteId: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async criarUsuario(data: { nome: string; email: string; senha: string; role: string }) {
    const bcrypt = await import('bcrypt');
    const senhaHash = await bcrypt.hash(data.senha, 10);
    return prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
        role: data.role as 'admin' | 'comercial' | 'operacional' | 'cliente' | 'parceiro',
      },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });
  }

  async listarAuditoria(page = 1, limit = 50) {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { nome: true, email: true } } },
      }),
      prisma.auditLog.count(),
    ]);
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  async listarNotificacoes(limit = 50) {
    return prisma.notificacao.findMany({ take: limit, orderBy: { createdAt: 'desc' } });
  }
}

export const adminService = new AdminService();
