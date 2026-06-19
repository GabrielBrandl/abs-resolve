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
  };
  operacional: {
    totalPedidos: number;
    pedidosFinalizados: number;
    osEmAndamento: number;
    pedidosPorStatus: { status: string; _count: number }[];
  };
  financeiro: {
    receitaMes: number;
    receitaTotal: number;
    inadimplencia: number;
    pagamentosMes: number;
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
