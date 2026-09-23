export type Role = 'admin' | 'comercial' | 'operacional' | 'cliente' | 'parceiro';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  createdAt: string;
  clienteId?: string;
  cliente?: { id: string; nome: string; tipo: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface Cliente {
  id: string;
  tipo: 'PF' | 'PJ';
  nome: string;
  cpf?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  responsavel?: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  endereco: Record<string, string>;
  status: string;
  origem?: string;
  consentimentoLgpd: boolean;
  createdAt: string;
  pedidos?: Pedido[];
  interacoes?: Interacao[];
  pagamentos?: Pagamento[];
  agendamentos?: Array<{
    id: string;
    data: string;
    status: string;
    tecnico?: { nome: string };
    pedido?: { numero: string };
  }>;
  leads?: Lead[];
  user?: { id: string; email: string };
  solicitacoes?: SolicitacaoFotos[];
  ultimaCompra?: string | null;
  numeroServicos?: number;
  totalGasto?: number;
  ticketMedio?: number;
  kpis?: {
    totalGasto: number;
    quantidadeServicos: number;
    ticketMedio: number;
    ultimaCompra?: string | null;
    pedidos: number;
    os: number;
  };
}

export interface SolicitacaoFotos {
  id: string;
  status: string;
  fotos?: string[];
  opcoes?: Record<string, unknown>;
  createdAt: string;
  servico?: { nome: string; slug: string };
}

export interface Lead {
  id: string;
  nome: string;
  cpfCnpj?: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: string;
  campanha?: string | null;
  categoriaInteresse?: string | null;
  catalogoServicoId?: string | null;
  responsavel: string;
  etapa: string;
  statusComercial?: string;
  valorEstimado?: number | string | null;
  motivoPerda?: string | null;
  observacaoPerda?: string | null;
  motivoAbandono?: string | null;
  observacaoAbandono?: string | null;
  tipoCliente?: string | null;
  dataQualificacao?: string | null;
  dataOrcamento?: string | null;
  dataFechamento?: string | null;
  dataPerda?: string | null;
  dataAbandono?: string | null;
  proximoContato?: string | null;
  dataUltimaInteracao?: string | null;
  proximaAcao?: string | null;
  observacoes?: string | null;
  clienteId?: string | null;
  solicitacaoId?: string | null;
  pedidoId?: string | null;
  createdAt: string;
  interacoes?: Interacao[];
  movimentacoes?: LeadMovimentacao[];
  catalogoServico?: { id: string; nome: string; slug: string; categoria: string } | null;
  solicitacao?: {
    id: string;
    status: string;
    precoFinal?: number | string | null;
    pedidoId?: string | null;
  } | null;
  pedido?: { id: string; numero: string; status: string; valor: number | string } | null;
  cliente?: { id: string; nome: string; email?: string; telefone?: string } | null;
}

export interface LeadMovimentacao {
  id: string;
  etapaAnterior?: string | null;
  etapaNova: string;
  motivo?: string | null;
  observacao?: string | null;
  usuarioNome?: string | null;
  createdAt: string;
}

export interface CrmMotivoResumo {
  motivo: string;
  quantidade: number;
  percentual: number;
}

export interface CrmIndicadores {
  leads: number;
  leadsQualificados: number;
  abandonaramQualificacao?: number;
  perdidos?: number;
  orcamentos: number;
  vendas: number;
  vendasNovosClientes?: number;
  valorPipeline: number;
  receita?: number;
  taxaQualificacao?: number;
  taxaAbandono?: number;
  taxaQualificadoOrcamento?: number;
  taxaOrcamentoVenda?: number;
  taxaConversao: number;
  ticketMedio: number;
  tempoMedioFechamento: number | null;
  porEtapa?: Array<{ etapa: string; quantidade: number }>;
  motivosAbandono?: CrmMotivoResumo[];
  motivosPerda?: CrmMotivoResumo[];
  porOrigem?: Array<{
    origem: string;
    leads: number;
    qualificados: number;
    orcamentos: number;
    vendas: number;
    receita: number;
  }>;
  porCampanha?: Array<{
    campanha: string;
    leads: number;
    qualificados: number;
    orcamentos: number;
    vendas: number;
    receita: number;
  }>;
  funil?: {
    leads: number;
    qualificados: number;
    orcamentos: number;
    vendas: number;
    taxaLeadQualificado: number;
    taxaQualificadoOrcamento: number;
    taxaOrcamentoVenda: number;
    taxaLeadVenda: number;
  };
  atrasados?: number;
}

export interface LeadTimelineItem {
  tipo: string;
  titulo: string;
  descricao: string;
  data: string;
  meta?: Record<string, unknown>;
}

export interface Interacao {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
  usuario?: { nome: string };
}

export interface Pedido {
  id: string;
  numero: string;
  clienteId: string;
  valor: number | string;
  responsavel: string;
  status: string;
  descricao?: string;
  createdAt: string;
  cliente?: { id: string; nome: string; email?: string; telefone?: string };
  ordemServico?: OrdemServico;
  servico?: { nome: string };
  pagamentos?: Pagamento[];
}

export interface OrdemServico {
  id: string;
  pedidoId: string;
  etapa: string;
  observacoes?: string;
  parceiro?: string;
  checklist?: Record<string, string> | null;
  checklistCompleto?: boolean;
  garantiaId?: string | null;
  tecnicoId?: string | null;
  materiaisSnapshot?: unknown;
  materiaisAjusteManual?: boolean;
  materiais?: OsMaterial[];
  createdAt?: string;
  updatedAt?: string;
  tecnico?: { id: string; nome: string } | null;
  pedido?: Pedido & {
    cliente?: {
      id?: string;
      nome: string;
      email?: string;
      telefone?: string;
      endereco?: Record<string, string> | null;
    };
    servico?: { id?: string; nome: string; categoria?: string } | null;
    solicitacao?: {
      fotos?: unknown;
      opcoes?: unknown;
      precoFinal?: number | string;
      servico?: { nome: string; categoria?: string; slug?: string };
    } | null;
    agendamentos?: Array<{
      id: string;
      data: string;
      horarioInicio: string;
      horarioFim: string;
      status: string;
      tecnico?: { id: string; nome: string } | null;
    }>;
    pagamentos?: Array<{
      id: string;
      status: string;
      valor: number | string;
      metodo: string;
      paymentDate?: string | null;
      dueDate?: string;
    }>;
  };
}

export interface OsMaterial {
  id: string;
  ordemServicoId?: string;
  receitaId?: string | null;
  receitaMaterialId?: string | null;
  nome: string;
  especificacao?: string | null;
  bitolaModelo?: string | null;
  unidade: string;
  quantidade: number | string;
  custoUnitario?: number | string | null;
  custoPrevisto?: number | string | null;
  observacao?: string | null;
  origem: string;
  ativo?: boolean;
  ordem?: number;
}

export interface Pagamento {
  id: string;
  clienteId: string;
  pedidoId?: string;
  asaasId?: string;
  valor: number | string;
  metodo: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  createdAt?: string;
  invoiceUrl?: string;
  pixCode?: string;
  pixQrImage?: string;
  cliente?: { id: string; nome: string };
  pedido?: { numero: string };
}

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  preco?: number | string;
  parceiro?: string;
  ativo: boolean;
}

