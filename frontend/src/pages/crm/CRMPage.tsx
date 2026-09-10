import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { leadsApi, leadsApiExtra } from '../../services/modules.service';
import { useToast } from '../../components/Toast';
import type { Lead } from '../../types';
import { ETAPAS_LEAD, MOTIVOS_PERDA, STATUS_COMERCIAL } from '../../types';
import { Badge, PageHeader, Loading, Modal, Input, Select, Button } from '../../components/ui';

const EMPTY_LEAD = {
  nome: '',
  telefone: '',
  email: '',
  origem: 'site',
  interesse: '',
  responsavel: 'Comercial',
};

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [interacao, setInteracao] = useState({ tipo: 'observacao', descricao: '' });
  const [novoLead, setNovoLead] = useState({ ...EMPTY_LEAD });
  const [filtroResp, setFiltroResp] = useState('');
  const [perdaPendente, setPerdaPendente] = useState<{ leadId: string; etapaAnterior: string } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState('');
  const [leadForm, setLeadForm] = useState({ statusComercial: 'em_andamento', motivoPerda: '', proximoContato: '', proximaAcao: '', responsavel: '' });
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const abrirNovoLead = () => {
    setNovoLead({ ...EMPTY_LEAD });
    setModalNovo(true);
  };

  const fecharNovoLead = () => {
    setModalNovo(false);
    setNovoLead({ ...EMPTY_LEAD });
  };

  const carregar = () => {
    leadsApi.listar(filtroResp ? { responsavel: filtroResp } : undefined)
      .then(setLeads).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroResp]);
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId) return;
    leadsApi.buscar(leadId).then((lead) => {
      setModalLead(lead);
      preencherLeadForm(lead);
    }).catch(() => toast('Lead não encontrado', 'error'));
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
    await leadsApi.etapa(leadId, novaEtapa);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, etapa: novaEtapa } : l));
  };

  const preencherLeadForm = (lead: Lead) => setLeadForm({
    statusComercial: lead.statusComercial || 'em_andamento',
    motivoPerda: lead.motivoPerda || '',
    proximoContato: lead.proximoContato?.slice(0, 10) || '',
    proximaAcao: lead.proximaAcao || '',
    responsavel: lead.responsavel || '',
  });

  const abrirLead = async (lead: Lead) => {
    const full = await leadsApi.buscar(lead.id);
    setModalLead(full);
    preencherLeadForm(full);
    setSearchParams({ lead: lead.id });
  };

  const fecharLead = () => { setModalLead(null); setSearchParams({}); };

  const confirmarPerda = async () => {
    if (!perdaPendente || !motivoPerda) return;
    try {
      await leadsApi.etapa(perdaPendente.leadId, 'perdido', { motivoPerda });
      setLeads((prev) => prev.map((l) => l.id === perdaPendente.leadId ? { ...l, etapa: 'perdido', motivoPerda, statusComercial: 'perdido' } : l));
      setPerdaPendente(null);
      toast('Lead marcado como perdido', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Erro ao atualizar lead', 'error'); }
  };

  const salvarLead = async () => {
    if (!modalLead) return;
    try {
      await leadsApi.atualizar(modalLead.id, { responsavel: leadForm.responsavel, proximoContato: leadForm.proximoContato || null, proximaAcao: leadForm.proximaAcao || null });
      await leadsApi.statusComercial(modalLead.id, { statusComercial: leadForm.statusComercial, motivoPerda: leadForm.motivoPerda || null, proximoContato: leadForm.proximoContato || null, proximaAcao: leadForm.proximaAcao || null });
      const updated = await leadsApi.buscar(modalLead.id);
      setModalLead(updated); preencherLeadForm(updated); carregar(); toast('Lead atualizado', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Erro ao salvar lead', 'error'); }
  };

  const registrarInteracao = async () => {
    if (!modalLead || !interacao.descricao) return;
    await leadsApi.interacao(modalLead.id, interacao);
    const updated = await leadsApi.buscar(modalLead.id);
    setModalLead(updated);
    setInteracao({ tipo: 'observacao', descricao: '' });
  };

  const criarLead = async () => {
    await leadsApi.criar(novoLead);
    fecharNovoLead();
    toast('Lead criado!', 'success');
    carregar();
  };

  const converterCliente = async () => {
    if (!modalLead) return;
    try {
      await leadsApiExtra.converterCliente(modalLead.id);
      const updated = await leadsApi.buscar(modalLead.id);
      setModalLead(updated);
      preencherLeadForm(updated);
      toast('Lead convertido em cliente!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao converter', 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Pipeline de leads"
        action={<Button onClick={abrirNovoLead}>Novo Lead</Button>}
      />

      <div className="mb-4">
        <input placeholder="Filtrar responsável..." value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm" />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ETAPAS_LEAD.map((col) => (
            <div key={col.key} className="min-w-[220px] flex-shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
                <span className="rounded-full bg-slate-200 px-2 text-xs">{leadsPorEtapa(col.key).length}</span>
              </div>
              <Droppable droppableId={col.key}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[400px] rounded-lg bg-slate-100 p-2">
                    {leadsPorEtapa(col.key).map((lead, idx) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                        {(prov) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                            onClick={() => abrirLead(lead)}
                            className="mb-2 cursor-pointer rounded-lg bg-white p-3 shadow-sm hover:shadow-md">
                            <p className="font-medium text-sm">{lead.nome}</p>
                            <p className="text-xs text-slate-500">{lead.origem} · {lead.responsavel}</p>
                            {lead.statusComercial && <Badge color="mt-2 bg-blue-100 text-blue-700">{lead.statusComercial.replace(/_/g, ' ')}</Badge>}
                            {lead.interacoes?.[0] && (
                              <p className="mt-1 truncate text-xs text-slate-400">{lead.interacoes[0].descricao}</p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <Modal open={!!modalLead} onClose={fecharLead} title={modalLead?.nome || ''}>
        {modalLead && (
          <div>
            <p className="text-sm text-slate-500">{modalLead.email} · {modalLead.telefone}</p>
            <p className="text-sm">Interesse: {modalLead.interesse}</p>
            {modalLead.clienteId && (
              <p className="mt-2 text-sm">
                <Link to={`/clientes/${modalLead.clienteId}`} className="font-medium text-primary-600 hover:underline">
                  Abrir ficha 360º do cliente
                </Link>
              </p>
            )}
            <div className="mt-4 grid gap-x-3 sm:grid-cols-2">
              <Select label="Status comercial" value={leadForm.statusComercial} onChange={(e) => setLeadForm({ ...leadForm, statusComercial: e.target.value })}>
                {STATUS_COMERCIAL.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
              <Input label="Responsável" value={leadForm.responsavel} onChange={(e) => setLeadForm({ ...leadForm, responsavel: e.target.value })} />
              <Input label="Próximo contato" type="date" value={leadForm.proximoContato} onChange={(e) => setLeadForm({ ...leadForm, proximoContato: e.target.value })} />
              <Input label="Próxima ação" value={leadForm.proximaAcao} onChange={(e) => setLeadForm({ ...leadForm, proximaAcao: e.target.value })} />
              {(leadForm.statusComercial === 'perdido' || modalLead.etapa === 'perdido') && <div className="sm:col-span-2"><Select label="Motivo da perda" value={leadForm.motivoPerda} onChange={(e) => setLeadForm({ ...leadForm, motivoPerda: e.target.value })}><option value="">Selecione</option>{MOTIVOS_PERDA.map((m) => <option key={m} value={m}>{m}</option>)}</Select></div>}
              <Button className="mb-3 sm:col-span-2" onClick={salvarLead}>Salvar dados comerciais</Button>
            </div>
            <div className="mt-4 max-h-48 overflow-y-auto">
              <h4 className="text-sm font-semibold">Histórico</h4>
              {modalLead.interacoes?.map((i) => (
                <div key={i.id} className="mt-2 rounded bg-slate-50 p-2 text-sm">
                  <span className="font-medium capitalize">{i.tipo}</span>: {i.descricao}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Select label="Tipo" value={interacao.tipo} onChange={(e) => setInteracao({ ...interacao, tipo: e.target.value })}>
                <option value="ligacao">Ligação</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="reuniao">Reunião</option>
                <option value="proposta">Proposta</option>
                <option value="observacao">Observação</option>
              </Select>
              <Input label="Descrição" value={interacao.descricao} onChange={(e) => setInteracao({ ...interacao, descricao: e.target.value })} />
              <div className="flex gap-2">
                <Button onClick={registrarInteracao}>Registrar</Button>
                {modalLead.etapa !== 'fechado' && (
                  <Button variant="secondary" onClick={converterCliente}>Converter em Cliente</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!perdaPendente} onClose={() => setPerdaPendente(null)} title="Motivo da perda">
        <p className="mb-3 text-sm text-slate-500">Informe o motivo antes de mover o lead para Perdido.</p>
        <Select label="Motivo" value={motivoPerda} onChange={(e) => setMotivoPerda(e.target.value)}>
          <option value="">Selecione...</option>
          {MOTIVOS_PERDA.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPerdaPendente(null)}>Cancelar</Button><Button disabled={!motivoPerda} onClick={confirmarPerda}>Confirmar perda</Button></div>
      </Modal>

      <Modal open={modalNovo} onClose={fecharNovoLead} title="Novo Lead">
        <Input label="Nome" value={novoLead.nome} onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })} />
        <Input label="Telefone" value={novoLead.telefone} onChange={(e) => setNovoLead({ ...novoLead, telefone: e.target.value })} />
        <Input label="Email" value={novoLead.email} onChange={(e) => setNovoLead({ ...novoLead, email: e.target.value })} />
        <Select label="Origem" value={novoLead.origem} onChange={(e) => setNovoLead({ ...novoLead, origem: e.target.value })}>
          <option value="site">Site</option>
          <option value="indicação">Indicação</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
        <Input label="Interesse" value={novoLead.interesse} onChange={(e) => setNovoLead({ ...novoLead, interesse: e.target.value })} />
        <Button onClick={criarLead} className="mt-2">Criar Lead</Button>
      </Modal>
    </div>
  );
}
