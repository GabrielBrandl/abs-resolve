import { api } from './api';
import type { ApiResponse, Cliente, Lead, Pedido, Pagamento, Servico, Beneficio, OrdemServico, DashboardKPIs } from '../types';

async function get<T>(url: string) {
  const { data } = await api.get<ApiResponse<T>>(url);
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function post<T>(url: string, body?: unknown) {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function put<T>(url: string, body?: unknown) {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

async function patch<T>(url: string, body?: unknown) {
  const { data } = await api.patch<ApiResponse<T>>(url, body);
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export const clientesApi = {
  listar: (params?: Record<string, string>) =>
    get<{ clientes: Cliente[]; total: number }>(`/clientes?${new URLSearchParams(params)}`),
  buscar: (id: string) => get<Cliente>(`/clientes/${id}`),
  criar: (body: unknown) => post<Cliente>('/clientes', body),
  atualizar: (id: string, body: unknown) => put<Cliente>(`/clientes/${id}`, body),
  status: (id: string, status: string) => patch<Cliente>(`/clientes/${id}/status`, { status }),
  interacao: (id: string, body: unknown) => post(`/clientes/${id}/interacoes`, body),
  exportar: () => api.get('/export/clientes', { responseType: 'blob' }),
};

export const leadsApi = {
  listar: (params?: Record<string, string>) => get<Lead[]>(`/leads?${new URLSearchParams(params)}`),
  buscar: (id: string) => get<Lead>(`/leads/${id}`),
  criar: (body: unknown) => post<Lead>('/leads', body),
  etapa: (id: string, etapa: string) => patch<Lead>(`/leads/${id}/etapa`, { etapa }),
  interacao: (id: string, body: unknown) => post(`/leads/${id}/interacoes`, body),
};

export const pedidosApi = {
  listar: (params?: Record<string, string>) => get<Pedido[]>(`/pedidos?${new URLSearchParams(params)}`),
  buscar: (id: string) => get<Pedido>(`/pedidos/${id}`),
  criar: (body: unknown) => post<Pedido>('/pedidos', body),
  status: (id: string, status: string) => patch<Pedido>(`/pedidos/${id}/status`, { status }),
  criarOS: (pedidoId: string, body?: unknown) => post(`/pedidos/${pedidoId}/ordem-servico`, body),
  exportar: () => api.get('/export/pedidos', { responseType: 'blob' }),
};

export const osApi = {
  listar: (params?: Record<string, string>) => get<OrdemServico[]>(`/ordens-servico?${new URLSearchParams(params)}`),
  etapa: (id: string, etapa: string) => patch(`/ordens-servico/${id}/etapa`, { etapa }),
  checklist: (id: string, body: unknown) => patch(`/ordens-servico/${id}/checklist`, body),
};

export const pagamentosApi = {
  listar: (params?: Record<string, string>) => get<Pagamento[]>(`/pagamentos?${new URLSearchParams(params)}`),
  cobrar: (body: unknown) => post<Pagamento>('/pagamentos/cobrar', body),
  dashboard: () => get<Record<string, number>>('/pagamentos/dashboard'),
  segundaVia: (id: string) => get<Pagamento>(`/pagamentos/${id}/segunda-via`),
};

export const marketplaceApi = {
  servicos: (params?: Record<string, string>) => get<Servico[]>(`/marketplace/servicos?${new URLSearchParams(params)}`),
  beneficios: (params?: Record<string, string>) => get<Beneficio[]>(`/marketplace/beneficios?${new URLSearchParams(params)}`),
  solicitar: (body: unknown) => post('/marketplace/servicos/solicitar', body),
  criarServico: (body: unknown) => post<Servico>('/marketplace/servicos', body),
  atualizarServico: (id: string, body: unknown) => put<Servico>(`/marketplace/servicos/${id}`, body),
  criarBeneficio: (body: unknown) => post<Beneficio>('/marketplace/beneficios', body),
  atualizarBeneficio: (id: string, body: unknown) => put<Beneficio>(`/marketplace/beneficios/${id}`, body),
};

export const movimentacaoApi = {
  listar: (params?: Record<string, string>) => get(`/movimentacao?${new URLSearchParams(params)}`),
  criar: (body: unknown) => post('/movimentacao', body),
  resumo: () => get<{ entradas: number; saidas: number; saldo: number; total: number }>('/movimentacao/resumo'),
};

export const dashboardApi = {
  kpis: () => get<DashboardKPIs>('/dashboard/kpis'),
  receita: () => get<{ mes: string; valor: number }[]>('/dashboard/receita-mensal'),
  faturamentoDiario: () => get<{ dia: string; valor: number }[]>('/dashboard/faturamento-diario'),
};

export const adminApi = {
  usuarios: () => get('/admin/usuarios'),
  criarUsuario: (body: unknown) => post('/admin/usuarios', body),
  parceiros: () => get('/admin/parceiros'),
  criarParceiro: (body: unknown) => post('/admin/parceiros', body),
  auditoria: () => get('/admin/auditoria'),
  notificacoes: () => get('/admin/notificacoes'),
};

export const clientePortalApi = {
  pedidos: () => get<Pedido[]>('/cliente/pedidos'),
  financeiro: () => get<Pagamento[]>('/cliente/financeiro'),
  cadastro: () => get<Cliente>('/cliente/cadastro'),
  atualizarCadastro: (body: unknown) => put<Cliente>('/cliente/cadastro', body),
  solicitarServico: (body: unknown) => post('/cliente/solicitar-servico', body),
  documentos: () => get<Array<{ id: string; nome: string; url: string; tamanho: number; createdAt: string }>>('/cliente/documentos'),
  uploadDocumento: async (file: File) => {
    const form = new FormData();
    form.append('arquivo', file);
    const { data } = await api.post('/cliente/documentos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.error);
    return data.data;
  },
};

export const solicitacaoApi = {
  catalogo: () => get<Array<{ id: string; slug: string; nome: string; tipo: string; pontos: number; precosFixos?: Array<{ chave: string; label: string; preco: number }> }>>('/solicitacao/catalogo'),
  upsells: (slug: string) => get<Array<{ id: string; nome: string; preco: number }>>(`/solicitacao/upsells/${slug}`),
  calcularTipoA: (body: unknown) => post<{ precoBase: number; precoFinal: number }>('/solicitacao/calcular-tipo-a', body),
  criar: (body: unknown) => post('/solicitacao', body),
  minhas: () => get('/solicitacao/minhas'),
  fotos: (id: string, fotos: string[]) => post(`/solicitacao/${id}/fotos`, { fotos }),
  upsellsAplicar: (id: string, body: unknown) => post(`/solicitacao/${id}/upsells`, body),
  horarios: (id: string) => get<{ slots: Array<{ data: string; horarioInicio: string; horarioFim: string; label: string; escassez: string }>; proximaDisponibilidade: string | null }>(`/solicitacao/${id}/horarios`),
  agendar: (id: string, body: unknown) => post(`/solicitacao/${id}/agendar`, body),
  pagar: (id: string, metodo: string) => post(`/solicitacao/${id}/pagar`, { metodo }),
  uploadFotos: async (id: string, files: File[], servicoSlug?: string) => {
    const form = new FormData();
    files.forEach((f) => form.append('fotos', f));
    if (servicoSlug) form.append('servicoSlug', servicoSlug);
    const { data } = await api.post(`/solicitacao/${id}/fotos/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.error);
    return data.data;
  },
};

export const agendamentoApi = {
  cancelar: (id: string) => post(`/agendamentos/${id}/cancelar`),
  ausencia: (id: string) => post(`/agendamentos/${id}/ausencia`),
};

export const adminApiExtra = {
  campanhas: () => get<Array<{ id: string; titulo: string; status: string; agendadaPara: string; cliente: { nome: string } }>>('/admin/campanhas'),
  processarCampanhas: () => post<{ processadas: number }>('/admin/campanhas/processar'),
};

export const leadsApiExtra = {
  converterCliente: (id: string) => post(`/leads/${id}/converter-cliente`),
};
