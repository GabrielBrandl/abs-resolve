import { api } from './api';
import type {
  ApiResponse, Cliente, Lead, Pedido, Pagamento, Servico, OrdemServico, DashboardKPIs,
  PedidoTimeline, Garantia, SolicitacaoMinha, SolicitacaoStatus, SolicitacaoConfig, AvaliacaoPendente,
  EnderecoCliente, CatalogoServicoAdmin, ProdutoEstoque, TecnicoOs, AgendamentoTecnico, FluxoConfigAdmin, IaConhecimento,
  ParceiroAdmin, ParceiroDetalhe,
} from '../types';

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

async function del<T>(url: string) {
  const { data } = await api.delete<ApiResponse<T>>(url);
  if (!data.success) throw new Error(data.error);
  return data.data!;
}

export const clientesApi = {
  listar: (params?: Record<string, string>) =>
    get<{ clientes: Cliente[]; total: number }>(`/clientes?${new URLSearchParams(params)}`),
  buscar: (id: string) => get<Cliente>(`/clientes/${id}`),
  criar: (body: unknown) => post<Cliente>('/clientes', body),
  atualizar: (id: string, body: unknown) => put<Cliente>(`/clientes/${id}`, body),
  atualizarAcessoPortal: (id: string, body: { email?: string; senha?: string; nome?: string }) =>
    put<Cliente>(`/clientes/${id}/acesso-portal`, body),
  excluir: (id: string) => del(`/clientes/${id}`),
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
  registrarRecebido: (body: { pedidoId: string; metodo?: string; valor?: number }) =>
    post('/pagamentos/registrar-recebido', body),
};

export const marketplaceApi = {
  servicos: (params?: Record<string, string>) => get<Servico[]>(`/marketplace/servicos?${new URLSearchParams(params)}`),
  solicitar: (body: unknown) => post('/marketplace/servicos/solicitar', body),
  criarServico: (body: unknown) => post<Servico>('/marketplace/servicos', body),
  atualizarServico: (id: string, body: unknown) => put<Servico>(`/marketplace/servicos/${id}`, body),
  excluirServico: (id: string) => del(`/marketplace/servicos/${id}`),
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
  usuarios: () => get<Array<{
    id: string; nome: string; email: string; role: string; ativo: boolean; createdAt: string;
    tecnico?: { id: string; nome: string; ativo: boolean; capacidadeDiaria: number };
  }>>('/admin/usuarios'),
  criarUsuario: (body: unknown) => post('/admin/usuarios', body),
  atualizarUsuario: (id: string, body: unknown) => put(`/admin/usuarios/${id}`, body),
  excluirUsuario: (id: string) => del(`/admin/usuarios/${id}`),
  alterarStatus: (id: string, ativo: boolean) => patch(`/admin/usuarios/${id}/status`, { ativo }),
  criarCliente: (body: unknown) => post('/admin/clientes', body),
  atribuicoes: () => get<Array<{
    id: string; data: string; horarioInicio: string; horarioFim: string; status: string;
    cliente: { nome: string; telefone: string; endereco?: Record<string, string> };
    tecnico?: { id: string; nome: string };
    pedido: {
      id: string; numero: string; descricao?: string; status: string;
      ordemServico?: {
        id: string; etapa: string; checklistCompleto: boolean;
        checklist?: Record<string, string>;
        tecnico?: { id: string; nome: string };
      };
    };
    solicitacao?: {
      fotos?: unknown;
      opcoes?: unknown;
      servico?: { nome: string; categoria: string; slug?: string };
    };
  }>>('/admin/atribuicoes'),
  tecnicosCarga: () => get<Array<{
    id: string; nome: string; email?: string; capacidadeDiaria: number;
    agendamentosAtivos: number; osEmAndamento: number;
  }>>('/admin/tecnicos-carga'),
  atribuirTecnico: (agendamentoId: string, tecnicoId: string | null) =>
    patch(`/admin/catalogo/agenda/${agendamentoId}/tecnico`, { tecnicoId }),
  auditoria: () => get('/admin/auditoria'),
  notificacoes: () => get('/admin/notificacoes'),
};

