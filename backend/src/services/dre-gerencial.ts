/**
 * Motor do DRE Gerencial (competência): árvore, cards, comparação, dimensões e marketing.
 */
import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import {
  normalizarOrigem,
  periodoAnteriorEquivalente,
  resolverPeriodo,
  round2,
  variacaoPercentual,
} from '../utils/periodo.js';

export type DreDimensao = 'consolidado' | 'categoria' | 'servico' | 'prestador' | 'cliente' | 'canal';

export type DreLinha = {
  id: string;
  tipo: 'grupo' | 'sub' | 'total';
  label: string;
  valor: number;
  pctSobreReceitaLiquida?: number | null;
  sinal?: 'mais' | 'menos' | 'resultado';
  drillKey: string;
  filhos?: DreLinha[];
};

export type DreCardMetric = {
  valor: number;
  anterior: number;
  variacaoPct: number | null;
  variacaoPp?: number | null;
};

type LancDre = {
  id: string;
  natureza: string;
  descricao: string;
  valor: number;
  status: string;
  dataCompetencia: Date;
  grupoDre: string;
  categoriaNome: string;
  subNome: string;
  linhaLabel: string;
  clienteId: string | null;
  clienteNome: string | null;
  canal: string;
  servicoId: string | null;
  servicoNome: string | null;
  prestadorId: string | null;
  prestadorNome: string | null;
  pedidoId: string | null;
  pedidoNumero: string | null;
  ordemServicoId: string | null;
};

function isCustoVariavel(grupo: string) {
  return grupo === 'custo_direto' || grupo === 'custo_variavel';
}

function normalizarLinhaLabel(grupo: string, catNome: string, subNome: string, descricao: string): string {
  const blob = `${catNome} ${subNome} ${descricao}`.toLowerCase();

  if (grupo === 'receita_bruta') {
    if (/material/.test(blob)) return 'Receita de materiais';
    if (/outr/.test(blob) && !/servi/.test(blob)) return 'Outras receitas';
    return 'Receita de serviços';
  }
  if (grupo === 'deducoes') {
    if (/cashback|cash back/.test(blob)) return 'Cashback concedido';
    if (/imposto|iss|pis|cofins|ibs|cbs/.test(blob)) return 'Impostos sobre faturamento';
    if (/desconto/.test(blob)) return 'Descontos';
    if (/estorno|reembolso/.test(blob)) return 'Estornos/reembolsos';
    return subNome || 'Outras deduções';
  }
  if (isCustoVariavel(grupo)) {
    if (/repasse|prestador/.test(blob)) return 'Repasse para prestadores';
    if (/material/.test(blob)) return 'Materiais utilizados';
    if (/log[ií]st|frete|desloc/.test(blob)) return 'Logística/frete/deslocamento';
    if (/taxa.*exec|execu/.test(blob)) return 'Taxas diretamente relacionadas à execução';
    return subNome || 'Outros custos variáveis do serviço';
  }
  if (grupo === 'despesa_comercial') {
    if (/google/.test(blob)) return 'Google Ads';
    if (/meta|facebook|instagram ads/.test(blob)) return 'Meta Ads';
    if (/m[ií]dia|ads|marketing/.test(blob)) return 'Outras mídias';
    if (/comiss/.test(blob)) return 'Comissões comerciais';
    if (/ferramenta|crm|software comercial/.test(blob)) return 'Ferramentas comerciais/marketing';
    return subNome || 'Outras despesas comerciais';
  }
  if (grupo === 'despesa_administrativa') {
    if (/pr[oó]-?labore|prolabore/.test(blob)) return 'Pró-labore';
    if (/sal[aá]rio/.test(blob)) return 'Salários administrativos';
    if (/sistema|software|saas/.test(blob)) return 'Sistemas/software';
    if (/contab/.test(blob)) return 'Contabilidade';
    if (/telef|internet/.test(blob)) return 'Telefonia/internet';
    if (/jur[ií]d/.test(blob)) return 'Jurídico';
    if (/aluguel/.test(blob)) return 'Aluguel';
    return subNome || 'Outras despesas administrativas';
  }
  if (grupo === 'despesa_financeira') {
    if (/cart[aã]o|card/.test(blob)) return 'Taxas de cartão';
    if (/gateway|asaas|stripe/.test(blob)) return 'Taxas de gateway';
    if (/tarif/.test(blob)) return 'Tarifas bancárias';
    if (/juro/.test(blob)) return 'Juros';
    return subNome || 'Outras despesas financeiras';
  }
  return subNome || catNome || 'Outros';
}