export interface Beneficio {
  id: string;
  parceiro: string;
  categoria: string;
  descricao: string;
  cupom?: string;
  cashback?: number | string;
  desconto?: number | string;
  ativo: boolean;
}

export interface DashboardKPIs {
  comercial: {
    totalLeads: number;
    leadsFechados: number;
    taxaConversao: number;
    ticketMedio: number;
    totalClientes: number;
    clientesRecorrentes: number;
    campanhasPendentes: number;
  };
  operacional: {
    totalPedidos: number;
    pedidosFinalizados: number;
    pedidosCancelados: number;
    osEmAndamento: number;
    servicosExecutados: number;
    cancelamentos: number;
    pedidosPorStatus: { status: string; _count: number }[];
    servicosPorCategoria: { categoria: string; total: number }[];
  };
  financeiro: {
    faturamentoDiario: number;
    receitaMes: number;
    receitaTotal: number;
    lucroEstimado: number;
    inadimplencia: number;
    pagamentosMes: number;
    margemPorServico: Array<{ servico: string; count: number; receita: number; margemEstimada: number; margemPct: number }>;
  };
  leadsPorEtapa: { etapa: string; _count: number }[];
}

export interface FinBaixa {
  id: string;
  tipo: string;
  dataMovimento: string;
  valorPrincipal: number;
  juros: number;
  multa: number;
  desconto: number;
  taxa: number;
  valorLiquido: number;
  formaPagamento?: string | null;
  anexoUrl?: string | null;
  observacoes?: string | null;
  estornado: boolean;
  conta?: { id: string; nome: string } | null;
}