export const clientePortalApi = {
  pedidos: () => get<PedidoTimeline[]>('/cliente/pedidos'),
  financeiro: () => get<Pagamento[]>('/cliente/financeiro'),
  cadastro: () => get<Cliente>('/cliente/cadastro'),
  atualizarCadastro: (body: unknown) => put<Cliente>('/cliente/cadastro', body),
  garantias: () => get<Garantia[]>('/cliente/garantias'),
  avaliacoesPendentes: () => get<AvaliacaoPendente[]>('/cliente/avaliacoes/pendentes'),
  avaliar: (osId: string, body: { nota: number; comentario?: string }) =>
    post(`/cliente/avaliacoes/${osId}`, body),
  atualizarEndereco: (endereco: EnderecoCliente) =>
    put<Cliente>('/cliente/endereco', { endereco }),
  config: () => get<SolicitacaoConfig>('/cliente/config'),
  simularPagamento: (pagamentoId: string) =>
    post(`/cliente/pagamentos/${pagamentoId}/simular`),
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
  catalogo: () =>
    get<{
      categorias: Array<{
        slug: string;
        nome: string;
        icone: string;
        cor: string;
        servicos: Array<{
          id: string;
          slug: string;
          nome: string;
          categoria: string;
          precoMinimo: number | null;
          precoTexto: string | null;
          tipoPreco: string;
          descricao: string | null;
          garantiaDias: number;
          imagemUrl: string | null;
          pontos: number;
        }>;
      }>;
      total: number;
    }>('/solicitacao/catalogo'),
  criarCarrinho: (body: {
    itens: Array<{ slug: string; quantidade: number; respostas?: Record<string, string>; fotos?: string[] }>;
    express?: boolean;
    aceiteIaDiagnostico?: boolean;
  }) => post('/solicitacao/carrinho', body),
  fluxo: (slug: string) =>
    get<{
      slug: string;
      nome: string;
      perguntas: Array<{
        id: string;
        titulo: string;
        opcoes: Array<{ id: string; label: string }>;
        showIf?: { perguntaId: string; opcaoIds: string[] };
      }>;
      fotosObrigatorias: string[];
    }>(`/solicitacao/fluxo/${slug}`),
  calcularPreco: (body: { slug: string; respostas: Record<string, string>; quantidade?: number }) =>
    post<{
      preco: number;
      breakdown: Array<{ label: string; valor: number }>;
      requerValidacaoTecnica: boolean;
      mensagemValidacao?: string;
    }>('/solicitacao/calcular-preco', body),
  checkout: (id: string, express: boolean) => post(`/solicitacao/${id}/checkout`, { express }),
  upsells: (slug: string) => get<Array<{ id: string; nome: string; preco: number }>>(`/solicitacao/upsells/${slug}`),
  calcularTipoA: (body: unknown) => post<{ precoBase: number; precoFinal: number }>('/solicitacao/calcular-tipo-a', body),
  criar: (body: unknown) => post('/solicitacao', body),
  minhas: () => get<SolicitacaoMinha[]>('/solicitacao/minhas'),
  fotos: (id: string, fotos: string[]) => post(`/solicitacao/${id}/fotos`, { fotos }),
  upsellsAplicar: (id: string, body: unknown) => post(`/solicitacao/${id}/upsells`, body),
  horarios: (id: string) => get<{ slots: Array<{ data: string; horarioInicio: string; horarioFim: string; label: string; escassez: string }>; proximaDisponibilidade: string | null }>(`/solicitacao/${id}/horarios`),
  agendar: (id: string, body: unknown) => post(`/solicitacao/${id}/agendar`, body),
  pagar: (id: string, metodo: string) => post(`/solicitacao/${id}/pagar`, { metodo }),
  status: (id: string) => get<SolicitacaoStatus>(`/solicitacao/${id}/status`),
  config: () => get<SolicitacaoConfig>('/solicitacao/config'),
  solicitarOrcamento: (body: { slug: string; descricao: string; endereco?: EnderecoCliente }) =>
    post('/solicitacao/orcamento', body),
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

export const diagnosticoApi = {
  catalogo: () => get<Array<{ slug: string; nome: string; icone: string; cor: string; servicos: Array<{ slug: string; nome: string; dicaFoto: string }> }>>('/diagnostico/catalogo'),
  analisar: async (files: File[], contexto?: string, servicoSlug?: string) => {
    const form = new FormData();
    files.forEach((f) => form.append('fotos', f));
    if (contexto) form.append('contexto', contexto);
    if (servicoSlug) form.append('servicoSlug', servicoSlug);
    const { data } = await api.post('/diagnostico/analisar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.error);
    return data.data as { analise: Record<string, unknown>; orientacao?: string };
  },
};

export const agendamentoApi = {
  cancelar: (id: string) => post(`/agendamentos/${id}/cancelar`),
  ausencia: (id: string) => post(`/agendamentos/${id}/ausencia`),
  reagendar: (id: string, body: { data: string; horarioInicio: string; horarioFim: string }) =>
    post(`/agendamentos/${id}/reagendar`, body),
};

export const catalogoAdminApi = {
  servicos: () => get<CatalogoServicoAdmin[]>('/admin/catalogo/servicos'),
  categorias: () => get<Array<{ slug: string; nome: string; icone: string }>>('/admin/catalogo/categorias'),
  criarServico: (body: Partial<CatalogoServicoAdmin> & { nome: string; categoria: string; slug?: string }) =>
    post<CatalogoServicoAdmin>('/admin/catalogo/servicos', body),
  atualizarServico: (id: string, body: Partial<CatalogoServicoAdmin>) =>
    put<CatalogoServicoAdmin>(`/admin/catalogo/servicos/${id}`, body),
  excluirServico: (id: string) => del(`/admin/catalogo/servicos/${id}`),
  excluirServicoPermanente: (id: string) => del(`/admin/catalogo/servicos/${id}?permanente=true`),
  uploadImagem: async (id: string, file: File) => {
    const form = new FormData();
    form.append('imagem', file);
    const { data } = await api.post<ApiResponse<CatalogoServicoAdmin>>(`/admin/catalogo/servicos/${id}/imagem`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.error);
    return data.data!;
  },
  config: () => get<Record<string, number>>('/admin/catalogo/config'),
  atualizarConfig: (body: Record<string, number>) => put('/admin/catalogo/config', body),
  estoque: () => get<ProdutoEstoque[]>('/admin/catalogo/estoque'),
  atualizarEstoque: (id: string, body: { quantidade: number; minimo?: number }) =>
    put(`/admin/catalogo/estoque/${id}`, body),
  tecnicos: () => get<Array<{ id: string; nome: string; capacidadeDiaria: number; ativo: boolean }>>('/admin/catalogo/tecnicos'),
  criarTecnico: (body: { nome: string; capacidadeDiaria?: number }) => post('/admin/catalogo/tecnicos', body),
  agenda: (dataInicio?: string) =>
    get<{
      agendamentos: Array<{
        id: string; data: string; horarioInicio: string; horarioFim: string; status: string;
        cliente: { nome: string; telefone: string }; tecnico?: { nome: string };
        pedido: { numero: string; descricao?: string };
      }>;
      tecnicos: Array<{ id: string; nome: string }>;
      periodo: { inicio: string; fim: string };
    }>(`/admin/catalogo/agenda${dataInicio ? `?dataInicio=${dataInicio}` : ''}`),
  orcamentos: () => get<Array<{
    id: string; status: string; createdAt: string; opcoes?: Record<string, unknown>;
    servico?: { nome: string }; cliente?: { nome: string; email: string; telefone: string };
  }>>('/admin/catalogo/orcamentos'),
  responderOrcamento: (id: string, body: { precoFinal: number; observacao?: string }) =>
    post(`/admin/catalogo/orcamentos/${id}/responder`, body),
};

export const iaTreinamentoApi = {
  listar: () => get<IaConhecimento[]>('/admin/ia/conhecimento'),
  chat: (body: { mensagem: string; servicoSlug?: string; salvar?: boolean }) =>
    post<{ resposta: string; conhecimento: IaConhecimento | null }>('/admin/ia/chat', body),
  atualizar: (id: string, body: { ativo?: boolean; conteudo?: string }) =>
    patch<IaConhecimento>(`/admin/ia/conhecimento/${id}`, body),
  excluir: (id: string) => del(`/admin/ia/conhecimento/${id}`),
};

export const fluxoAdminApi = {
  listar: () =>
    get<Array<{ slug: string; nome: string; totalPerguntas: number; modoPreco: string }>>('/admin/catalogo/fluxos'),
  obter: (slug: string) => get<FluxoConfigAdmin>(`/admin/catalogo/fluxos/${slug}`),
  atualizar: (slug: string, body: Partial<FluxoConfigAdmin>) =>
    put<FluxoConfigAdmin>(`/admin/catalogo/fluxos/${slug}`, body),
  restaurar: (slug: string) => post<FluxoConfigAdmin>(`/admin/catalogo/fluxos/${slug}/restaurar`),
};

export const tecnicoApi = {
  os: () => get<TecnicoOs[]>('/tecnico/os'),
  buscarOs: (id: string) => get<TecnicoOs>(`/tecnico/os/${id}`),
  etapa: (id: string, etapa: string) => patch(`/tecnico/os/${id}/etapa`, { etapa }),
  voltarEtapaOs: (id: string) => post(`/tecnico/os/${id}/voltar-etapa`),
  checklist: (id: string, body: Record<string, string>) => patch(`/tecnico/os/${id}/checklist`, body),
  concluir: (id: string, body: { descricaoConclusao?: string; materiais?: string }) =>
    post(`/tecnico/os/${id}/concluir`, body),
  uploadFoto: async (osId: string, file: File, campo: 'fotoAntes' | 'fotoDepois' | 'fotoConclusao' | 'assinaturaCliente') => {
    const form = new FormData();
    form.append('foto', file);
    form.append('campo', campo);
    const { data } = await api.post(`/tecnico/os/${osId}/foto`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success) throw new Error(data.error);
    return data.data;
  },
  agenda: () => get<AgendamentoTecnico[]>('/tecnico/agenda'),
  aCaminho: (agendamentoId: string) => post(`/tecnico/agendamentos/${agendamentoId}/a-caminho`),
  chegada: (agendamentoId: string) => post(`/tecnico/agendamentos/${agendamentoId}/chegada`),
  voltarAgendamento: (agendamentoId: string) => post(`/tecnico/agendamentos/${agendamentoId}/voltar`),
};

export const adminApiExtra = {
  campanhas: () => get<Array<{ id: string; titulo: string; status: string; agendadaPara: string; cliente: { nome: string } }>>('/admin/campanhas'),
  processarCampanhas: () => post<{ processadas: number }>('/admin/campanhas/processar'),
};

export const leadsApiExtra = {
  converterCliente: (id: string) => post(`/leads/${id}/converter-cliente`),
};

export const parceirosApi = {
  listar: () => get<ParceiroAdmin[]>('/parceiros'),
  detalhe: (id: string) => get<ParceiroDetalhe>(`/parceiros/${id}`),
  criar: (body: {
    nome: string; email: string; telefone: string; senha: string; comissaoPercent: number; cnpj?: string; categoria?: string;
  }) => post<ParceiroAdmin>('/parceiros', body),
  atualizar: (id: string, body: Partial<{
    nome: string; email: string; telefone: string; cnpj: string; categoria: string; codigo: string;
    comissaoPercent: number; ativo: boolean; senha: string; recalcularPendentes: boolean;
  }>) => put<ParceiroDetalhe>(`/parceiros/${id}`, body),
  remover: (id: string) => del(`/parceiros/${id}`),
  recalcularComissoes: (id: string, percentual?: number) =>
    post<{ recalculadas: number; detalhe: ParceiroDetalhe }>(`/parceiros/${id}/recalcular-comissoes`, { percentual }),
  atualizarComissao: (comissaoId: string, body: {
    descricao?: string; valorVenda?: number; percentual?: number; valorComissao?: number; status?: string; paga?: boolean;
  }) => patch(`/parceiros/comissoes/${comissaoId}`, body),
  marcarComissao: (comissaoId: string, paga: boolean) =>
    patch(`/parceiros/comissoes/${comissaoId}`, { paga }),
  excluirComissao: (comissaoId: string) => del(`/parceiros/comissoes/${comissaoId}`),
  meuResumo: () => get<ParceiroDetalhe>('/parceiros/meu-resumo'),
};

export const authApi = {
  esqueciSenha: (cpfCnpj: string) => post<{ message: string }>('/auth/esqueci-senha', { cpfCnpj }),
  redefinirSenha: (token: string, senha: string) =>
    post<{ message: string }>('/auth/redefinir-senha', { token, senha }),
};