async function carregarLancamentosDre(inicio: Date, fim: Date): Promise<LancDre[]> {
  const rows = await prisma.finLancamento.findMany({
    where: {
      natureza: { in: ['receita', 'despesa'] },
      status: { notIn: ['cancelada'] },
      dataCompetencia: { gte: inicio, lte: fim },
    },
    include: {
      categoria: true,
      subcategoria: true,
      cliente: { select: { id: true, nome: true, origem: true } },
      pedido: {
        select: {
          id: true,
          numero: true,
          servico: { select: { id: true, nome: true } },
          solicitacao: { select: { servico: { select: { id: true, nome: true } } } },
          ordemServico: { select: { id: true, tecnico: { select: { id: true, nome: true } } } },
        },
      },
      ordemServico: {
        select: { id: true, tecnico: { select: { id: true, nome: true } } },
      },
    },
  });

  return rows.map((l) => {
    const grupo = l.categoria?.grupoDre || '';
    const catNome = l.categoria?.nome || '';
    const subNome = l.subcategoria?.nome || '';
    const servico =
      l.pedido?.servico ||
      l.pedido?.solicitacao?.servico ||
      null;
    const os = l.ordemServico || l.pedido?.ordemServico || null;
    const tecnico = os?.tecnico || null;
    return {
      id: l.id,
      natureza: l.natureza,
      descricao: l.descricao,
      valor: toNumber(l.valor),
      status: l.status,
      dataCompetencia: l.dataCompetencia,
      grupoDre: grupo,
      categoriaNome: catNome,
      subNome,
      linhaLabel: normalizarLinhaLabel(grupo, catNome, subNome, l.descricao),
      clienteId: l.clienteId,
      clienteNome: l.cliente?.nome || null,
      canal: normalizarOrigem(l.cliente?.origem),
      servicoId: servico?.id || null,
      servicoNome: servico?.nome || null,
      prestadorId: tecnico?.id || null,
      prestadorNome: tecnico?.nome || null,
      pedidoId: l.pedidoId || l.pedido?.id || null,
      pedidoNumero: l.pedido?.numero || null,
      ordemServicoId: l.ordemServicoId || os?.id || null,
    };
  });
}

function somarGrupo(lancs: LancDre[], grupo: string | string[], natureza?: string) {
  const grupos = Array.isArray(grupo) ? grupo : [grupo];
  return round2(
    lancs
      .filter((l) => {
        if (natureza && l.natureza !== natureza) return false;
        if (l.status === 'estornada' && !grupos.includes('deducoes')) return false;
        if (grupos.some(isCustoVariavel)) return isCustoVariavel(l.grupoDre) && l.natureza === 'despesa';
        return grupos.includes(l.grupoDre);
      })
      .reduce((s, l) => s + l.valor, 0)
  );
}

