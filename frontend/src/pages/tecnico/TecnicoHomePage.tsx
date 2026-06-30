import { useEffect, useState } from 'react';
import { tecnicoApi } from '../../services/modules.service';
import type { TecnicoOs, AgendamentoTecnico } from '../../types';
import { formatDate, formatEndereco, mapsLink } from '../../types';
import { PageHeader, Loading, Card, Button, Badge } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function TecnicoHomePage() {
  const { toast } = useToast();
  const [osList, setOsList] = useState<TecnicoOs[]>([]);
  const [agenda, setAgenda] = useState<AgendamentoTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOs, setExpandedOs] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, Record<string, string>>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const carregar = () => {
    setLoading(true);
    Promise.all([tecnicoApi.os(), tecnicoApi.agenda()])
      .then(([os, ag]) => {
        setOsList(os);
        setAgenda(ag);
        const cl: Record<string, Record<string, string>> = {};
        os.forEach((o) => { cl[o.id] = (o.checklist as Record<string, string>) || {}; });
        setChecklists(cl);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const marcarACaminho = async (agendamentoId: string) => {
    try {
      await tecnicoApi.aCaminho(agendamentoId);
      toast('Status: a caminho', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const marcarChegada = async (agendamentoId: string) => {
    try {
      await tecnicoApi.chegada(agendamentoId);
      toast('Chegada registrada', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const salvarChecklist = async (osId: string) => {
    try {
      await tecnicoApi.checklist(osId, checklists[osId] || {});
      toast('Checklist salvo!', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    }
  };

  const uploadFoto = async (osId: string, campo: 'fotoAntes' | 'fotoDepois' | 'fotoConclusao' | 'assinaturaCliente', file: File) => {
    setUploading(`${osId}-${campo}`);
    try {
      const res = await tecnicoApi.uploadFoto(osId, file, campo) as { checklist?: Record<string, string> };
      if (res.checklist) {
        setChecklists((prev) => ({ ...prev, [osId]: res.checklist! }));
      }
      toast('Foto enviada!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro no upload', 'error');
    } finally {
      setUploading(null);
    }
  };

  const voltarAgendamento = async (agendamentoId: string) => {
    try {
      await tecnicoApi.voltarAgendamento(agendamentoId);
      toast('Etapa revertida', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const voltarEtapaOs = async (osId: string) => {
    try {
      await tecnicoApi.voltarEtapaOs(osId);
      toast('Etapa da OS revertida', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const temFotoConclusao = (cl: Record<string, string>) => Boolean(cl.fotoConclusao || cl.fotoDepois);

  const concluirServico = async (osId: string) => {
    const cl = checklists[osId] || {};
    if (!temFotoConclusao(cl)) {
      toast('Envie a foto do serviço concluído antes de finalizar', 'error');
      return;
    }
    try {
      await tecnicoApi.concluir(osId, {
        descricaoConclusao: cl.descricaoConclusao,
        materiais: cl.materiais,
      });
      toast('Serviço registrado como concluído!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao concluir', 'error');
    }
  };

  if (loading) return <Loading />;

  const EnderecoBox = ({ endereco }: { endereco?: Record<string, string> | null }) => {
    const texto = formatEndereco(endereco);
    const link = mapsLink(endereco);
    if (texto === '—') return <p className="text-xs text-amber-600">Endereço não cadastrado</p>;
    return (
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
        <p className="font-medium text-slate-700">📍 {texto}</p>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-primary-600 underline">
            Abrir no Google Maps
          </a>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Portal do Técnico" subtitle="Ordens de serviço e agenda do dia" />

      <h2 className="mb-3 text-lg font-bold text-primary-800">Agenda de hoje</h2>
      {agenda.length === 0 ? (
        <Card className="mb-6"><p className="text-slate-400">Nenhum agendamento hoje</p></Card>
      ) : (
        agenda.map((ag) => (
          <Card key={ag.id} className="mb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-primary-800">{ag.horarioInicio} — {ag.cliente.nome}</p>
                <p className="text-sm text-slate-500">Pedido {ag.pedido.numero}</p>
                <p className="text-sm text-slate-500">{ag.cliente.telefone}</p>
                <EnderecoBox endereco={ag.cliente.endereco} />
              </div>
              <Badge color="bg-blue-100 text-blue-700">{ag.status}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ag.status === 'confirmado' && (
                <Button variant="cta" onClick={() => marcarACaminho(ag.id)}>A caminho</Button>
              )}
              {ag.status === 'a_caminho' && (
                <>
                  <Button variant="cta" onClick={() => marcarChegada(ag.id)}>Cheguei</Button>
                  <Button variant="secondary" onClick={() => voltarAgendamento(ag.id)}>Voltar etapa</Button>
                </>
              )}
              {ag.status === 'em_execucao' && (
                <Button variant="secondary" onClick={() => voltarAgendamento(ag.id)}>Voltar etapa</Button>
              )}
            </div>
          </Card>
        ))
      )}

      <h2 className="mb-3 mt-6 text-lg font-bold text-primary-800">Ordens de serviço</h2>
      {osList.length === 0 ? (
        <Card><p className="text-slate-400">Nenhuma OS em andamento</p></Card>
      ) : (
        osList.map((os) => {
          const ag = os.pedido.agendamentos?.[0];
          const expanded = expandedOs === os.id;
          const cl = checklists[os.id] || {};

          return (
            <Card key={os.id} className="mb-3">
              <button
                type="button"
                className="flex w-full items-start justify-between text-left"
                onClick={() => setExpandedOs(expanded ? null : os.id)}
              >
                <div>
                  <p className="font-semibold text-primary-800">
                    {os.pedido.numero} — {os.pedido.solicitacao?.servico?.nome || os.pedido.descricao}
                  </p>
                  <p className="text-sm text-slate-500">{os.pedido.cliente.nome} · {os.pedido.cliente.telefone}</p>
                  {ag && <p className="text-xs text-slate-400">{formatDate(ag.data)} {ag.horarioInicio}</p>}
                </div>
                <Badge color="bg-indigo-100 text-indigo-700">{os.etapa}</Badge>
              </button>

              {expanded && (
                <div className="mt-4 border-t pt-4">
                  <EnderecoBox endereco={os.pedido.cliente.endereco} />
                  <div className="mb-3 mt-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">Checklist</h4>
                    {['conclusao', 'avaliacao'].includes(os.etapa) && !os.checklistCompleto && (
                      <Button variant="secondary" className="text-xs" onClick={() => voltarEtapaOs(os.id)}>
                        Voltar etapa da OS
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(['fotoAntes', 'fotoDepois', 'fotoConclusao', 'assinaturaCliente'] as const).map((campo) => (
                      <div key={campo}>
                        <label className="mb-1 block text-xs font-medium capitalize text-slate-600">
                          {campo === 'fotoConclusao' ? (
                            <>Foto do serviço concluído <span className="text-red-500">*</span></>
                          ) : campo.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        {cl[campo] && (
                          <img src={cl[campo]} alt={campo} className="mb-2 h-24 rounded border object-cover" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploading === `${os.id}-${campo}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadFoto(os.id, campo, f);
                          }}
                          className="text-xs"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Descrição do serviço realizado
                        <span className="font-normal text-slate-400"> (opcional, complemento)</span>
                      </label>
                      <textarea
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Descreva o que foi feito no local (mín. 10 caracteres)..."
                        value={cl.descricaoConclusao || ''}
                        onChange={(e) => setChecklists((prev) => ({
                          ...prev,
                          [os.id]: { ...prev[os.id], descricaoConclusao: e.target.value },
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Materiais utilizados</label>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={cl.materiais || ''}
                        placeholder="Ex: 2 tomadas, 1 disjuntor..."
                        onChange={(e) => setChecklists((prev) => ({
                          ...prev,
                          [os.id]: { ...prev[os.id], materiais: e.target.value },
                        }))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Observações</label>
                      <textarea
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        rows={2}
                        value={cl.observacoes || ''}
                        onChange={(e) => setChecklists((prev) => ({
                          ...prev,
                          [os.id]: { ...prev[os.id], observacoes: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => salvarChecklist(os.id)}>Salvar checklist</Button>
                    <Button
                      variant="cta"
                      disabled={!temFotoConclusao(cl)}
                      onClick={() => concluirServico(os.id)}
                    >
                      Concluir serviço
                    </Button>
                  </div>
                  {!temFotoConclusao(cl) && (
                    <p className="mt-2 text-xs text-amber-600">Obrigatório enviar foto do serviço concluído para finalizar.</p>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
