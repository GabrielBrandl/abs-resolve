import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { getConfigPrecificacao, estimarLucro } from '../engines/pricing.engine.js';

export class DashboardService {
  async getKPIs() {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    const [
      totalLeads,
      leadsFechados,
      totalPedidos,
      pedidosFinalizados,
      pedidosCancelados,
      osEmAndamento,
      osConcluidas,
      pagamentosRecebidos,
      pagamentosMes,
      pagamentosDia,
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
      prisma.pedido.count({ where: { status: 'finalizado' } }),
      prisma.pedido.count({ where: { status: 'cancelado' } }),
      prisma.ordemServico.count({ where: { etapa: { notIn: ['conclusao', 'avaliacao'] } } }),
      prisma.ordemServico.count({ where: { etapa: { in: ['conclusao', 'avaliacao'] } } }),
      prisma.pagamento.findMany({ where: { status: 'RECEIVED' } }),
      prisma.pagamento.findMany({ where: { status: 'RECEIVED', paymentDate: { gte: inicioMes } } }),
      prisma.pagamento.findMany({ where: { status: 'RECEIVED', paymentDate: { gte: inicioDia } } }),
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

    const receitaTotal = pagamentosRecebidos.reduce((s, p) => s + toNumber(p.valor), 0);
    const receitaMes = pagamentosMes.reduce((s, p) => s + toNumber(p.valor), 0);
    const faturamentoDiario = pagamentosDia.reduce((s, p) => s + toNumber(p.valor), 0);
    const ticketMedio = pedidosFinalizados > 0 ? receitaTotal / pedidosFinalizados : 0;
    const taxaConversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;
    const clientesRecorrentesCount = clientesRecorrentes.filter((c) => c._count._all > 1).length;

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
      where: { status: 'RECEIVED', paymentDate: { not: null } },
      select: { valor: true, paymentDate: true },
    });

    const porMes: Record<string, number> = {};
    pagamentos.forEach((p) => {
      if (!p.paymentDate) return;
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      porMes[key] = (porMes[key] || 0) + toNumber(p.valor);
    });

    return Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({ mes, valor }));
  }

  async getFaturamentoDiario(dias = 14) {
    const resultado: { dia: string; valor: number }[] = [];
    const hoje = new Date();

    for (let i = dias - 1; i >= 0; i--) {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - i);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 1);

      const pagamentos = await prisma.pagamento.findMany({
        where: { status: 'RECEIVED', paymentDate: { gte: inicio, lt: fim } },
      });
      resultado.push({
        dia: inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        valor: pagamentos.reduce((s, p) => s + toNumber(p.valor), 0),
      });
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