export interface FinLancamento {
  id: string;
  natureza: string;
  descricao: string;
  valor: number;
  valorPago?: number;
  saldo?: number;
  status: string;
  statusEfetivo?: string;
  dataCompetencia: string;
  dataVencimento?: string | null;
  dataMovimento?: string | null;
  fornecedorNome?: string | null;
  formaPagamento?: string | null;
  observacoes?: string | null;
  anexoUrl?: string | null;
  contaId?: string | null;
  parcelaNumero?: number | null;
  parcelaTotal?: number | null;
  grupoParcelasId?: string | null;
  historico?: Array<Record<string, unknown>>;
  baixas?: FinBaixa[];
  categoria?: { id: string; nome: string; tipo: string } | null;
  subcategoria?: { id: string; nome: string } | null;
  conta?: { id: string; nome: string } | null;
  cliente?: { id: string; nome: string } | null;
  pedido?: { id: string; numero: string } | null;
  centroCusto?: { id: string; nome: string } | null;
}

export type DreDimensao = 'consolidado' | 'categoria' | 'servico' | 'prestador' | 'cliente' | 'canal';

export interface DreCardMetric {
  valor: number;
  anterior: number;
  variacaoPct: number | null;
  variacaoPp?: number | null;
}

export interface DreLinha {
  id: string;
  tipo: 'grupo' | 'sub' | 'total';
  label: string;
  valor: number;
  pctSobreReceitaLiquida?: number | null;
  sinal?: 'mais' | 'menos' | 'resultado';
  drillKey: string;
  filhos?: DreLinha[];
}

export interface DreGerencial {
  periodo: { inicioYmd: string; fimYmd: string; label: string };
  periodoAnterior?: { inicioYmd: string; fimYmd: string };
  temDadosReais: boolean;
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosDiretos: number;
  custosVariaveis: number;
  margemContribuicao: number;
  margemContribuicaoPct: number;
  despesasComerciais: number;
  despesasAdministrativas: number;
  despesasFinanceiras: number;
  resultadoOperacional: number;
  margemOperacionalPct: number;
  resultadoAposAquisicao?: number;
  cards: {
    receitaBruta: DreCardMetric;
    receitaLiquida: DreCardMetric;
    custosVariaveis: DreCardMetric;
    margemContribuicao: DreCardMetric;
    margemContribuicaoPct: DreCardMetric;
    despesasComerciais: DreCardMetric;
    resultadoOperacional: DreCardMetric;
    margemOperacionalPct: DreCardMetric;
  };
  linhas: DreLinha[];
  marketing?: {
    investimento: number;
    clientesAdquiridos: number;
    receitaAtribuida: number;
    cac: number | null;
    roas: number | null;
    margemAposMidia: number;
    margemAposMidiaPct: number | null;
    nota?: string;
  };
  dimensoes?: Array<{
    chave: string;
    label: string;
    receitaBruta: number;
    receitaLiquida: number;
    custosVariaveis: number;
    margemContribuicao: number;
    margemPct: number;
    despesasComerciais: number;
    resultadoOperacional: number;
    margemOperacionalPct: number;
  }>;
  dimensao?: DreDimensao;
}

