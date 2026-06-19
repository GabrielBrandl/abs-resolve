import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { leadsApi, leadsApiExtra } from '../../services/modules.service';
import { useToast } from '../../components/Toast';
import type { Lead } from '../../types';
import { ETAPAS_LEAD } from '../../types';
import { PageHeader, Loading, Modal, Input, Select, Button } from '../../components/ui';

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [interacao, setInteracao] = useState({ tipo: 'observacao', descricao: '' });
  const [novoLead, setNovoLead] = useState({ nome: '', telefone: '', email: '', origem: 'site', interesse: '', responsavel: 'Comercial' });
  const [filtroResp, setFiltroResp] = useState('');
  const { toast } = useToast();

  const carregar = () => {
    leadsApi.listar(filtroResp ? { responsavel: filtroResp } : undefined)
      .then(setLeads).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroResp]);

  const leadsPorEtapa = (etapa: string) => leads.filter((l) => l.etapa === etapa);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const novaEtapa = result.destination.droppableId;
    await leadsApi.etapa(leadId, novaEtapa);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, etapa: novaEtapa } : l));
  };

  const abrirLead = async (lead: Lead) => {
    const full = await leadsApi.buscar(lead.id);
    setModalLead(full);
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
    setModalNovo(false);
    toast('Lead criado!', 'success');
    carregar();
  };

  const converterCliente = async () => {
    if (!modalLead) return;
    await leadsApiExtra.converterCliente(modalLead.id);
    toast('Lead convertido em cliente!', 'success');
    setModalLead(null);
    carregar();
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Pipeline de leads"
        action={<Button onClick={() => setModalNovo(true)}>Novo Lead</Button>}
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

      <Modal open={!!modalLead} onClose={() => setModalLead(null)} title={modalLead?.nome || ''}>
        {modalLead && (
          <div>
            <p className="text-sm text-slate-500">{modalLead.email} · {modalLead.telefone}</p>
            <p className="text-sm">Interesse: {modalLead.interesse}</p>
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

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo Lead">
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
