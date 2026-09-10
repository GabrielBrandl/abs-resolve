import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import {
  normalizarOrigem,
  periodoAnteriorEquivalente,
  resolverPeriodo,
  round2,
  variacaoPercentual,
  ymdBrasil,
  inicioDiaBrasil,
  fimDiaBrasil,
} from '../utils/periodo.js';
import { financeiroService, garantirPlanoFinanceiroPadrao } from './financeiro.service.js';

function metricComVariacao(atual: number, anterior: number) {
  return { valor: round2(atual), anterior: round2(anterior), variacaoPct: variacaoPercentual(atual, anterior) };
}

export class DashboardService {
  /** Dashboard gerencial completo com filtro de período. */
  async getGerencial(params: { periodo?: string; de?: string; ate?: string }) {
    await garantirPlanoFinanceiroPadrao().catch(() => {});

    const atual = resolverPeriodo(params);
    const ant = periodoAnteriorEquivalente(atual.inicioYmd, atual.fimYmd);

    const [
      pedidosAtual,
      pedidosAnt,
      pagamentosRecebidosAtual,
      pagamentosRecebidosAnt,
      leadsPeriodo,
      orcamentosPeriodo,
      clientesNovos,
      clientesNovosAnt,
      finResumo,
      dre,
      osLista,
      alertasBase,
      topClientesRaw,
      solicitacoesPeriodo,
      custosOs,
    ] = await Promise.all([
      prisma.pedido.findMany({
        where: {
          createdAt: { gte: atual.inicio, lte: atual.fim },
          status: { not: 'cancelado' },
        },
        include: {
          cliente: { select: { id: true, nome: true, origem: true } },
          pagamentos: { select: { status: true, valor: true } },
          solicitacao: { include: { servico: true } },
          ordemServico: true,
        },
      }),
      prisma.pedido.findMany({
        where: {
          createdAt: { gte: ant.inicio, lte: ant.fim },
          status: { not: 'cancelado' },
        },
        select: { id: true, valor: true },
      }),
      prisma.pagamento.findMany({
        where: {
          status: 'RECEIVED',
          OR: [
            { paymentDate: { gte: atual.inicio, lte: atual.fim } },
            { paymentDate: null, createdAt: { gte: atual.inicio, lte: atual.fim } },
          ],
        },
        select: { valor: true, clienteId: true },
      }),
      prisma.pagamento.findMany({
        where: {
          status: 'RECEIVED',
          OR: [
            { paymentDate: { gte: ant.inicio, lte: ant.fim } },
            { paymentDate: null, createdAt: { gte: ant.inicio, lte: ant.fim } },
          ],
        },
        select: { valor: true },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: atual.inicio, lte: atual.fim } },
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: atual.inicio, lte: atual.fim },
          OR: [
            { etapa: { in: ['proposta_enviada', 'negociacao', 'fechado'] } },
            { statusComercial: { in: ['aguardando_cliente', 'fechado_ganho'] } },
          ],
        },
      }),
      prisma.cliente.count({
        where: { createdAt: { gte: atual.inicio, lte: atual.fim } },
      }),
      prisma.cliente.count({
        where: { createdAt: { gte: ant.inicio, lte: ant.fim } },
      }),
      financeiroService.resumoDashboardFinanceiro(params),
      financeiroService.dre(params),
      prisma.ordemServico.findMany({
        include: {
          tecnico: { select: { id: true, nome: true } },
          pedido: {
            include: {
              cliente: { select: { id: true, nome: true, ocorrenciasAusencia: true } },
              agendamentos: { orderBy: { data: 'desc' }, take: 1 },
            },
          },
        },
      }),
      this.montarAlertas(),
      prisma.pagamento.groupBy({
        by: ['clienteId'],
        where: {
          status: 'RECEIVED',
          OR: [
            { paymentDate: { gte: atual.inicio, lte: atual.fim } },
            { paymentDate: null, createdAt: { gte: atual.inicio, lte: atual.fim } },
          ],
        },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.solicitacaoServico.findMany({
        where: {
          createdAt: { gte: atual.inicio, lte: atual.fim },
          status: { in: ['pago', 'agendado'] },
        },
        include: { servico: true, pedido: { include: { ordemServico: true } } },
      }),
      prisma.finLancamento.findMany({
        where: {
          natureza: 'despesa',
          status: { not: 'cancelada' },
          dataCompetencia: { gte: atual.inicio, lte: atual.fim },
          categoria: { grupoDre: 'custo_direto' },
        },
        select: { valor: true, ordemServicoId: true, pedidoId: true },
      }),
    ]);

    const faturamento = pedidosAtual.reduce((s, p) => s + toNumber(p.valor), 0);
    const faturamentoAnt = pedidosAnt.reduce((s, p) => s + toNumber(p.valor), 0);
    const receitaRecebida = pagamentosRecebidosAtual.reduce((s, p) => s + toNumber(p.valor), 0);
    const receitaRecebidaAnt = pagamentosRecebidosAnt.reduce((s, p) => s + toNumber(p.valor), 0);
    const nVendas = pedidosAtual.length;
    const ticketMedio = nVendas > 0 ? faturamento / nVendas : 0;
    const ticketAnt = pedidosAnt.length > 0 ? faturamentoAnt / pedidosAnt.length : 0;

    // Margem / resultado: preferir financeiro real; senão margem null (não inventar %)
    const margem = dre.temDadosReais
      ? dre.margemContribuicao
      : null;
    const margemPct = dre.temDadosReais ? dre.margemContribuicaoPct : null;
    const resultado = dre.temDadosReais ? dre.resultadoOperacional : null;

    const dreAnt = await financeiroService.dre({
      periodo: 'personalizado',
      de: ant.inicioYmd,
      ate: ant.fimYmd,
    });

    // Funil comercial
    const vendas = nVendas;
    const taxaLeadOrc = leadsPeriodo > 0 ? round2((orcamentosPeriodo / leadsPeriodo) * 100) : 0;
    const taxaOrcVenda = orcamentosPeriodo > 0 ? round2((vendas / orcamentosPeriodo) * 100) : 0;
    const taxaLeadVenda = leadsPeriodo > 0 ? round2((vendas / leadsPeriodo) * 100) : 0;

    // Vendas por origem
    const origemMap = new Map<string, { vendas: number; receita: number }>();
    for (const p of pedidosAtual) {
      const o = normalizarOrigem(p.cliente?.origem);
      if (!origemMap.has(o)) origemMap.set(o, { vendas: 0, receita: 0 });
      const row = origemMap.get(o)!;
      row.vendas += 1;
      row.receita += toNumber(p.valor);
    }
    const vendasPorOrigem = [
      'whatsapp',
      'site',
      'meta_ads',
      'instagram',
      'google',
      'indicacao',
      'recorrente',
      'outros',
    ].map((origem) => ({
      origem,
      vendas: origemMap.get(origem)?.vendas || 0,
      receita: round2(origemMap.get(origem)?.receita || 0),
    }));

    // Marketing structure (CPL/CAC) — investimento = despesas marketing no DRE
    const investimentoMarketing = dre.despesasComerciaisDetalhe
      .filter((d) => /ads|marketing|meta|google/i.test(d.nome))
      .reduce((s, d) => s + d.valor, 0) || dre.despesasComerciais;
    const marketing = {
      investimento: round2(investimentoMarketing),
      leads: leadsPeriodo,
      cpl: leadsPeriodo > 0 ? round2(investimentoMarketing / leadsPeriodo) : null,
      vendas,
      cac: vendas > 0 ? round2(investimentoMarketing / vendas) : null,
      receita: round2(faturamento),
      margem: margem,
    };

    // Operação
    const hojeYmd = ymdBrasil();
    const inicioHoje = inicioDiaBrasil(hojeYmd);
    const fimHoje = fimDiaBrasil(hojeYmd);

    const op = {
      osHoje: 0,
      aguardandoPrestador: 0,
      agendadas: 0,
      emExecucao: 0,
      concluidas: 0,
      atrasadas: 0,
      comOcorrencia: 0,
      ids: {
        osHoje: [] as string[],
        aguardandoPrestador: [] as string[],
        agendadas: [] as string[],
        emExecucao: [] as string[],
        concluidas: [] as string[],
        atrasadas: [] as string[],
        comOcorrencia: [] as string[],
      },
    };

    for (const os of osLista) {
      const ag = os.pedido.agendamentos[0];
      const concluida = ['conclusao', 'avaliacao'].includes(os.etapa);
      const emExec = os.etapa === 'execucao' || ag?.status === 'em_atendimento' || ag?.status === 'em_execucao';
      const semPrestador = !os.tecnicoId && !concluida;
      const agendada =
        !!ag &&
        !['cancelado'].includes(ag.status) &&
        !concluida &&
        !emExec;
      const agHoje = ag && ag.data >= inicioHoje && ag.data <= fimHoje;
      const atrasada =
        !concluida &&
        !!ag &&
        ag.data < inicioHoje &&
        !['cancelado', 'ausente'].includes(ag.status);
      const ocorrencia =
        (os.pedido.cliente?.ocorrenciasAusencia || 0) > 0 || ag?.status === 'ausente';

      if (agHoje) {
        op.osHoje += 1;
        op.ids.osHoje.push(os.id);
      }
      if (semPrestador) {
        op.aguardandoPrestador += 1;
        op.ids.aguardandoPrestador.push(os.id);
      }
      if (agendada) {
        op.agendadas += 1;
        op.ids.agendadas.push(os.id);
      }
      if (emExec) {
        op.emExecucao += 1;
        op.ids.emExecucao.push(os.id);
      }
      if (concluida && os.updatedAt >= atual.inicio && os.updatedAt <= atual.fim) {
        op.concluidas += 1;
        op.ids.concluidas.push(os.id);
      }
      if (atrasada) {
        op.atrasadas += 1;
        op.ids.atrasadas.push(os.id);
      }
      if (ocorrencia && !concluida) {
        op.comOcorrencia += 1;
        op.ids.comOcorrencia.push(os.id);
      }
    }

    // Serviços performance
    const custoPorPedido = new Map<string, number>();
    const custoPorOs = new Map<string, number>();
    for (const c of custosOs) {
      const v = toNumber(c.valor);
      if (c.pedidoId) custoPorPedido.set(c.pedidoId, (custoPorPedido.get(c.pedidoId) || 0) + v);
      if (c.ordemServicoId) custoPorOs.set(c.ordemServicoId, (custoPorOs.get(c.ordemServicoId) || 0) + v);
    }

    const servMap = new Map<
      string,
      { servico: string; quantidade: number; receita: number; custoDireto: number }
    >();
    for (const s of solicitacoesPeriodo) {
      const nome = s.servico.nome;
      if (!servMap.has(nome)) servMap.set(nome, { servico: nome, quantidade: 0, receita: 0, custoDireto: 0 });
      const row = servMap.get(nome)!;
      row.quantidade += 1;
      row.receita += toNumber(s.precoFinal || 0);
      const osId = s.pedido?.ordemServico?.id;
      const pedId = s.pedidoId || undefined;
      row.custoDireto +=
        (osId ? custoPorOs.get(osId) || 0 : 0) + (pedId ? custoPorPedido.get(pedId) || 0 : 0);
    }
    const desempenhoServicos = [...servMap.values()].map((r) => {
      const margemR = r.receita - r.custoDireto;
      return {
        ...r,
        receita: round2(r.receita),
        ticketMedio: r.quantidade ? round2(r.receita / r.quantidade) : 0,
        custoDireto: round2(r.custoDireto),
        margemContribuicao: round2(margemR),
        margemPct: r.receita > 0 ? round2((margemR / r.receita) * 100) : 0,
        custoReal: r.custoDireto > 0,
      };
    });

    // Clientes
    const clientesComPedidos = await prisma.pedido.groupBy({
      by: ['clienteId'],
      _count: { _all: true },
    });
    const recorrentes = clientesComPedidos.filter((c) => c._count._all > 1).length;
    const totalClientesAtivos = await prisma.cliente.count({ where: { status: 'ativo' } });
    const taxaRecompra =
      totalClientesAtivos > 0 ? round2((recorrentes / totalClientesAtivos) * 100) : 0;

    const topIds = topClientesRaw
      .sort((a, b) => toNumber(b._sum.valor) - toNumber(a._sum.valor))
      .slice(0, 10);
    const clientesInfo = await prisma.cliente.findMany({
      where: { id: { in: topIds.map((t) => t.clienteId) } },
      select: { id: true, nome: true },
    });
    const topClientes = topIds.map((t) => ({
      clienteId: t.clienteId,
      nome: clientesInfo.find((c) => c.id === t.clienteId)?.nome || '—',
      faturamento: round2(toNumber(t._sum.valor)),
      compras: t._count,
    }));

    return {
      periodo: atual,
      cards: {
        faturamento: metricComVariacao(faturamento, faturamentoAnt),
        receitaRecebida: metricComVariacao(receitaRecebida, receitaRecebidaAnt),
        margemContribuicao: {
          valor: margem,
          pct: margemPct,
          anterior: dreAnt.temDadosReais ? dreAnt.margemContribuicao : null,
          variacaoPct:
            margem != null && dreAnt.temDadosReais
              ? variacaoPercentual(margem, dreAnt.margemContribuicao)
              : null,
          fonte: dre.temDadosReais ? 'financeiro' : 'indisponivel',
        },
        resultadoOperacional: {
          valor: resultado,
          anterior: dreAnt.temDadosReais ? dreAnt.resultadoOperacional : null,
          variacaoPct:
            resultado != null && dreAnt.temDadosReais
              ? variacaoPercentual(resultado, dreAnt.resultadoOperacional)
              : null,
          fonte: dre.temDadosReais ? 'financeiro' : 'indisponivel',
        },
        numeroVendas: metricComVariacao(nVendas, pedidosAnt.length),
        ticketMedio: metricComVariacao(ticketMedio, ticketAnt),
      },
      comercial: {
        funil: {
          leads: leadsPeriodo,
          orcamentos: orcamentosPeriodo,
          vendas,
          taxaLeadOrcamento: taxaLeadOrc,
          taxaOrcamentoVenda: taxaOrcVenda,
          taxaLeadVenda: taxaLeadVenda,
        },
        vendasPorOrigem,
        marketing,
      },
      operacao: op,
      financeiro: {
        saldoDisponivel: finResumo.saldoDisponivel,
        aReceber: finResumo.aReceber,
        aPagar: finResumo.aPagar,
        vencidos: finResumo.vencidos,
        receitasXDespesas: finResumo.receitasXDespesas,
        despesasPorCategoria: finResumo.despesasPorCategoria,
        temDadosReais: finResumo.temDadosReais,
      },
      servicos: desempenhoServicos,
      clientes: {
        novos: clientesNovos,
        novosAnterior: clientesNovosAnt,
        recorrentes,
        taxaRecompra,
        topClientes,
      },
      alertas: alertasBase,
      dre,
    };
  }

  private async montarAlertas() {
    const agora = new Date();
    const hoje = ymdBrasil();
    const inicioHoje = inicioDiaBrasil(hoje);

    const [osSemPrestador, osAtrasadas, contasVencidas, pagPendentes, leadsAguardando, ocorrencias] =
      await Promise.all([
        prisma.ordemServico.findMany({
          where: {
            tecnicoId: null,
            etapa: { notIn: ['conclusao', 'avaliacao'] },
          },
          take: 20,
          include: { pedido: { select: { id: true, numero: true } } },
        }),
        prisma.agendamento.findMany({
          where: {
            data: { lt: inicioHoje },
            status: { notIn: ['cancelado'] },
            pedido: { ordemServico: { etapa: { notIn: ['conclusao', 'avaliacao'] } } },
          },
          take: 20,
          include: {
            pedido: { include: { ordemServico: true, cliente: { select: { nome: true } } } },
          },
        }),
        prisma.finLancamento.findMany({
          where: {
            natureza: { in: ['receita', 'despesa'] },
            status: { in: ['a_receber', 'a_pagar', 'vencida', 'prevista'] },
            dataVencimento: { lt: agora },
          },
          take: 20,
          orderBy: { dataVencimento: 'asc' },
        }),
        prisma.pagamento.findMany({
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          take: 20,
          include: { cliente: { select: { nome: true } }, pedido: { select: { numero: true } } },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.lead.findMany({
          where: {
            statusComercial: 'aguardando_cliente',
            OR: [{ proximoContato: { lte: agora } }, { proximoContato: null }],
          },
          take: 20,
          orderBy: { proximoContato: 'asc' },
        }),
        prisma.agendamento.findMany({
          where: { status: 'ausente' },
          take: 20,
          include: { cliente: { select: { nome: true } }, pedido: { select: { id: true, numero: true } } },
        }),
      ]);

    type Alerta = {
      tipo: string;
      titulo: string;
      descricao: string;
      link: string;
      severidade: 'alta' | 'media' | 'baixa';
    };
    const alertas: Alerta[] = [];

    for (const os of osSemPrestador) {
      alertas.push({
        tipo: 'os_sem_prestador',
        titulo: 'OS sem prestador',
        descricao: `Pedido ${os.pedido.numero}`,
        link: `/ordens-servico?os=${os.id}`,
        severidade: 'alta',
      });
    }
    for (const ag of osAtrasadas) {
      const osId = ag.pedido?.ordemServico?.id;
      alertas.push({
        tipo: 'os_atrasada',
        titulo: 'OS atrasada',
        descricao: `${ag.pedido?.cliente?.nome || 'Cliente'} — ${ag.pedido?.numero || ''}`,
        link: osId ? `/ordens-servico?os=${osId}` : '/agenda',
        severidade: 'alta',
      });
    }
    for (const c of contasVencidas) {
      alertas.push({
        tipo: 'conta_vencida',
        titulo: 'Conta vencida',
        descricao: `${c.descricao} — R$ ${toNumber(c.valor).toFixed(2)}`,
        link: `/financeiro?tab=lancamentos&id=${c.id}`,
        severidade: 'alta',
      });
    }
    for (const p of pagPendentes) {
      alertas.push({
        tipo: 'pagamento_pendente',
        titulo: p.status === 'OVERDUE' ? 'Pagamento vencido' : 'Pagamento pendente',
        descricao: `${p.cliente?.nome || ''} — ${p.pedido?.numero || ''}`,
        link: `/financeiro?tab=cobrancas&pagamento=${p.id}`,
        severidade: p.status === 'OVERDUE' ? 'alta' : 'media',
      });
    }
    for (const o of ocorrencias) {
      alertas.push({
        tipo: 'ocorrencia_aberta',
        titulo: 'Ocorrência (ausência)',
        descricao: o.cliente?.nome || 'Cliente',
        link: o.pedidoId ? `/pedidos/${o.pedidoId}` : '/agenda',
        severidade: 'media',
      });
    }
    for (const l of leadsAguardando) {
      alertas.push({
        tipo: 'orcamento_aguardando',
        titulo: 'Orçamento aguardando retorno',
        descricao: `${l.nome} — ${l.interesse || 'oportunidade'}`,
        link: `/crm?lead=${l.id}`,
        severidade: 'media',
      });
    }

    return alertas.slice(0, 40);
  }

  /** Compat: KPIs legados — redireciona para gerencial do mês. */
  async getKPIs() {
    const g = await this.getGerencial({ periodo: 'mes' });
    return {
      comercial: {
        totalLeads: g.comercial.funil.leads,
        leadsFechados: g.comercial.funil.vendas,
        taxaConversao: g.comercial.funil.taxaLeadVenda,
        ticketMedio: g.cards.ticketMedio.valor,
        totalClientes: g.clientes.recorrentes + g.clientes.novos,
        clientesRecorrentes: g.clientes.recorrentes,
        campanhasPendentes: 0,
      },
      operacional: {
        totalPedidos: g.cards.numeroVendas.valor,
        pedidosFinalizados: g.operacao.concluidas,
        pedidosCancelados: 0,
        osEmAndamento: g.operacao.emExecucao + g.operacao.agendadas,
        servicosExecutados: g.operacao.concluidas,
        cancelamentos: 0,
        pedidosPorStatus: [],
        servicosPorCategoria: g.servicos.map((s) => ({ categoria: s.servico, total: s.quantidade })),
      },
      financeiro: {
        faturamentoDiario: 0,
        receitaMes: g.cards.receitaRecebida.valor,
        receitaTotal: g.cards.receitaRecebida.valor,
        lucroEstimado: g.cards.resultadoOperacional.valor ?? 0,
        inadimplencia: 0,
        pagamentosMes: g.cards.numeroVendas.valor,
        margemPorServico: g.servicos.map((s) => ({
          servico: s.servico,
          count: s.quantidade,
          receita: s.receita,
          margemEstimada: s.margemContribuicao,
          margemPct: s.margemPct,
        })),
      },
      leadsPorEtapa: [],
      gerencial: g,
    };
  }

  async getReceitaMensal() {
    const pagamentos = await prisma.pagamento.findMany({
      where: { status: 'RECEIVED' },
      select: { valor: true, paymentDate: true, createdAt: true },
    });
    const porMes: Record<string, number> = {};
    pagamentos.forEach((p) => {
      const key = ymdBrasil(p.paymentDate ?? p.createdAt).slice(0, 7);
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
        .filter((p) => ymdBrasil(p.paymentDate ?? p.createdAt) === diaKey)
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
    const senhaHash = await bcrypt.hash(data.senha, 12);
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
