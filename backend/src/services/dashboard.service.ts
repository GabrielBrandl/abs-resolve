import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';

export class DashboardService {
  async getKPIs() {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [
      totalLeads,
      leadsFechados,
      totalPedidos,
      pedidosFinalizados,
      osEmAndamento,
      pagamentosRecebidos,
      pagamentosMes,
      totalClientes,
      leadsPorEtapa,
      pedidosPorStatus,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { etapa: 'fechado' } }),
      prisma.pedido.count(),
      prisma.pedido.count({ where: { status: 'finalizado' } }),
      prisma.ordemServico.count({
        where: { etapa: { notIn: ['conclusao', 'avaliacao'] } },
      }),
      prisma.pagamento.findMany({ where: { status: 'RECEIVED' } }),
      prisma.pagamento.findMany({
        where: { status: 'RECEIVED', paymentDate: { gte: inicioMes } },
      }),
      prisma.cliente.count({ where: { status: 'ativo' } }),
      prisma.lead.groupBy({ by: ['etapa'], _count: true }),
      prisma.pedido.groupBy({ by: ['status'], _count: true }),
    ]);

    const receitaTotal = pagamentosRecebidos.reduce((s, p) => s + toNumber(p.valor), 0);
    const receitaMes = pagamentosMes.reduce((s, p) => s + toNumber(p.valor), 0);
    const ticketMedio = pedidosFinalizados > 0 ? receitaTotal / pedidosFinalizados : 0;
    const taxaConversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;

    const vencidos = await prisma.pagamento.count({ where: { status: 'OVERDUE' } });
    const totalPagamentos = pagamentosRecebidos.length + vencidos;
    const inadimplencia = totalPagamentos > 0 ? (vencidos / totalPagamentos) * 100 : 0;

    return {
      comercial: {
        totalLeads,
        leadsFechados,
        taxaConversao: Math.round(taxaConversao * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        totalClientes,
      },
      operacional: {
        totalPedidos,
        pedidosFinalizados,
        osEmAndamento,
        pedidosPorStatus,
      },
      financeiro: {
        receitaMes,
        receitaTotal,
        inadimplencia: Math.round(inadimplencia * 100) / 100,
        pagamentosMes: pagamentosMes.length,
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
