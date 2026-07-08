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
  consentimentoLgpd: boolean;
  createdAt: string;
  pedidos?: Pedido[];
  interacoes?: Interacao[];
  pagamentos?: Pagamento[];
  user?: { id: string; email: string };
  solicitacoes?: SolicitacaoFotos[];
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
  responsavel: string;
  etapa: string;
  createdAt: string;
  interacoes?: Interacao[];
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
  pedido?: Pedido & { cliente?: { nome: string } };
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

export const ETAPAS_LEAD = [
  { key: 'novo_lead', label: 'Novo Lead' },
  { key: 'contato_realizado', label: 'Contato Realizado' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'proposta_enviada', label: 'Proposta Enviada' },
  { key: 'negociacao', label: 'Negociação' },
  { key: 'fechado', label: 'Fechado' },
  { key: 'perdido', label: 'Perdido' },
];

export const STATUS_PEDIDO = [
  { key: 'recebido', label: 'Recebido', color: 'bg-slate-100 text-slate-700' },
  { key: 'em_analise', label: 'Em Análise', color: 'bg-blue-100 text-blue-700' },
  { key: 'aguardando_documentacao', label: 'Aguardando Docs', color: 'bg-amber-100 text-amber-700' },
  { key: 'em_processamento', label: 'Processamento', color: 'bg-purple-100 text-purple-700' },
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
    invoiceUrl?: string;
    pixCode?: string;
  } | null;
  podeAgendar: boolean;
  agendamento?: { id: string; data: string; horarioInicio: string } | null;
}

export interface SolicitacaoConfig {
  expressValor: number;
  taxaCancelamento: number;
  taxaAusencia: number;
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
}

export interface FluxoPerguntaConfig {
  id: string;
  titulo: string;
  opcoes: FluxoPerguntaOpcaoConfig[];
  showIf?: { perguntaId: string; opcaoIds: string[] };
}

export interface ItemPrecoConfig {
  id: string;
  label: string;
  valor: number;
  when?: Record<string, string[]>;
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
}

export interface ProdutoEstoque {
  id: string;
  nome: string;
  sku: string;
  quantidade: number;
  minimo: number;
  status?: string;
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