export interface DreDrilldownItem {
  id: string;
  descricao: string;
  valor: number;
  natureza: string;
  status: string;
  dataCompetencia: string;
  categoria: string;
  subcategoria: string;
  linha: string;
  clienteId: string | null;
  clienteNome: string | null;
  pedidoId: string | null;
  pedidoNumero: string | null;
  ordemServicoId: string | null;
  prestadorNome: string | null;
  servicoNome: string | null;
  canal: string;
}

export interface DreDrilldown {
  drillKey: string;
  periodo: { inicioYmd: string; fimYmd: string; label: string };
  total: number;
  items: DreDrilldownItem[];
}

export interface DashboardGerencial {
  periodo: { inicioYmd: string; fimYmd: string; label: string };
  cards: {
    faturamento: { valor: number; anterior: number; variacaoPct: number | null };
    receitaRecebida: { valor: number; anterior: number; variacaoPct: number | null };
    margemContribuicao: {
      valor: number | null;
      pct: number | null;
      anterior: number | null;
      variacaoPct: number | null;
      fonte: string;
    };
    resultadoOperacional: {
      valor: number | null;
      anterior: number | null;
      variacaoPct: number | null;
      fonte: string;
    };
    numeroVendas: { valor: number; anterior: number; variacaoPct: number | null };
    ticketMedio: { valor: number; anterior: number; variacaoPct: number | null };
  };
  comercial: {
    funil: {
      leads: number;
      leadsQualificados?: number;
      abandonaramQualificacao?: number;
      perdidos?: number;
      orcamentos: number;
      vendas: number;
      vendasPedidos?: number;
      vendasCrm?: number;
      valorPipeline?: number;
      taxaConversao?: number;
      ticketMedioCrm?: number;
      tempoMedioFechamento?: number | null;
      taxaLeadOrcamento: number;
      taxaOrcamentoVenda: number;
      taxaLeadVenda: number;
      taxaLeadQualificado?: number;
      taxaQualificadoOrcamento?: number;
      taxaAbandono?: number;
      receita?: number;
    };
    vendasPorOrigem: Array<{
      origem: string;
      vendas: number;
      receita: number;
      leads?: number;
      qualificados?: number;
      orcamentos?: number;
    }>;
    motivosAbandono?: CrmMotivoResumo[];
    motivosPerda?: CrmMotivoResumo[];
    porCampanha?: Array<{
      campanha: string;
      leads: number;
      qualificados: number;
      orcamentos: number;
      vendas: number;
      receita: number;
    }>;
    marketing: {
      investimento: number;
      leads: number;
      leadsQualificados?: number;
      cpl: number | null;
      cpql?: number | null;
      custoOrcamento?: number | null;
      vendas: number;
      vendasNovos?: number;
      cac: number | null;
      receita: number;
      margem: number | null;
      roas?: number | null;
    };
  };
  operacao: {
    osHoje: number;
    aguardandoPrestador: number;
    agendadas: number;
    emExecucao: number;
    concluidas: number;
    atrasadas: number;
    comOcorrencia: number;
  };
  financeiro: {
    saldoDisponivel: number;
    aReceber: number;
    aPagar: number;
    vencidos: number;
    receitasXDespesas: Array<{ dia: string; receitas: number; despesas: number }>;
    despesasPorCategoria: Array<{ categoria: string; valor: number }>;
    temDadosReais: boolean;
  };
  servicos: Array<{
    servico: string;
    quantidade: number;
    receita: number;
    ticketMedio: number;
    custoDireto: number;
    margemContribuicao: number;
    margemPct: number;
    custoReal: boolean;
  }>;
  clientes: {
    novos: number;
    recorrentes: number;
    taxaRecompra: number;
    topClientes: Array<{ clienteId: string; nome: string; faturamento: number; compras: number }>;
  };
  alertas: Array<{
    tipo: string;
    titulo: string;
    descricao: string;
    link: string;
    severidade: string;
  }>;
}

