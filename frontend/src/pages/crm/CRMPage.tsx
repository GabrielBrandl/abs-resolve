import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { leadsApi, leadsApiExtra } from '../../services/modules.service';
import { useToast } from '../../components/Toast';
import type { CrmIndicadores, Lead, LeadTimelineItem } from '../../types';
import { ETAPAS_LEAD, MOTIVOS_ABANDONO, MOTIVOS_PERDA, SEGMENTOS_B2B, SIM_NAO_OPTIONS, STATUS_COMERCIAL } from '../../types';
import { PageHeader, Loading, Modal, Input, Select, Button } from '../../components/ui';
import {
  CompetenciaPeriodoSelect,
  resolverCompetencia,
  type CompetenciaFiltro,
} from '../../components/CompetenciaPeriodoSelect';

/** Campos alinhados ao cabeçalho da planilha Prospecção B2B. */
const EMPTY_LEAD = {
  nome: '',
  segmento: 'Farmácia',
  telefone: '',
  bairro: '',
  ligou: '',
  atendeu: '',
  contatoNome: '',
  contatoCargo: '',
  contatoTelefone: '',
  contatoEmail: '',
  contatoDecisorOk: '',
  proximaAcao: '',
  proximoContato: '',
  observacoes: '',
  cidade: 'Manaus',
  origem: 'prospeccao_b2b',
  tipoLead: 'prospeccao_b2b',
  responsavel: 'Comercial',
  campanha: '',
  categoriaInteresse: '',
  catalogoServicoId: '',
  valorEstimado: '',
  nomeFantasia: '',
  cpfCnpj: '',
  email: '',
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
  if (['fechado', 'perdido', 'abandonou_qualificacao'].includes(lead.etapa)) return false;
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

function boolToSimNao(v?: boolean | null): string {
  if (v === true) return 'sim';
  if (v === false) return 'nao';
  return '';
}

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [indicadores, setIndicadores] = useState<CrmIndicadores | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<LeadTimelineItem[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [interacao, setInteracao] = useState({ tipo: 'observacao', descricao: '' });
  const [novoLead, setNovoLead] = useState({ ...EMPTY_LEAD });
  const [filtros, setFiltros] = useState({
    responsavel: '',
    origem: '',
    campanha: '',
    categoria: '',
    servicoId: '',
    etapa: '',
    tipoLead: 'prospeccao_b2b',
    segmento: '',
    bairro: '',
    ligou: '',
    atendeu: '',
    contatoDecisorOk: '',
    fila: '',
  });
  const [competencia, setCompetencia] = useState<CompetenciaFiltro>({
    modo: 'geral',
    de: '',
    ate: '',
  });
  const [mesesDb, setMesesDb] = useState<Array<{ key: string; de: string; ate: string }>>([]);
  const [perdaPendente, setPerdaPendente] = useState<{ leadId: string; etapaAnterior: string } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [motivoPerdaOutro, setMotivoPerdaOutro] = useState('');
  const [observacaoPerda, setObservacaoPerda] = useState('');
  const [abandonoPendente, setAbandonoPendente] = useState<{ leadId: string; etapaAnterior: string } | null>(null);
  const [motivoAbandono, setMotivoAbandono] = useState('');
  const [motivoAbandonoOutro, setMotivoAbandonoOutro] = useState('');
  const [observacaoAbandono, setObservacaoAbandono] = useState('');
  const [leadForm, setLeadForm] = useState({
    nome: '',
    nomeFantasia: '',
    cpfCnpj: '',
    telefone: '',
    email: '',
    origem: 'whatsapp',
    tipoLead: 'inbound',
    segmento: '',
    bairro: '',
    ligou: '',
    atendeu: '',
    contatoNome: '',
    contatoCargo: '',
    contatoTelefone: '',
    contatoEmail: '',
    contatoDecisorOk: '',
    cidade: '',
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
    const periodo = resolverCompetencia(competencia.modo, competencia.de, competencia.ate, mesesDb);
    if (periodo.de) p.de = periodo.de;
    if (periodo.ate) p.ate = periodo.ate;
    return p;
  }, [filtros, competencia, mesesDb]);

  useEffect(() => {
    leadsApi.meses().then((r) => setMesesDb(r.meses || [])).catch(() => setMesesDb([]));
  }, []);

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
    const lead = leads.find((l) => l.id === leadId);
    if (novaEtapa === 'perdido') {
      setPerdaPendente({ leadId, etapaAnterior: lead?.etapa || 'novo_lead' });
      setMotivoPerda('');
      setMotivoPerdaOutro('');
      setObservacaoPerda('');
      return;
    }
    if (novaEtapa === 'abandonou_qualificacao') {
      setAbandonoPendente({ leadId, etapaAnterior: lead?.etapa || 'novo_lead' });
      setMotivoAbandono('');
      setMotivoAbandonoOutro('');
      setObservacaoAbandono('');
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
      nomeFantasia: lead.nomeFantasia || '',
      cpfCnpj: lead.cpfCnpj || '',
      telefone: lead.telefone || '',
      email: lead.email || '',
      origem: lead.origem || 'whatsapp',
      tipoLead: lead.tipoLead || 'inbound',
      segmento: lead.segmento || '',
      bairro: lead.bairro || '',
      ligou: boolToSimNao(lead.ligou),
      atendeu: boolToSimNao(lead.atendeu),
      contatoNome: lead.contatoNome || '',
      contatoCargo: lead.contatoCargo || '',
      contatoTelefone: lead.contatoTelefone || '',
      contatoEmail: lead.contatoEmail || '',
      contatoDecisorOk: boolToSimNao(lead.contatoDecisorOk),
      cidade: lead.cidade || '',
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
    const motivo = motivoPerda === 'Outro' ? motivoPerdaOutro.trim() : motivoPerda;
    if (!motivo) {
      toast('Informe o motivo da perda', 'error');
      return;
    }
    try {
      await leadsApi.etapa(perdaPendente.leadId, 'perdido', {
        motivoPerda: motivo,
        observacaoPerda: observacaoPerda || undefined,
      });
      setPerdaPendente(null);
      toast('Lead marcado como perdido', 'success');
      carregar();
      if (modalLead?.id === perdaPendente.leadId) await abrirLeadPorId(perdaPendente.leadId);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao atualizar lead', 'error');
    }
  };

  const confirmarAbandono = async () => {
    if (!abandonoPendente || !motivoAbandono) return;
    const motivo = motivoAbandono === 'Outro' ? motivoAbandonoOutro.trim() : motivoAbandono;
    if (!motivo) {
      toast('Informe o motivo do abandono', 'error');
      return;
    }
    try {
      await leadsApi.etapa(abandonoPendente.leadId, 'abandonou_qualificacao', {
        motivoAbandono: motivo,
        observacaoAbandono: observacaoAbandono || undefined,
      });
      setAbandonoPendente(null);
      toast('Lead marcado como abandonou qualificação', 'success');
      carregar();
      if (modalLead?.id === abandonoPendente.leadId) await abrirLeadPorId(abandonoPendente.leadId);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao atualizar lead', 'error');
    }
  };

  const salvarLead = async () => {
    if (!modalLead) return;
    try {
      await leadsApi.atualizar(modalLead.id, {
        nome: leadForm.nome,
        nomeFantasia: leadForm.nomeFantasia || null,
        cpfCnpj: leadForm.cpfCnpj || null,
        telefone: leadForm.telefone,
        email: leadForm.email || leadForm.contatoEmail || '',
        origem: leadForm.origem,
        tipoLead: leadForm.tipoLead,
        segmento: leadForm.segmento || null,
        bairro: leadForm.bairro || null,
        ligou: leadForm.ligou || null,
        atendeu: leadForm.atendeu || null,
        contatoNome: leadForm.contatoNome || null,
        contatoCargo: leadForm.contatoCargo || null,
        contatoTelefone: leadForm.contatoTelefone || null,
        contatoEmail: leadForm.contatoEmail || null,
        contatoDecisorOk: leadForm.contatoDecisorOk || null,
        cidade: leadForm.cidade || null,
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
        nomeFantasia: novoLead.nomeFantasia || null,
        cpfCnpj: novoLead.cpfCnpj || null,
        telefone: novoLead.telefone,
        email: novoLead.contatoEmail || novoLead.email || '',
        origem: novoLead.origem,
        tipoLead: novoLead.tipoLead,
        segmento: novoLead.segmento || null,
        bairro: novoLead.bairro || null,
        ligou: novoLead.ligou || null,
        atendeu: novoLead.atendeu || null,
        contatoNome: novoLead.contatoNome || null,
        contatoCargo: novoLead.contatoCargo || null,
        contatoTelefone: novoLead.contatoTelefone || null,
        contatoEmail: novoLead.contatoEmail || null,
        contatoDecisorOk: novoLead.contatoDecisorOk || null,
        cidade: novoLead.cidade || null,
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
    setMotivoPerdaOutro('');
    setObservacaoPerda('');
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
        action={<Button onClick={abrirNovoLead}>Novo Lead B2B</Button>}
      />

      {indicadores && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ['Leads', indicadores.leads],
            ['Qualificados', indicadores.leadsQualificados],
            ['Taxa qualif.', `${indicadores.taxaQualificacao ?? 0}%`],
            ['Abandonaram', indicadores.abandonaramQualificacao ?? 0],
            ['Orçamentos', indicadores.orcamentos],
            ['Vendas', indicadores.vendas],
            ['Perdidos', indicadores.perdidos ?? 0],
            ['Pipeline', formatMoney(indicadores.valorPipeline)],
            ['Conversão', `${indicadores.taxaConversao}%`],
            ['Ticket médio', formatMoney(indicadores.ticketMedio)],
            ['Receita coorte', formatMoney(indicadores.receita)],
            [
              'Tempo médio',
              indicadores.tempoMedioFechamento != null
                ? `${indicadores.tempoMedioFechamento}d`
                : '—',
            ],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3">
        <CompetenciaPeriodoSelect value={competencia} onChange={setCompetencia} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          variant={filtros.fila === 'hoje' ? 'primary' : 'secondary'}
          onClick={() => setFiltros({ ...filtros, fila: filtros.fila === 'hoje' ? '' : 'hoje' })}
        >
          Fila hoje
        </Button>
        <Button
          variant={filtros.fila === 'atrasados' ? 'primary' : 'secondary'}
          onClick={() => setFiltros({ ...filtros, fila: filtros.fila === 'atrasados' ? '' : 'atrasados' })}
        >
          Atrasados
        </Button>
      </div>

      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Select
          label="Tipo"
          value={filtros.tipoLead}
          onChange={(e) => setFiltros({ ...filtros, tipoLead: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="inbound">Inbound</option>
          <option value="prospeccao_b2b">Prospecção B2B</option>
        </Select>
        <Select
          label="Segmento"
          value={filtros.segmento}
          onChange={(e) => setFiltros({ ...filtros, segmento: e.target.value })}
        >
          <option value="">Todos</option>
          {SEGMENTOS_B2B.map((s) => (
            <option key={s.key} value={s.label}>
              {s.label}
            </option>
          ))}
        </Select>
        <Input
          label="Bairro"
          value={filtros.bairro}
          onChange={(e) => setFiltros({ ...filtros, bairro: e.target.value })}
          placeholder="Ex.: Cidade Nova"
        />
        <Select label="Ligou?" value={filtros.ligou} onChange={(e) => setFiltros({ ...filtros, ligou: e.target.value })}>
          {SIM_NAO_OPTIONS.map((o) => (
            <option key={o.key || 'vazio'} value={o.key}>
              {o.label === '—' ? 'Todos' : o.label}
            </option>
          ))}
        </Select>
        <Select
          label="Atendeu?"
          value={filtros.atendeu}
          onChange={(e) => setFiltros({ ...filtros, atendeu: e.target.value })}
        >
          {SIM_NAO_OPTIONS.map((o) => (
            <option key={o.key || 'vazio'} value={o.key}>
              {o.label === '—' ? 'Todos' : o.label}
            </option>
          ))}
        </Select>
        <Select
          label="Contato do decisor?"
          value={filtros.contatoDecisorOk}
          onChange={(e) => setFiltros({ ...filtros, contatoDecisorOk: e.target.value })}
        >
          {SIM_NAO_OPTIONS.map((o) => (
            <option key={o.key || 'vazio'} value={o.key}>
              {o.label === '—' ? 'Todos' : o.label}
            </option>
          ))}
        </Select>
        <Input
          label="Responsável ABS"
          value={filtros.responsavel}
          onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })}
          placeholder="Nome"
        />
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
                                  {lead.nomeFantasia || lead.nome}
                                </p>
                                <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">
                                  {atrasado && (
                                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                                      Atrasado
                                    </span>
                                  )}
                                  {lead.ligou === true && (
                                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                                      Ligou
                                    </span>
                                  )}
                                  {lead.atendeu === true && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                                      Atendeu
                                    </span>
                                  )}
                                  {lead.contatoDecisorOk === true && (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                      Decisor
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {[lead.segmento, lead.bairro].filter(Boolean).join(' · ') || 'Sem segmento/bairro'}
                              </p>
                              {lead.contatoNome && (
                                <p className="mt-1 text-xs text-slate-600">
                                  Decisor: {lead.contatoNome}
                                  {lead.contatoCargo ? ` · ${lead.contatoCargo}` : ''}
                                </p>
                              )}
                              <p className="mt-1 text-[11px] text-slate-500">{lead.telefone}</p>
                              <p className={`mt-1 text-[11px] ${atrasado ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                                {lead.proximaAcao || 'Sem próxima ação'}
                                {lead.proximoContato ? ` · ${formatDateTime(lead.proximoContato)}` : ''}
                              </p>
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Prospecção B2B (planilha)</h4>
              <div className="grid gap-x-3 sm:grid-cols-2">
                <Input
                  label="Empresa"
                  value={leadForm.nome}
                  onChange={(e) => setLeadForm({ ...leadForm, nome: e.target.value })}
                />
                <Select
                  label="Segmento"
                  value={leadForm.segmento}
                  onChange={(e) => setLeadForm({ ...leadForm, segmento: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {SEGMENTOS_B2B.map((s) => (
                    <option key={s.key} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Telefone"
                  value={leadForm.telefone}
                  onChange={(e) => setLeadForm({ ...leadForm, telefone: e.target.value })}
                />
                <Input
                  label="Bairro"
                  value={leadForm.bairro}
                  onChange={(e) => setLeadForm({ ...leadForm, bairro: e.target.value })}
                />
                <Select
                  label="Ligou? (Sim/Não)"
                  value={leadForm.ligou}
                  onChange={(e) => setLeadForm({ ...leadForm, ligou: e.target.value })}
                >
                  {SIM_NAO_OPTIONS.map((o) => (
                    <option key={o.key || 'vazio'} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Atendeu? (Sim/Não)"
                  value={leadForm.atendeu}
                  onChange={(e) => setLeadForm({ ...leadForm, atendeu: e.target.value })}
                >
                  {SIM_NAO_OPTIONS.map((o) => (
                    <option key={o.key || 'vazio'} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Nome do decisor"
                  value={leadForm.contatoNome}
                  onChange={(e) => setLeadForm({ ...leadForm, contatoNome: e.target.value })}
                />
                <Input
                  label="Cargo/Função"
                  value={leadForm.contatoCargo}
                  onChange={(e) => setLeadForm({ ...leadForm, contatoCargo: e.target.value })}
                />
                <Input
                  label="Telefone/WhatsApp do decisor"
                  value={leadForm.contatoTelefone}
                  onChange={(e) => setLeadForm({ ...leadForm, contatoTelefone: e.target.value })}
                />
                <Input
                  label="E-mail do decisor"
                  value={leadForm.contatoEmail}
                  onChange={(e) => setLeadForm({ ...leadForm, contatoEmail: e.target.value })}
                />
                <Select
                  label="Conseguiu contato do decisor? (Sim/Não)"
                  value={leadForm.contatoDecisorOk}
                  onChange={(e) => setLeadForm({ ...leadForm, contatoDecisorOk: e.target.value })}
                >
                  {SIM_NAO_OPTIONS.map((o) => (
                    <option key={o.key || 'vazio'} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cidade"
                  value={leadForm.cidade}
                  onChange={(e) => setLeadForm({ ...leadForm, cidade: e.target.value })}
                  placeholder="Manaus"
                />
                <Input
                  label="Próxima ação"
                  value={leadForm.proximaAcao}
                  onChange={(e) => setLeadForm({ ...leadForm, proximaAcao: e.target.value })}
                />
                <Input
                  label="Data para novo contato"
                  type="datetime-local"
                  value={leadForm.proximoContato}
                  onChange={(e) => setLeadForm({ ...leadForm, proximoContato: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Observações"
                    value={leadForm.observacoes}
                    onChange={(e) => setLeadForm({ ...leadForm, observacoes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-x-3 sm:grid-cols-2">
              <Select
                label="Tipo de lead"
                value={leadForm.tipoLead}
                onChange={(e) => {
                  const tipoLead = e.target.value;
                  setLeadForm({
                    ...leadForm,
                    tipoLead,
                    origem: tipoLead === 'prospeccao_b2b' ? 'prospeccao_b2b' : leadForm.origem,
                    cidade: tipoLead === 'prospeccao_b2b' && !leadForm.cidade ? 'Manaus' : leadForm.cidade,
                  });
                }}
              >
                <option value="inbound">Inbound</option>
                <option value="prospeccao_b2b">Prospecção B2B</option>
              </Select>
              <Input
                label="Responsável ABS"
                value={leadForm.responsavel}
                onChange={(e) => setLeadForm({ ...leadForm, responsavel: e.target.value })}
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
        <p className="mb-3 text-sm text-slate-500">
          Oportunidade que avançou no comercial, mas não fechou. Informe o motivo antes de mover.
        </p>
        <Select label="Motivo da perda" value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)}>
          <option value="">Selecione...</option>
          {MOTIVOS_PERDA.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        {motivoPerda === 'Outro' && (
          <Input
            label="Descreva o motivo"
            value={motivoPerdaOutro}
            onChange={(e) => setMotivoPerdaOutro(e.target.value)}
          />
        )}
        <Input
          label="Observação da perda (opcional)"
          value={observacaoPerda}
          onChange={(e) => setObservacaoPerda(e.target.value)}
          placeholder="Ex.: Cliente encontrou outro profissional por R$ 450"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPerdaPendente(null)}>
            Cancelar
          </Button>
          <Button disabled={!motivoPerda || (motivoPerda === 'Outro' && !motivoPerdaOutro.trim())} onClick={confirmarPerda}>
            Confirmar perda
          </Button>
        </div>
      </Modal>

      <Modal open={!!abandonoPendente} onClose={() => setAbandonoPendente(null)} title="Abandonou qualificação">
        <p className="mb-3 text-sm text-slate-500">
          Lead que iniciou contato, mas não concluiu a triagem necessária para ser qualificado.
        </p>
        <Select label="Motivo do abandono" value={motivoAbandono} onChange={(e) => setMotivoAbandono(e.target.value)}>
          <option value="">Selecione...</option>
          {MOTIVOS_ABANDONO.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        {motivoAbandono === 'Outro' && (
          <Input
            label="Descreva o motivo"
            value={motivoAbandonoOutro}
            onChange={(e) => setMotivoAbandonoOutro(e.target.value)}
          />
        )}
        <Input
          label="Observação (opcional)"
          value={observacaoAbandono}
          onChange={(e) => setObservacaoAbandono(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAbandonoPendente(null)}>
            Cancelar
          </Button>
          <Button
            disabled={!motivoAbandono || (motivoAbandono === 'Outro' && !motivoAbandonoOutro.trim())}
            onClick={confirmarAbandono}
          >
            Confirmar abandono
          </Button>
        </div>
      </Modal>

      <Modal open={modalNovo} onClose={fecharNovoLead} title="Novo Lead B2B" wide>
        <p className="mb-3 text-sm text-slate-500">
          Campos iguais ao cabeçalho da planilha de prospecção. Preencha conforme a triagem da ligação.
        </p>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Input
            label="Empresa"
            value={novoLead.nome}
            onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })}
          />
          <Select
            label="Segmento"
            value={novoLead.segmento}
            onChange={(e) => setNovoLead({ ...novoLead, segmento: e.target.value })}
          >
            <option value="">Selecione</option>
            {SEGMENTOS_B2B.map((s) => (
              <option key={s.key} value={s.label}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            label="Telefone"
            value={novoLead.telefone}
            onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })}
          />
          <Input
            label="Bairro"
            value={novoLead.bairro}
            onChange={(e) => setNovoLead({ ...novoLead, bairro: e.target.value })}
          />
          <Select
            label="Ligou? (Sim/Não)"
            value={novoLead.ligou}
            onChange={(e) => setNovoLead({ ...novoLead, ligou: e.target.value })}
          >
            {SIM_NAO_OPTIONS.map((o) => (
              <option key={o.key || 'vazio'} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            label="Atendeu? (Sim/Não)"
            value={novoLead.atendeu}
            onChange={(e) => setNovoLead({ ...novoLead, atendeu: e.target.value })}
          >
            {SIM_NAO_OPTIONS.map((o) => (
              <option key={o.key || 'vazio'} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Nome do decisor"
            value={novoLead.contatoNome}
            onChange={(e) => setNovoLead({ ...novoLead, contatoNome: e.target.value })}
          />
          <Input
            label="Cargo/Função"
            value={novoLead.contatoCargo}
            onChange={(e) => setNovoLead({ ...novoLead, contatoCargo: e.target.value })}
          />
          <Input
            label="Telefone/WhatsApp do decisor"
            value={novoLead.contatoTelefone}
            onChange={(e) => setNovoLead({ ...novoLead, contatoTelefone: e.target.value })}
          />
          <Input
            label="E-mail do decisor"
            value={novoLead.contatoEmail}
            onChange={(e) => setNovoLead({ ...novoLead, contatoEmail: e.target.value })}
          />
          <Select
            label="Conseguiu contato do decisor? (Sim/Não)"
            value={novoLead.contatoDecisorOk}
            onChange={(e) => setNovoLead({ ...novoLead, contatoDecisorOk: e.target.value })}
          >
            {SIM_NAO_OPTIONS.map((o) => (
              <option key={o.key || 'vazio'} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Responsável ABS"
            value={novoLead.responsavel}
            onChange={(e) => setNovoLead({ ...novoLead, responsavel: e.target.value })}
          />
          <Input
            label="Próxima ação"
            value={novoLead.proximaAcao}
            onChange={(e) => setNovoLead({ ...novoLead, proximaAcao: e.target.value })}
          />
          <Input
            label="Data para novo contato"
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
            Criar Lead B2B
          </Button>
        </div>
      </Modal>
    </div>
  );
}