function agregarSublinha(lancs: LancDre[], pred: (l: LancDre) => boolean) {
  const map = new Map<string, number>();
  for (const l of lancs) {
    if (!pred(l)) continue;
    const key = l.linhaLabel;
    map.set(key, round2((map.get(key) || 0) + l.valor));
  }
  return [...map.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function cardMetric(atual: number, anterior: number, asPp = false): DreCardMetric {
  return {
    valor: round2(atual),
    anterior: round2(anterior),
    variacaoPct: asPp ? null : variacaoPercentual(atual, anterior),
    variacaoPp: asPp ? round2(atual - anterior) : null,
  };
}

function montarTotais(lancs: LancDre[]) {
  const receitaBruta = somarGrupo(lancs, 'receita_bruta', 'receita');
  const deducoesLanc = somarGrupo(lancs, 'deducoes');
  const estornosReceita = round2(
    lancs
      .filter((l) => l.natureza === 'receita' && l.status === 'estornada')
      .reduce((s, l) => s + l.valor, 0)
  );
  const deducoes = round2(deducoesLanc + estornosReceita);
  const receitaLiquida = round2(receitaBruta - deducoes);
  const custosVariaveis = somarGrupo(lancs, ['custo_direto', 'custo_variavel'], 'despesa');
  const margemContribuicao = round2(receitaLiquida - custosVariaveis);
  const despesasComerciais = somarGrupo(lancs, 'despesa_comercial', 'despesa');
  const resultadoAposAquisicao = round2(margemContribuicao - despesasComerciais);
  const despesasAdmin = somarGrupo(lancs, 'despesa_administrativa', 'despesa');
  const despesasFinanceiras = somarGrupo(lancs, 'despesa_financeira', 'despesa');
  const resultadoOperacional = round2(
    resultadoAposAquisicao - despesasAdmin - despesasFinanceiras
  );
  const margemContribuicaoPct =
    receitaLiquida > 0 ? round2((margemContribuicao / receitaLiquida) * 100) : 0;
  const margemOperacionalPct =
    receitaLiquida > 0 ? round2((resultadoOperacional / receitaLiquida) * 100) : 0;

  return {
    receitaBruta,
    deducoes,
    receitaLiquida,
    custosVariaveis,
    margemContribuicao,
    margemContribuicaoPct,
    despesasComerciais,
    resultadoAposAquisicao,
    despesasAdministrativas: despesasAdmin,
    despesasFinanceiras,
    resultadoOperacional,
    margemOperacionalPct,
  };
}

function pctRl(valor: number, receitaLiquida: number) {
  if (!(receitaLiquida > 0)) return null;
  return round2((valor / receitaLiquida) * 100);
}

function montarLinhas(lancs: LancDre[], totais: ReturnType<typeof montarTotais>): DreLinha[] {
  const rl = totais.receitaLiquida;

  const grupo = (
    id: string,
    label: string,
    valor: number,
    sinal: DreLinha['sinal'],
    pred: (l: LancDre) => boolean,
    tipo: DreLinha['tipo'] = 'grupo'
  ): DreLinha => {
    const subs = agregarSublinha(lancs, pred);
    return {
      id,
      tipo,
      label,
      valor: round2(valor),
      pctSobreReceitaLiquida: pctRl(valor, rl),
      sinal,
      drillKey: id,
      filhos: subs.map((s) => ({
        id: `${id}::${s.label}`,
        tipo: 'sub' as const,
        label: s.label,
        valor: s.valor,
        pctSobreReceitaLiquida: pctRl(s.valor, rl),
        sinal,
        drillKey: `${id}::${encodeURIComponent(s.label)}`,
      })),
    };
  };

  const total = (id: string, label: string, valor: number): DreLinha => ({
    id,
    tipo: 'total',
    label,
    valor: round2(valor),
    pctSobreReceitaLiquida: pctRl(valor, rl),
    sinal: 'resultado',
    drillKey: id,
  });

  return [
    grupo(
      'receita_bruta',
      'Receita bruta',
      totais.receitaBruta,
      'mais',
      (l) => l.grupoDre === 'receita_bruta' && l.natureza === 'receita' && l.status !== 'estornada'
    ),
    grupo(
      'deducoes',
      '(-) Deduções da receita',
      totais.deducoes,
      'menos',
      (l) =>
        l.grupoDre === 'deducoes' ||
        (l.natureza === 'receita' && l.status === 'estornada')
    ),
    total('receita_liquida', '= Receita líquida', totais.receitaLiquida),
    grupo(
      'custos_variaveis',
      '(-) Custos variáveis / Custo dos serviços',
      totais.custosVariaveis,
      'menos',
      (l) => isCustoVariavel(l.grupoDre) && l.natureza === 'despesa'
    ),
    total('margem_contribuicao', '= Margem de contribuição', totais.margemContribuicao),
    grupo(
      'despesa_comercial',
      '(-) Despesas comerciais',
      totais.despesasComerciais,
      'menos',
      (l) => l.grupoDre === 'despesa_comercial' && l.natureza === 'despesa'
    ),
    total('resultado_apos_aquisicao', '= Resultado após aquisição', totais.resultadoAposAquisicao),
    grupo(
      'despesa_administrativa',
      '(-) Despesas administrativas',
      totais.despesasAdministrativas,
      'menos',
      (l) => l.grupoDre === 'despesa_administrativa' && l.natureza === 'despesa'
    ),
    grupo(
      'despesa_financeira',
      '(-) Despesas financeiras',
      totais.despesasFinanceiras,
      'menos',
      (l) => l.grupoDre === 'despesa_financeira' && l.natureza === 'despesa'
    ),
    total('resultado_operacional', '= Resultado operacional', totais.resultadoOperacional),
  ];
}

function dimensaoDe(l: LancDre, dimensao: DreDimensao): { chave: string; label: string } {
  switch (dimensao) {
    case 'categoria':
      return { chave: l.categoriaNome || 'sem_categoria', label: l.categoriaNome || 'Sem categoria' };
    case 'servico':
      return {
        chave: l.servicoId || 'sem_servico',
        label: l.servicoNome || 'Sem serviço vinculado',
      };
    case 'prestador':
      return {
        chave: l.prestadorId || 'sem_prestador',
        label: l.prestadorNome || 'Sem prestador',
      };
    case 'cliente':
      return {
        chave: l.clienteId || 'sem_cliente',
        label: l.clienteNome || 'Sem cliente',
      };
    case 'canal':
      return { chave: l.canal, label: l.canal };
    default:
      return { chave: 'consolidado', label: 'Consolidado' };
  }
}

function montarDimensoes(lancs: LancDre[], dimensao: DreDimensao) {
  if (dimensao === 'consolidado') return undefined;
  const map = new Map<string, LancDre[]>();
  for (const l of lancs) {
    const { chave } = dimensaoDe(l, dimensao);
    if (!map.has(chave)) map.set(chave, []);
    map.get(chave)!.push(l);
  }
  return [...map.entries()]
    .map(([chave, items]) => {
      const t = montarTotais(items);
      const label = dimensaoDe(items[0], dimensao).label;
      return {
        chave,
        label,
        receitaBruta: t.receitaBruta,
        receitaLiquida: t.receitaLiquida,
        custosVariaveis: t.custosVariaveis,
        margemContribuicao: t.margemContribuicao,
        margemPct: t.margemContribuicaoPct,
        despesasComerciais: t.despesasComerciais,
        resultadoOperacional: t.resultadoOperacional,
        margemOperacionalPct: t.margemOperacionalPct,
      };
    })
    .sort((a, b) => b.margemContribuicao - a.margemContribuicao);
}

function montarMarketing(lancs: LancDre[], totais: ReturnType<typeof montarTotais>) {
  const midia = lancs.filter(
    (l) =>
      l.grupoDre === 'despesa_comercial' &&
      l.natureza === 'despesa' &&
      /google|meta|ads|m[ií]dia|marketing/i.test(`${l.linhaLabel} ${l.subNome} ${l.descricao}`)
  );
  const investimento = round2(midia.reduce((s, l) => s + l.valor, 0));

  const canaisPaid = new Set(['meta_ads', 'google', 'instagram']);
  const clientes = new Set<string>();
  let receitaAtribuida = 0;
  for (const l of lancs) {
    if (l.natureza !== 'receita' || l.grupoDre !== 'receita_bruta' || l.status === 'estornada') continue;
    if (!canaisPaid.has(l.canal)) continue;
    receitaAtribuida += l.valor;
    if (l.clienteId) clientes.add(l.clienteId);
  }
  receitaAtribuida = round2(receitaAtribuida);
  const clientesAdquiridos = clientes.size;
  const cac = clientesAdquiridos > 0 ? round2(investimento / clientesAdquiridos) : null;
  const roas = investimento > 0 ? round2(receitaAtribuida / investimento) : null;
  const margemAposMidia = round2(totais.margemContribuicao - investimento);
  const margemAposMidiaPct =
    totais.receitaLiquida > 0 ? round2((margemAposMidia / totais.receitaLiquida) * 100) : null;

  return {
    investimento,
    clientesAdquiridos,
    receitaAtribuida,
    cac,
    roas,
    margemAposMidia,
    margemAposMidiaPct,
    nota: 'ROAS = receita atribuída / investimento em mídia. Não é lucro. Use margem após mídia para impacto na contribuição.',
  };
}

function matchDrillKey(l: LancDre, drillKey: string): boolean {
  const [grupo, subEnc] = drillKey.split('::');
  const sub = subEnc ? decodeURIComponent(subEnc) : null;

  const predGrupo = (id: string) => {
    switch (id) {
      case 'receita_bruta':
        return l.grupoDre === 'receita_bruta' && l.natureza === 'receita' && l.status !== 'estornada';
      case 'deducoes':
        return l.grupoDre === 'deducoes' || (l.natureza === 'receita' && l.status === 'estornada');
      case 'custos_variaveis':
        return isCustoVariavel(l.grupoDre) && l.natureza === 'despesa';
      case 'despesa_comercial':
        return l.grupoDre === 'despesa_comercial' && l.natureza === 'despesa';
      case 'despesa_administrativa':
        return l.grupoDre === 'despesa_administrativa' && l.natureza === 'despesa';
      case 'despesa_financeira':
        return l.grupoDre === 'despesa_financeira' && l.natureza === 'despesa';
      case 'receita_liquida':
      case 'margem_contribuicao':
      case 'resultado_apos_aquisicao':
      case 'resultado_operacional':
        return (
          (l.natureza === 'receita' && l.grupoDre === 'receita_bruta') ||
          l.grupoDre === 'deducoes' ||
          (l.natureza === 'receita' && l.status === 'estornada') ||
          (l.natureza === 'despesa' &&
            (isCustoVariavel(l.grupoDre) ||
              ['despesa_comercial', 'despesa_administrativa', 'despesa_financeira'].includes(
                l.grupoDre
              )))
        );
      default:
        return false;
    }
  };

  if (!predGrupo(grupo)) return false;
  if (sub) return l.linhaLabel === sub;
  return true;
}

export async function calcularDreGerencial(params: {
  periodo?: string;
  de?: string;
  ate?: string;
  dimensao?: string;
}) {
  const dimensao = (params.dimensao || 'consolidado') as DreDimensao;
  const atual = resolverPeriodo(params);
  const ant = periodoAnteriorEquivalente(atual.inicioYmd, atual.fimYmd);

  const [lancsAtual, lancsAnt] = await Promise.all([
    carregarLancamentosDre(atual.inicio, atual.fim),
    carregarLancamentosDre(ant.inicio, ant.fim),
  ]);

  const totais = montarTotais(lancsAtual);
  const totaisAnt = montarTotais(lancsAnt);
  const linhas = montarLinhas(lancsAtual, totais);

  return {
    periodo: {
      inicioYmd: atual.inicioYmd,
      fimYmd: atual.fimYmd,
      label: atual.label,
    },
    periodoAnterior: {
      inicioYmd: ant.inicioYmd,
      fimYmd: ant.fimYmd,
    },
    temDadosReais: lancsAtual.length > 0,
    // Compatibilidade com consumidores antigos (dashboard)
    receitaBruta: totais.receitaBruta,
    deducoes: totais.deducoes,
    receitaLiquida: totais.receitaLiquida,
    custosDiretos: totais.custosVariaveis,
    custosVariaveis: totais.custosVariaveis,
    custosDiretosDetalhe: agregarSublinha(lancsAtual, (l) => isCustoVariavel(l.grupoDre)).map(
      (x) => ({ nome: x.label, valor: x.valor })
    ),
    margemContribuicao: totais.margemContribuicao,
    margemContribuicaoPct: totais.margemContribuicaoPct,
    despesasComerciais: totais.despesasComerciais,
    despesasComerciaisDetalhe: agregarSublinha(
      lancsAtual,
      (l) => l.grupoDre === 'despesa_comercial'
    ).map((x) => ({ nome: x.label, valor: x.valor })),
    despesasAdministrativas: totais.despesasAdministrativas,
    despesasAdministrativasDetalhe: agregarSublinha(
      lancsAtual,
      (l) => l.grupoDre === 'despesa_administrativa'
    ).map((x) => ({ nome: x.label, valor: x.valor })),
    despesasFinanceiras: totais.despesasFinanceiras,
    resultadoOperacional: totais.resultadoOperacional,
    margemOperacionalPct: totais.margemOperacionalPct,
    resultadoAposAquisicao: totais.resultadoAposAquisicao,
    cards: {
      receitaBruta: cardMetric(totais.receitaBruta, totaisAnt.receitaBruta),
      receitaLiquida: cardMetric(totais.receitaLiquida, totaisAnt.receitaLiquida),
      custosVariaveis: cardMetric(totais.custosVariaveis, totaisAnt.custosVariaveis),
      margemContribuicao: cardMetric(totais.margemContribuicao, totaisAnt.margemContribuicao),
      margemContribuicaoPct: cardMetric(
        totais.margemContribuicaoPct,
        totaisAnt.margemContribuicaoPct,
        true
      ),
      despesasComerciais: cardMetric(totais.despesasComerciais, totaisAnt.despesasComerciais),
      resultadoOperacional: cardMetric(
        totais.resultadoOperacional,
        totaisAnt.resultadoOperacional
      ),
      margemOperacionalPct: cardMetric(
        totais.margemOperacionalPct,
        totaisAnt.margemOperacionalPct,
        true
      ),
    },
    linhas,
    marketing: montarMarketing(lancsAtual, totais),
    dimensoes: montarDimensoes(lancsAtual, dimensao),
    dimensao,
  };
}

export async function dreDrilldown(params: {
  drillKey: string;
  periodo?: string;
  de?: string;
  ate?: string;
}) {
  if (!params.drillKey) throw new Error('drillKey obrigatório');
  const atual = resolverPeriodo(params);
  const lancs = await carregarLancamentosDre(atual.inicio, atual.fim);
  const items = lancs
    .filter((l) => matchDrillKey(l, params.drillKey))
    .map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: l.valor,
      natureza: l.natureza,
      status: l.status,
      dataCompetencia: l.dataCompetencia,
      categoria: l.categoriaNome,
      subcategoria: l.subNome,
      linha: l.linhaLabel,
      clienteId: l.clienteId,
      clienteNome: l.clienteNome,
      pedidoId: l.pedidoId,
      pedidoNumero: l.pedidoNumero,
      ordemServicoId: l.ordemServicoId,
      prestadorNome: l.prestadorNome,
      servicoNome: l.servicoNome,
      canal: l.canal,
    }))
    .sort((a, b) => b.valor - a.valor);

  return {
    drillKey: params.drillKey,
    periodo: { inicioYmd: atual.inicioYmd, fimYmd: atual.fimYmd, label: atual.label },
    total: round2(items.reduce((s, i) => s + i.valor, 0)),
    items,
  };
}