export const MOTIVOS_PERDA = [
  'Preço',
  'Fechou com concorrente',
  'Desistiu do serviço',
  'Prazo/agenda',
  'Forma de pagamento',
  'Não respondeu após orçamento',
  'Orçamento não aprovado',
  'Fora do escopo da ABS Resolve',
  'Fora da área de atendimento',
  'Sem disponibilidade da equipe',
  'Outro',
] as const;

export const MOTIVOS_ABANDONO = [
  'Não respondeu à triagem',
  'Não enviou fotos/vídeos',
  'Não enviou informações necessárias',
  'Parou de responder',
  'Contato inválido',
  'Serviço não identificado',
  'Outro',
] as const;

export const ORIGENS_LEAD = [
  { key: 'site', label: 'Site' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'indicacao', label: 'Indicação' },
  { key: 'meta_ads', label: 'Meta Ads' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'google', label: 'Google' },
  { key: 'consultor_site', label: 'Consultor do site' },
  { key: 'manual', label: 'Manual' },
  { key: 'outros', label: 'Outros' },
] as const;

export const STATUS_COMERCIAL = [
  { key: 'em_andamento', label: 'Em andamento' },
  { key: 'aguardando_cliente', label: 'Aguardando cliente' },
  { key: 'fechado_ganho', label: 'Fechado ganho' },
  { key: 'perdido', label: 'Perdido' },
] as const;

export const ETAPAS_LEAD = [
  { key: 'novo_lead', label: 'Novo Lead' },
  { key: 'contato_realizado', label: 'Contato Realizado' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'proposta_enviada', label: 'Proposta Enviada' },
  { key: 'negociacao', label: 'Negociação' },
  { key: 'fechado', label: 'Fechado' },
  { key: 'perdido', label: 'Perdido' },
  { key: 'abandonou_qualificacao', label: 'Abandonou Qualificação' },
];

export const STATUS_PEDIDO = [
  { key: 'recebido', label: 'Recebido', color: 'bg-slate-100 text-slate-700' },
  { key: 'em_analise', label: 'Em Análise', color: 'bg-blue-100 text-blue-700' },
  { key: 'aguardando_documentacao', label: 'Aguardando Docs', color: 'bg-amber-100 text-amber-700' },
  { key: 'aguardando_pagamento', label: 'Aguardando Pagamento', color: 'bg-orange-100 text-orange-700' },
  { key: 'em_processamento', label: 'Em Processamento', color: 'bg-purple-100 text-purple-700' },
  { key: 'em_execucao', label: 'Em Execução', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'finalizado', label: 'Finalizado', color: 'bg-green-100 text-green-700' },
  { key: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
];

export const ETAPAS_OS = [
  { key: 'solicitacao', label: 'Solicitação' },
  { key: 'analise', label: 'Análise' },
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'aprovacao', label: 'Aprovação' },
  { key: 'execucao', label: 'Execução' },
  { key: 'conclusao', label: 'Conclusão' },
  { key: 'avaliacao', label: 'Avaliação' },
];

