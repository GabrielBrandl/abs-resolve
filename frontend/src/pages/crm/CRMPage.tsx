import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { leadsApi, leadsApiExtra, catalogoAdminApi } from '../../services/modules.service';
import { useToast } from '../../components/Toast';
import type { CatalogoServicoAdmin, CrmIndicadores, Lead, LeadTimelineItem } from '../../types';
import { ETAPAS_LEAD, MOTIVOS_PERDA, ORIGENS_LEAD, STATUS_COMERCIAL } from '../../types';
import { PageHeader, Loading, Modal, Input, Select, Button } from '../../components/ui';

const EMPTY_LEAD = {
  nome: '',
  telefone: '',
  email: '',
  origem: 'whatsapp',
  campanha: '',
  categoriaInteresse: '',
  catalogoServicoId: '',
  valorEstimado: '',
  responsavel: 'Comercial',
  proximaAcao: '',
  proximoContato: '',
  observacoes: '',
};

function formatMoney(v?: number | string | null) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function isFollowUpAtrasado(lead: Lead) {
  if (!lead.proximoContato) return false;
  if (['fechado', 'perdido'].includes(lead.etapa)) return false;
  return new Date(lead.proximoContato).getTime() < Date.now();
}

function whatsappUrl(telefone: string) {
  const digits = telefone.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [indicadores, setIndicadores] = useState<CrmIndicadores | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoServicoAdmin[]>([]);
  const [categorias, setCategorias] = useState<Array<{ slug: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<LeadTimelineItem[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [interacao, setInteracao] = useState({ tipo: 'observacao', descricao: '' });
  const [novoLead, setNovoLead] = useState({ ...EMPTY_LEAD });
  const [filtros, setFiltros] = useState({
    de: '',
    ate: '',
    responsavel: '',
    origem: '',
    campanha: '',
    categoria: '',
    servicoId: '',
    etapa: '',
  });
  const [perdaPendente, setPerdaPendente] = useState<{ leadId: string; etapaAnterior: string } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [leadForm, setLeadForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    origem: 'whatsapp',
    campanha: '',
    categoriaInteresse: '',
    catalogoServicoId: '',
    valorEstimado: '',
    statusComercial: 'em_andamento',
    motivoPerda: '',
    proximoContato: '',
    proximaAcao: '',
    responsavel: '',
    observacoes: '',
  });
  const [modalFollowUp, setModalFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ proximoContato: '', proximaAcao: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const paramsFiltro = useMemo(() => {
    const p: Record<string, string> = {};
    Object.entries(filtros).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    return p;
  }, [filtros]);

  const servicosFiltradosNovo = useMemo(() => {
    if (!novoLead.categoriaInteresse) return catalogo.filter((s) => s.ativo !== false);
    return catalogo.filter((s) => s.categoria === novoLead.categoriaInteresse && s.ativo !== false);
  }, [catalogo, novoLead.categoriaInteresse]);

  const servicosFiltradosEdit = useMemo(() => {
    if (!leadForm.categoriaInteresse) return catalogo.filter((s) => s.ativo !== false);
    return catalogo.filter((s) => s.categoria === leadForm.categoriaInteresse && s.ativo !== false);
  }, [catalogo, leadForm.categoriaInteresse]);

  const abrirNovoLead = () => {
    setNovoLead({ ...EMPTY_LEAD });
    setModalNovo(true);
  };

  const fecharNovoLead = () => {
    setModalNovo(false);
    setNovoLead({ ...EMPTY_LEAD });
  };

  const carregar = async () => {
    try {
      const [lista, ind] = await Promise.all([
        leadsApi.listar(paramsFiltro),
        leadsApi.indicadores(paramsFiltro),
      ]);
      setLeads(lista);
      setIndicadores(ind);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao carregar CRM', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    catalogoAdminApi.servicos().then(setCatalogo).catch(() => {});
    catalogoAdminApi.categorias().then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    carregar();
  }, [paramsFiltro]);

  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId) return;
    abrirLeadPorId(leadId);
  }, [searchParams]);

  const leadsPorEtapa = (etapa: string) => leads.filter((l) => l.etapa === etapa);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const novaEtapa = result.destination.droppableId;
    if (novaEtapa === 'perdido') {
      const lead = leads.find((l) => l.id === leadId);
      setPerdaPendente({ leadId, etapaAnterior: lead?.etapa || 'novo_lead' });
      setMotivoPerda('');
      return;
    }
    try {
      await leadsApi.etapa(leadId, novaEtapa);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, etapa: novaEtapa } : l)));
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao mover lead', 'error');
    }
  };

  const preencherLeadForm = (lead: Lead) =>
    setLeadForm({
      nome: lead.nome || '',
      telefone: lead.telefone || '',
      email: lead.email || '',
      origem: lead.origem || 'whatsapp',
      campanha: lead.campanha || '',
      categoriaInteresse: lead.categoriaInteresse || lead.catalogoServico?.categoria || '',
      catalogoServicoId: lead.catalogoServicoId || '',
      valorEstimado: lead.valorEstimado != null ? String(lead.valorEstimado) : '',
      statusComercial: lead.statusComercial || 'em_andamento',
      motivoPerda: lead.motivoPerda || '',
      proximoContato: toDatetimeLocal(lead.proximoContato),
      proximaAcao: lead.proximaAcao || '',
      responsavel: lead.responsavel || '',
      observacoes: lead.observacoes || '',
    });

  const abrirLeadPorId = async (id: string) => {
    try {
      const [full, tl] = await Promise.all([leadsApi.buscar(id), leadsApi.timeline(id)]);
      setModalLead(full);
      setTimeline(tl);
      preencherLeadForm(full);
    } catch {
      toast('Lead não encontrado', 'error');
    }
  };

  const abrirLead = async (lead: Lead) => {
    setSearchParams({ lead: lead.id });
    await abrirLeadPorId(lead.id);
  };

  const fecharLead = () => {
    setModalLead(null);
    setTimeline([]);
    setSearchParams({});
  };

  const confirmarPerda = async () => {
    if (!perdaPendente || !motivoPerda) return;
    try {
      await leadsApi.etapa(perdaPendente.leadId, 'perdido', { motivoPerda });
      setPerdaPendente(null);
      toast('Lead marcado como perdido', 'success');
      carregar();
      if (modalLead?.id === perdaPendente.leadId) await abrirLeadPorId(perdaPendente.leadId);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao atualizar lead', 'error');
    }
  };

  const salvarLead = async () => {
    if (!modalLead) return;
    try {
      await leadsApi.atualizar(modalLead.id, {
        nome: leadForm.nome,
        telefone: leadForm.telefone,
        email: leadForm.email || '',
        origem: leadForm.origem,
        campanha: leadForm.campanha || null,
        categoriaInteresse: leadForm.categoriaInteresse || null,
        catalogoServicoId: leadForm.catalogoServicoId || null,
        valorEstimado: leadForm.valorEstimado ? Number(leadForm.valorEstimado) : null,
        responsavel: leadForm.responsavel,
        proximoContato: leadForm.proximoContato || null,
        proximaAcao: leadForm.proximaAcao || null,
        observacoes: leadForm.observacoes || null,
      });
      await leadsApi.statusComercial(modalLead.id, {
        statusComercial: leadForm.statusComercial,
        motivoPerda: leadForm.motivoPerda || null,
        proximoContato: leadForm.proximoContato || null,
        proximaAcao: leadForm.proximaAcao || null,
      });
      await abrirLeadPorId(modalLead.id);
      carregar();
      toast('Lead atualizado', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar lead', 'error');
    }
  };

  const registrarInteracao = async () => {
    if (!modalLead || !interacao.descricao) return;
    await leadsApi.interacao(modalLead.id, interacao);
    await abrirLeadPorId(modalLead.id);
    setInteracao({ tipo: 'observacao', descricao: '' });
    carregar();
  };

  const criarLead = async () => {
    if (!novoLead.nome.trim() || !novoLead.telefone.trim()) {
      toast('Nome e WhatsApp/telefone são obrigatórios', 'error');
      return;
    }
    try {
      await leadsApi.criar({
        nome: novoLead.nome,
        telefone: novoLead.telefone,
        email: novoLead.email || '',
        origem: novoLead.origem,
        campanha: novoLead.campanha || null,
        categoriaInteresse: novoLead.categoriaInteresse || null,
        catalogoServicoId: novoLead.catalogoServicoId || null,
        valorEstimado: novoLead.valorEstimado ? Number(novoLead.valorEstimado) : null,
        responsavel: novoLead.responsavel || 'Comercial',
        proximaAcao: novoLead.proximaAcao || null,
        proximoContato: novoLead.proximoContato || null,
        observacoes: novoLead.observacoes || null,
      });
      fecharNovoLead();
      toast('Lead criado!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar lead', 'error');
    }
  };

  const converterCliente = async () => {
    if (!modalLead) return;
    try {
      await leadsApiExtra.converterCliente(modalLead.id);
      await abrirLeadPorId(modalLead.id);
      toast('Lead convertido em cliente!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao converter', 'error');
    }
  };

  const acaoWhatsApp = async () => {
    if (!modalLead) return;
    window.open(whatsappUrl(modalLead.telefone), '_blank');
    await leadsApi.interacao(modalLead.id, {
      tipo: 'whatsapp',
      descricao: 'Contato via WhatsApp (ação rápida)',
    });
    await abrirLeadPorId(modalLead.id);
    carregar();
  };

  const acaoOrcamento = async () => {
    if (!modalLead) return;
    try {
      await leadsApi.criarOrcamento(modalLead.id, {
        catalogoServicoId: leadForm.catalogoServicoId || undefined,
        valor: leadForm.valorEstimado ? Number(leadForm.valorEstimado) : undefined,
      });
      toast('Orçamento criado e vinculado ao lead', 'success');
      await abrirLeadPorId(modalLead.id);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar orçamento', 'error');
    }
  };

  const acaoPedido = async () => {
    if (!modalLead) return;
    try {
      await leadsApi.criarPedido(modalLead.id, {
        valor: leadForm.valorEstimado ? Number(leadForm.valorEstimado) : undefined,
      });
      toast('Pedido criado e vinculado ao lead', 'success');
      await abrirLeadPorId(modalLead.id);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar pedido', 'error');
    }
  };

  const acaoPerdido = () => {
    if (!modalLead) return;
    setPerdaPendente({ leadId: modalLead.id, etapaAnterior: modalLead.etapa });
    setMotivoPerda(leadForm.motivoPerda || '');
  };

  const salvarFollowUp = async () => {
    if (!modalLead || !followUpForm.proximoContato) return;
    try {
      await leadsApi.followUp(modalLead.id, followUpForm);
      setModalFollowUp(false);
      toast('Follow-up agendado', 'success');
      await abrirLeadPorId(modalLead.id);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao agendar', 'error');
    }
  };

  if (loading && !leads.length) return <Loading />;

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Pipeline comercial integrado ao Catálogo, Orçamentos e Pedidos"
        action={<Button onClick={abrirNovoLead}>Novo Lead</Button>}
      />

      {indicadores && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[
            ['Leads', indicadores.leads, null],
            ['Qualificados', indicadores.leadsQualificados, null],
            ['Orçamentos', indicadores.orcamentos, null],
            ['Vendas', indicadores.vendas, null],
            ['Pipeline', formatMoney(indicadores.valorPipeline), null],
            ['Conversão', `${indicadores.taxaConversao}%`, null],
            ['Ticket médio', formatMoney(indicadores.ticketMedio), null],
            [
              'Tempo médio',
              indicadores.tempoMedioFechamento != null
                ? `${indicadores.tempoMedioFechamento}d`
                : '—',
              null,
            ],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Input label="De" type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} />
        <Input label="Até" type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} />
        <Input
          label="Responsável"
          value={filtros.responsavel}
          onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })}
          placeholder="Nome"
        />
        <Select label="Origem" value={filtros.origem} onChange={(e) => setFiltros({ ...filtros, origem: e.target.value })}>
          <option value="">Todas</option>
          {ORIGENS_LEAD.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </Select>
        <Input
          label="Campanha"
          value={filtros.campanha}
          onChange={(e) => setFiltros({ ...filtros, campanha: e.target.value })}
        />
        <Select
          label="Categoria"
          value={filtros.categoria}
          onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value, servicoId: '' })}
        >
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nome}
            </option>
          ))}
        </Select>
        <Select label="Serviço" value={filtros.servicoId} onChange={(e) => setFiltros({ ...filtros, servicoId: e.target.value })}>
          <option value="">Todos</option>
          {catalogo
            .filter((s) => !filtros.categoria || s.categoria === filtros.categoria)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
        </Select>
        <Select label="Etapa" value={filtros.etapa} onChange={(e) => setFiltros({ ...filtros, etapa: e.target.value })}>
          <option value="">Todas</option>
          {ETAPAS_LEAD.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
            </option>
          ))}
        </Select>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ETAPAS_LEAD.map((col) => (
            <div key={col.key} className="min-w-[240px] flex-shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                <span className="rounded-full bg-slate-200 px-2 text-xs">{leadsPorEtapa(col.key).length}</span>
              </div>
              <Droppable droppableId={col.key}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[420px] rounded-lg bg-slate-100 p-2"
                  >
                    {leadsPorEtapa(col.key).map((lead, idx) => {
                      const atrasado = isFollowUpAtrasado(lead);
                      return (
                        <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => abrirLead(lead)}
                              className={`mb-2 cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md ${
                                atrasado ? 'border-red-400 ring-1 ring-red-200' : 'border-transparent'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-semibold ${atrasado ? 'text-red-700' : 'text-slate-900'}`}>
                                  {lead.nome}
                                </p>
                                {atrasado && (
                                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                                    Atrasado
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {lead.catalogoServico?.nome || lead.interesse || 'Sem serviço'}
                              </p>
                              <p className={`mt-1 text-sm font-medium ${atrasado ? 'text-red-600' : 'text-slate-800'}`}>
                                {formatMoney(lead.valorEstimado)}
                              </p>
                              <p className="mt-1 text-[11px] capitalize text-slate-500">
                                {lead.origem}
                                {lead.campanha ? ` · ${lead.campanha}` : ''}
                              </p>
                              <p className={`mt-1 text-[11px] ${atrasado ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                                {lead.proximaAcao || 'Sem próxima ação'}
                                {lead.proximoContato ? ` · ${formatDateTime(lead.proximoContato)}` : ''}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">Resp.: {lead.responsavel}</p>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <Modal open={!!modalLead} onClose={fecharLead} title={modalLead?.nome || ''} wide>
        {modalLead && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={acaoWhatsApp}>
                WhatsApp
              </Button>
              <Button variant="secondary" onClick={acaoOrcamento}>
                Criar orçamento
              </Button>
              <Button variant="secondary" onClick={acaoPedido}>
                Criar pedido
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setFollowUpForm({
                    proximoContato: leadForm.proximoContato || '',
                    proximaAcao: leadForm.proximaAcao || '',
                  });
                  setModalFollowUp(true);
                }}
              >
                Agendar follow-up
              </Button>
              <Button variant="secondary" onClick={acaoPerdido}>
                Marcar como perdido
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!modalLead) return;
                  const ok = window.confirm(
                    `Excluir o lead "${modalLead.nome}"? Esta ação não pode ser desfeita.`
                  );
                  if (!ok) return;
                  try {
                    await leadsApi.excluir(modalLead.id);
                    toast('Lead excluído', 'success');
                    fecharLead();
                    carregar();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : 'Erro ao excluir lead', 'error');
                  }
                }}
              >
                Excluir lead
              </Button>
            </div>

            {modalLead.clienteId && (
              <p className="text-sm">
                <Link to={`/clientes/${modalLead.clienteId}`} className="font-medium text-primary-600 hover:underline">
                  Abrir ficha 360º do cliente
                </Link>
                {modalLead.pedidoId && modalLead.pedido && (
                  <>
                    {' · '}
                    <Link to={`/pedidos/${modalLead.pedidoId}`} className="font-medium text-primary-600 hover:underline">
                      Pedido {modalLead.pedido.numero}
                    </Link>
                  </>
                )}
                {modalLead.solicitacaoId && (
                  <span className="text-slate-500"> · Orçamento {modalLead.solicitacaoId.slice(0, 8)}</span>
                )}
              </p>
            )}

            <div className="grid gap-x-3 sm:grid-cols-2">
              <Input label="Nome" value={leadForm.nome} onChange={(e) => setLeadForm({ ...leadForm, nome: e.target.value })} />
              <Input
                label="WhatsApp/telefone"
                value={leadForm.telefone}
                onChange={(e) => setLeadForm({ ...leadForm, telefone: e.target.value })}
              />
              <Input
                label="E-mail (opcional)"
                value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
              />
              <Select label="Origem" value={leadForm.origem} onChange={(e) => setLeadForm({ ...leadForm, origem: e.target.value })}>
                {ORIGENS_LEAD.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Campanha"
                value={leadForm.campanha}
                onChange={(e) => setLeadForm({ ...leadForm, campanha: e.target.value })}
              />
              <Select
                label="Categoria de interesse"
                value={leadForm.categoriaInteresse}
                onChange={(e) =>
                  setLeadForm({ ...leadForm, categoriaInteresse: e.target.value, catalogoServicoId: '' })
                }
              >
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nome}
                  </option>
                ))}
              </Select>
              <Select
                label="Serviço de interesse"
                value={leadForm.catalogoServicoId}
                onChange={(e) => setLeadForm({ ...leadForm, catalogoServicoId: e.target.value })}
              >
                <option value="">Selecione</option>
                {servicosFiltradosEdit.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
              <Input
                label="Valor potencial"
                type="number"
                value={leadForm.valorEstimado}
                onChange={(e) => setLeadForm({ ...leadForm, valorEstimado: e.target.value })}
              />
              <Input
                label="Responsável"
                value={leadForm.responsavel}
                onChange={(e) => setLeadForm({ ...leadForm, responsavel: e.target.value })}
              />
              <Input
                label="Próxima ação"
                value={leadForm.proximaAcao}
                onChange={(e) => setLeadForm({ ...leadForm, proximaAcao: e.target.value })}
              />
              <Input
                label="Data/hora próximo contato"
                type="datetime-local"
                value={leadForm.proximoContato}
                onChange={(e) => setLeadForm({ ...leadForm, proximoContato: e.target.value })}
              />
              <Select
                label="Status comercial"
                value={leadForm.statusComercial}
                onChange={(e) => setLeadForm({ ...leadForm, statusComercial: e.target.value })}
              >
                {STATUS_COMERCIAL.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {(leadForm.statusComercial === 'perdido' || modalLead.etapa === 'perdido') && (
                <Select
                  label="Motivo da perda"
                  value={leadForm.motivoPerda}
                  onChange={(e) => setLeadForm({ ...leadForm, motivoPerda: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {MOTIVOS_PERDA.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              )}
              <div className="sm:col-span-2">
                <Input
                  label="Observações"
                  value={leadForm.observacoes}
                  onChange={(e) => setLeadForm({ ...leadForm, observacoes: e.target.value })}
                />
              </div>
              <Button className="mb-1 sm:col-span-2" onClick={salvarLead}>
                Salvar lead
              </Button>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Timeline</h4>
              <div className="max-h-56 space-y-2 overflow-y-auto border-l-2 border-slate-200 pl-3">
                {timeline.length === 0 && <p className="text-sm text-slate-400">Sem eventos</p>}
                {timeline.map((item, idx) => (
                  <div key={`${item.tipo}-${idx}`} className="relative text-sm">
                    <span className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0033B5]" />
                    <p className="font-medium text-slate-800">{item.titulo}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(item.data)}</p>
                    <p className="text-slate-600">{item.descricao}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Select
                label="Tipo"
                value={interacao.tipo}
                onChange={(e) => setInteracao({ ...interacao, tipo: e.target.value })}
              >
                <option value="ligacao">Ligação</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="reuniao">Reunião</option>
                <option value="proposta">Proposta</option>
                <option value="negociacao">Negociação</option>
                <option value="followup">Follow-up</option>
                <option value="observacao">Observação</option>
              </Select>
              <Input
                label="Descrição"
                value={interacao.descricao}
                onChange={(e) => setInteracao({ ...interacao, descricao: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={registrarInteracao}>Registrar</Button>
                {modalLead.etapa !== 'fechado' && (
                  <Button variant="secondary" onClick={converterCliente}>
                    Converter em Cliente
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalFollowUp} onClose={() => setModalFollowUp(false)} title="Agendar follow-up">
        <Input
          label="Data/hora"
          type="datetime-local"
          value={followUpForm.proximoContato}
          onChange={(e) => setFollowUpForm({ ...followUpForm, proximoContato: e.target.value })}
        />
        <Input
          label="Próxima ação"
          value={followUpForm.proximaAcao}
          onChange={(e) => setFollowUpForm({ ...followUpForm, proximaAcao: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalFollowUp(false)}>
            Cancelar
          </Button>
          <Button disabled={!followUpForm.proximoContato} onClick={salvarFollowUp}>
            Salvar
          </Button>
        </div>
      </Modal>

      <Modal open={!!perdaPendente} onClose={() => setPerdaPendente(null)} title="Motivo da perda">
        <p className="mb-3 text-sm text-slate-500">Informe o motivo antes de mover o lead para Perdido. O lead não será apagado.</p>
        <Select label="Motivo" value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)}>
          <option value="">Selecione...</option>
          {MOTIVOS_PERDA.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPerdaPendente(null)}>
            Cancelar
          </Button>
          <Button disabled={!motivoPerda} onClick={confirmarPerda}>
            Confirmar perda
          </Button>
        </div>
      </Modal>

      <Modal open={modalNovo} onClose={fecharNovoLead} title="Novo Lead" wide>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Input label="Nome" value={novoLead.nome} onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })} />
          <Input
            label="WhatsApp/telefone"
            value={novoLead.telefone}
            onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })}
          />
          <Input
            label="E-mail (opcional)"
            value={novoLead.email}
            onChange={(e) => setNovoLead({ ...novoLead, email: e.target.value })}
          />
          <Select label="Origem" value={novoLead.origem} onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value })}>
            {ORIGENS_LEAD.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Campanha"
            value={novoLead.campanha}
            onChange={(e) => setNovoLead({ ...novoLead, campanha: e.target.value })}
          />
          <Select
            label="Categoria de interesse"
            value={novoLead.categoriaInteresse}
            onChange={(e) =>
              setNovoLead({ ...novoLead, categoriaInteresse: e.target.value, catalogoServicoId: '' })
            }
          >
            <option value="">Selecione</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </Select>
          <Select
            label="Serviço de interesse"
            value={novoLead.catalogoServicoId}
            onChange={(e) => setNovoLead({ ...novoLead, catalogoServicoId: e.target.value })}
          >
            <option value="">Selecione</option>
            {servicosFiltradosNovo.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
          <Input
            label="Valor potencial"
            type="number"
            value={novoLead.valorEstimado}
            onChange={(e) => setNovoLead({ ...novoLead, valorEstimado: e.target.value })}
          />
          <Input
            label="Responsável"
            value={novoLead.responsavel}
            onChange={(e) => setNovoLead({ ...novoLead, responsavel: e.target.value })}
          />
          <Input
            label="Próxima ação"
            value={novoLead.proximaAcao}
            onChange={(e) => setNovoLead({ ...novoLead, proximaAcao: e.target.value })}
          />
          <Input
            label="Data/hora próximo contato"
            type="datetime-local"
            value={novoLead.proximoContato}
            onChange={(e) => setNovoLead({ ...novoLead, proximoContato: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Observações"
              value={novoLead.observacoes}
              onChange={(e) => setNovoLead({ ...novoLead, observacoes: e.target.value })}
            />
          </div>
          <Button onClick={criarLead} className="mt-2 sm:col-span-2">
            Criar Lead
          </Button>
        </div>
      </Modal>
    </div>
  );
}