export function formatCurrency(val: number | string) {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

export function formatEndereco(endereco?: Record<string, string> | null) {
  if (!endereco || Object.keys(endereco).length === 0) return '—';
  const { rua, numero, bairro, cidade, uf, cep } = endereco;
  const parts = [
    [rua, numero].filter(Boolean).join(', '),
    bairro,
    [cidade, uf].filter(Boolean).join('/'),
    cep ? `CEP ${cep}` : '',
  ].filter(Boolean);
  return parts.join(' — ') || '—';
}

export function mapsLink(endereco?: Record<string, string> | null) {
  if (!endereco) return null;
  const q = [endereco.rua, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf, endereco.cep]
    .filter(Boolean)
    .join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export const PAGAMENTO_STATUS = [
  { key: 'PENDING', label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  { key: 'RECEIVED', label: 'Recebido', color: 'bg-green-100 text-green-700' },
  { key: 'CONFIRMED', label: 'Confirmado', color: 'bg-green-100 text-green-700' },
  { key: 'OVERDUE', label: 'Vencido', color: 'bg-red-100 text-red-700' },
  { key: 'REFUNDED', label: 'Estornado', color: 'bg-slate-100 text-slate-700' },
  { key: 'CANCELLED', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
] as const;

export function pagamentoStatusLabel(status: string) {
  return PAGAMENTO_STATUS.find((s) => s.key === status)?.label ?? status;
}

export function pagamentoStatusColor(status: string) {
  return PAGAMENTO_STATUS.find((s) => s.key === status)?.color ?? 'bg-slate-100 text-slate-700';
}

export interface TimelineStep {
  key: string;
  label: string;
  done: boolean;
  date?: string | null;
}

export interface PedidoTimeline extends Pedido {
  timeline: TimelineStep[];
  agendamento?: {
    id: string;
    data: string;
    horarioInicio: string;
    horarioFim: string;
    status: string;
  } | null;
  solicitacao?: {
    id?: string;
    status?: string;
    servico?: { nome: string };
    agendamento?: { id: string; data: string; horarioInicio: string; status: string };
  };
}

export interface Garantia {
  id: string;
  clienteId: string;
  servicoNome: string;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  diasRestantes: number;
  pedidoId?: string;
}

export interface SolicitacaoMinha {
  id: string;
  status: string;
  precoFinal: number | string;
  createdAt: string;
  servico?: { nome: string; slug: string };
  agendamento?: {
    id: string;
    data: string;
    horarioInicio: string;
    horarioFim: string;
    status: string;
  } | null;
  pedido?: { numero: string; id: string };
}

export interface SolicitacaoStatus {
  solicitacaoId: string;
  status: string;
  pedidoId?: string;
  pedidoNumero?: string;
  pagamento: {
    id: string;
    status: string;
    metodo: string;
    valor?: number;
    invoiceUrl?: string;
    pixCode?: string;
    pixQrImage?: string;
  } | null;
  podeAgendar: boolean;
  agendamento?: { id: string; data: string; horarioInicio: string } | null;
}

export interface SolicitacaoConfig {
  expressValor: number;
  taxaCancelamento: number;
  taxaAusencia: number;
  minimoCarrinhoServico?: number;
  minimoPecasIsentoEntrega?: number;
  descontoFidelidadePercent?: number;
  cashbackPercent?: number;
  bonusIndicacao?: number;
  garantiaPadraoDias?: number;
  descontoNovoClientePercent?: number;
  parcelamento?: {
    parcelasSemJuros: number;
    taxaJurosMesPercent: number;
  };
}

export interface AvaliacaoPendente {
  id: string;
  pedido: { numero: string; descricao?: string };
}

export interface EnderecoCliente {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface CatalogoServicoAdmin {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  precoMinimo: number | string | null;
  precoTexto: string | null;
  tipoPreco: string;
  descricao: string | null;
  garantiaDias: number;
  pontos: number;
  ativo: boolean;
  ordem: number;
  imagemUrl: string | null;
  imagens?: string[] | null;
  relacionados?: string[];
}

export interface ReceitaCondicao {
  id?: string;
  perguntaId: string;
  opcaoIds: string[] | unknown;
}

export interface ReceitaMaterial {
  id: string;
  receitaId?: string;
  nome: string;
  especificacao?: string | null;
  bitolaModelo?: string | null;
  unidade: string;
  tipoCalculo: string;
  fator?: number | string;
  perguntaRefId?: string | null;
  blocoX?: number | string | null;
  blocoY?: number | string | null;
  fixoEscopo?: string | null;
  quantidadeFixa?: number | string | null;
  observacaoInterna?: string | null;
  custoUnitario?: number | string | null;
  consumivelOperacional?: boolean;
  produtoEstoqueId?: string | null;
  ativo?: boolean;
  ordem?: number;
}

export interface ReceitaTecnica {
  id: string;
  catalogoServicoId: string;
  nome: string;
  /** materiais | pendencia_tecnica */
  tipo?: string;
  ativo: boolean;
  ordem?: number;
  perguntaFornecimentoId?: string | null;
  opcoesAbsFornece?: string[] | unknown;
  pendenciaTitulo?: string | null;
  pendenciaMensagem?: string | null;
  pendenciaBloquearMateriais?: boolean;
  perguntaResolucaoId?: string | null;
  opcoesResolucao?: Array<{ id: string; label: string }> | unknown;
  condicoes?: ReceitaCondicao[];
  materiais?: ReceitaMaterial[];
}

export interface OsPendenciaTecnica {
  id: string;
  ordemServicoId?: string;
  receitaId?: string | null;
  titulo: string;
  mensagem: string;
  bloquearMateriais: boolean;
  status: string;
  respostaOriginalCliente?: Record<string, string> | unknown;
  perguntaResolucaoId?: string | null;
  opcoesResolucao?: Array<{ id: string; label: string }> | unknown;
  resolucaoOpcaoId?: string | null;
  resolucaoOpcaoLabel?: string | null;
  resolvidoEm?: string | null;
  resolvidoPorUserId?: string | null;
  createdAt?: string;
}

export interface IaConhecimento {
  id: string;
  categoria: string;
  servicoSlug: string | null;
  conteudo: string;
  ativo: boolean;
  createdAt: string;
  admin?: { nome: string };
}

export interface ParceiroAdmin {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cnpj: string | null;
  categoria: string;
  codigo: string | null;
  comissaoPercent: number;
  ativo: boolean;
  createdAt: string;
  link: string | null;
  clientes: number;
  vendas: number;
  valorVendido: number;
  comissaoTotal: number;
  comissaoPendente: number;
  comissaoPaga: number;
}

export interface ComissaoItem {
  id: string;
  descricao: string | null;
  valorVenda: number;
  percentual: number;
  valorComissao: number;
  status: string;
  pagaEm: string | null;
  createdAt: string;
}

export interface ParceiroDetalhe {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cnpj: string | null;
  categoria: string;
  codigo: string | null;
  comissaoPercent: number;
  ativo: boolean;
  link: string | null;
  clientes: Array<{ id: string; nome: string; email: string; telefone: string; createdAt: string }>;
  comissoes: ComissaoItem[];
  vendas: number;
  valorVendido: number;
  comissaoTotal: number;
  comissaoPendente: number;
  comissaoPaga: number;
}

export interface FluxoPerguntaOpcaoConfig {
  id: string;
  label: string;
  precoAdicional?: number;
  modoCobranca?: 'fixo' | 'por_unidade';
  /** Só cobra o adicional se as respostas baterem (ex.: ABS fornece material) */
  when?: Record<string, string[]>;
  /** Imagem da opção (Storage); vinculada pelo ID da opção */
  imagemUrl?: string;
  /** Ao selecionar, troca a imagem principal do serviço */
  usarComoImagemPrincipal?: boolean;
}

export interface FluxoPerguntaConfig {
  id: string;
  titulo: string;
  opcoes: FluxoPerguntaOpcaoConfig[];
  showIf?:
    | { perguntaId: string; opcaoIds: string[] }
    | { all: Array<{ perguntaId: string; opcaoIds: string[] }> };
  papel?: 'quantidade' | 'numero' | 'normal';
  numeroMin?: number;
  numeroMax?: number;
  numeroPasso?: number;
  numeroUnidade?: string;
  /** Preço total da mão de obra por qtd (substitui preço-base quando preenchido) */
  precosPorQuantidade?: Record<string, number>;
  /** Repete a pergunta para cada unidade (respostas id__uN) */
  replicarPorUnidade?: boolean;
}

export interface ItemPrecoConfig {
  id: string;
  label: string;
  valor: number;
  when?: Record<string, string[]>;
  modoCobranca?: 'fixo' | 'por_unidade';
}

export interface FaixaPrecoComposto {
  opcaoId: string;
  label?: string;
  ajusteCapacidade?: number;
  valorKitInicial?: number;
  metrosInclusos: number;
  precoPorMetroExtra: number;
}

export interface PrecoCompostoConfig {
  ativo: boolean;
  perguntaCapacidadeId: string;
  perguntaMetrosId: string;
  perguntaFornecimentoId?: string;
  opcoesAbsFornece?: string[];
  mapaMetrosOpcao?: Record<string, number>;
  metrosNumericos?: boolean;
  metrosInclusosPadrao?: number;
  labelMaoDeObra?: string;
  labelAjusteCapacidade?: string;
  labelKitInicial?: string;
  labelMaterialIncluso?: string;
  labelMetrosExtras?: string;
  labelClienteFornece?: string;
  faixas: FaixaPrecoComposto[];
}

export interface FluxoConfigAdmin {
  slug: string;
  nome: string;
  perguntas: FluxoPerguntaConfig[];
  fotosObrigatorias: string[];
  regrasValidacao: Array<{ when: Record<string, string[]>; mensagem: string }>;
  modoPreco: 'padrao' | 'personalizado';
  precoBase: number | null;
  itensPreco: ItemPrecoConfig[];
  precoComposto?: PrecoCompostoConfig;
  perguntaQuantidadeId: string | null;
  multiplicarBasePorQuantidade: boolean;
}

export type StatusEstoque = 'ok' | 'minimo' | 'critico' | 'ruptura';

export interface ProdutoEstoque {
  id: string;
  nome: string;
  sku: string;
  quantidade: number;
  reservado: number;
  disponivel: number;
  minimo: number;
  critico: number;
  servicoSlug?: string | null;
  precoUnitario?: number | null;
  custo?: number | null;
  tipo?: string | null;
  cor?: string | null;
  imagemUrl?: string | null;
  imagens?: string[] | null;
  ativo?: boolean;
  modeloId?: string | null;
  valorEstoque?: number | null;
  status: StatusEstoque;
  updatedAt?: string;
}

export interface EstoqueDashboard {
  totalProdutos: number;
  ruptura: number;
  critico: number;
  minimo: number;
  ok: number;
  totalUnidades: number;
  reservadoTotal: number;
  valorEstoque: number;
  alertas: number;
}

export interface MovimentacaoEstoque {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  quantidade: number;
  valor?: number | null;
  responsavel: string;
  createdAt: string;
}

export interface TecnicoOs {
  id: string;
  etapa: string;
  checklist?: Record<string, string> | null;
  checklistCompleto?: boolean;
  pedido: {
    numero: string;
    descricao?: string;
    cliente: { nome: string; telefone: string; endereco: Record<string, string> };
    agendamentos: Array<{ id: string; data: string; horarioInicio: string; status: string }>;
    solicitacao?: { servico?: { nome: string } };
  };
}

export interface AgendamentoTecnico {
  id: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  status: string;
  cliente: { nome: string; telefone: string; endereco: Record<string, string> };
  pedido: { numero: string; descricao?: string };
}
