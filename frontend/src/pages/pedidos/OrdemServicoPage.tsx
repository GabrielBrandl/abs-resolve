import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { osApi, agendamentoApi } from '../../services/modules.service';
import type { OrdemServico } from '../../types';
import { ETAPAS_OS, formatCurrency, formatDate, formatEndereco, mapsLink } from '../../types';
import { PageHeader, Loading, Badge, Card, Button, Modal, Input } from '../../components/ui';
import { BotaoVerFotos } from '../../components/GaleriaFotos';
import { useToast } from '../../components/Toast';

function fotosDoChecklist(checklist?: Record<string, string> | null): string[] {
  if (!checklist) return [];
  return [checklist.fotoAntes, checklist.fotoDepois, checklist.fotoConclusao, checklist.assinaturaCliente]
    .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));
}

function fotosSolicitacao(fotos: unknown): string[] {
  if (!Array.isArray(fotos)) return [];
  return fotos.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u));
}

function labelPagamento(status: string) {
  const map: Record<string, string> = {
    RECEIVED: 'Recebido',
    PENDING: 'Pendente',
    OVERDUE: 'Vencido',
    REFUNDED: 'Estornado',
  };
  return map[status] || status;
}

export function OrdemServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [detalhe, setDetalhe] = useState<OrdemServico | null>(null);
  const [checklistOs, setChecklistOs] = useState<OrdemServico | null>(null);
  const [checklist, setChecklist] = useState({
    fotoAntes: '', fotoDepois: '', materiais: '', observacoes: '', assinaturaCliente: '',
  });
  const { toast } = useToast();

  const carregar = () => {
    setLoading(true);
    osApi.listar(filtro ? { etapa: filtro } : undefined).then(setOrdens).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtro]);

  const avancarEtapa = async (os: OrdemServico) => {
    const idx = ETAPAS_OS.findIndex((e) => e.key === os.etapa);
    if (idx < ETAPAS_OS.length - 1) {
      await osApi.etapa(os.id, ETAPAS_OS[idx + 1].key);
      toast('Etapa atualizada!', 'success');
      carregar();
    }
  };

  const salvarChecklist = async () => {
    if (!checklistOs) return;
    await osApi.checklist(checklistOs.id, checklist);
    toast('Checklist salvo! Garantia emitida se completo.', 'success');
    setChecklistOs(null);
    carregar();
  };

  const registrarAusencia = async (os: OrdemServico) => {
    const agId = os.pedido?.agendamentos?.[0]?.id;
    if (!agId) { toast('Sem agendamento vinculado', 'error'); return; }
    const res = await agendamentoApi.ausencia(agId) as { primeiraVez: boolean; taxa: number };
    toast(res.primeiraVez ? 'Reagendamento gratuito' : `Taxa de R$ ${res.taxa} aplicada`, res.primeiraVez ? 'success' : 'error');
  };

  const abrirChecklist = (os: OrdemServico) => {
    const atual = (os.checklist || {}) as Record<string, string>;
    setChecklist({
      fotoAntes: atual.fotoAntes || '',
      fotoDepois: atual.fotoDepois || '',
      materiais: atual.materiais || '',
      observacoes: atual.observacoes || os.observacoes || '',
      assinaturaCliente: atual.assinaturaCliente || '',
    });
    setChecklistOs(os);
  };

  return (
    <div>
      <PageHeader title="Ordens de Serviço" subtitle="Acompanhe execução, checklist e detalhes do serviço" />

      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="mb-4 rounded-lg border border-abs-gray px-3 py-2 text-sm">
        <option value="">Todas etapas</option>
        {ETAPAS_OS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
      </select>

      {loading ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ordens.map((os) => {
            const etapaInfo = ETAPAS_OS.find((e) => e.key === os.etapa);
            const idx = ETAPAS_OS.findIndex((e) => e.key === os.etapa);
            const completo = os.checklistCompleto;
            const servicoNome = os.pedido?.solicitacao?.servico?.nome || os.pedido?.servico?.nome || os.pedido?.descricao;
            const ag = os.pedido?.agendamentos?.[0];
            const tecnicoNome = os.tecnico?.nome || ag?.tecnico?.nome;
            return (
              <Card key={os.id}>
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-primary-700">{os.pedido?.numero || os.pedidoId}</h3>
                    <p className="text-sm text-slate-500">{os.pedido?.cliente?.nome}</p>
                    {servicoNome && <p className="mt-0.5 truncate text-xs text-slate-400">{servicoNome}</p>}
                  </div>
                  <Badge color={completo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {completo ? 'Checklist OK' : etapaInfo?.label}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {os.pedido?.valor != null && (
                    <p>Valor: <span className="font-medium text-slate-700">{formatCurrency(os.pedido.valor)}</span></p>
                  )}
                  {tecnicoNome && <p>Técnico: <span className="text-slate-700">{tecnicoNome}</span></p>}
                  {ag && (
                    <p>
                      Agenda: {formatDate(ag.data)} · {ag.horarioInicio}–{ag.horarioFim}
                      {' · '}<span className="capitalize">{ag.status}</span>
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-1">
                  {ETAPAS_OS.map((e, i) => (
                    <div key={e.key} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-primary-600' : 'bg-abs-gray'}`} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setDetalhe(os)}>Ver detalhes</Button>
                  {os.etapa === 'execucao' && (
                    <Button variant="cta" onClick={() => abrirChecklist(os)}>Preencher Checklist</Button>
                  )}
                  {idx < ETAPAS_OS.length - 1 && os.etapa !== 'conclusao' && (
                    <Button variant="secondary" onClick={() => avancarEtapa(os)}>Avançar etapa</Button>
                  )}
                  <Button variant="secondary" onClick={() => registrarAusencia(os)}>Cliente ausente</Button>
                </div>
              </Card>
            );
          })}
          {!ordens.length && <p className="text-slate-400">Nenhuma OS encontrada</p>}
        </div>
      )}

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title={`OS · ${detalhe?.pedido?.numero || ''}`} zIndex={50}>
        {detalhe && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto text-sm">
            <section>
              <h4 className="mb-2 font-semibold text-primary-700">Cliente</h4>
              <p className="font-medium">{detalhe.pedido?.cliente?.nome}</p>
              {detalhe.pedido?.cliente?.telefone && <p className="text-slate-500">{detalhe.pedido.cliente.telefone}</p>}
              {detalhe.pedido?.cliente?.email && <p className="text-slate-500">{detalhe.pedido.cliente.email}</p>}
              <p className="mt-1 text-slate-600">{formatEndereco(detalhe.pedido?.cliente?.endereco)}</p>
              {mapsLink(detalhe.pedido?.cliente?.endereco) && (
                <a
                  href={mapsLink(detalhe.pedido?.cliente?.endereco)!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 underline"
                >
                  Abrir no Maps
                </a>
              )}
              {detalhe.pedido?.cliente?.id && (
                <Link to={`/clientes/${detalhe.pedido.cliente.id}`} className="mt-1 block text-primary-600 underline">
                  Ver ficha do cliente
                </Link>
              )}
            </section>

            <section>
              <h4 className="mb-2 font-semibold text-primary-700">Pedido / Serviço</h4>
              <p>Pedido: <Link to={`/pedidos/${detalhe.pedidoId}`} className="text-primary-600 underline">{detalhe.pedido?.numero}</Link></p>
              <p>Status pedido: <span className="capitalize">{detalhe.pedido?.status?.replace(/_/g, ' ')}</span></p>
              <p>Valor: {formatCurrency(detalhe.pedido?.valor || 0)}</p>
              <p>Serviço: {detalhe.pedido?.solicitacao?.servico?.nome || detalhe.pedido?.servico?.nome || detalhe.pedido?.descricao || '—'}</p>
              {detalhe.pedido?.descricao && <p className="text-slate-500">{detalhe.pedido.descricao}</p>}
              {detalhe.pedido?.solicitacao?.opcoes && typeof detalhe.pedido.solicitacao.opcoes === 'object' ? (
                <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs">
                  <p className="mb-1 font-medium text-slate-600">Opções do serviço</p>
                  {Object.entries(detalhe.pedido.solicitacao.opcoes as Record<string, unknown>).map(([k, v]) => (
                    <p key={k}><span className="text-slate-400">{k}:</span> {String(v ?? '')}</p>
                  ))}
                </div>
              ) : null}
              <BotaoVerFotos
                fotos={fotosSolicitacao(detalhe.pedido?.solicitacao?.fotos)}
                label="Fotos da solicitação"
                titulo="Fotos enviadas pelo cliente"
                className="mt-2"
              />
            </section>

            <section>
              <h4 className="mb-2 font-semibold text-primary-700">Execução</h4>
              <p>Etapa: {ETAPAS_OS.find((e) => e.key === detalhe.etapa)?.label || detalhe.etapa}</p>
              <p>Técnico: {detalhe.tecnico?.nome || detalhe.pedido?.agendamentos?.[0]?.tecnico?.nome || '—'}</p>
              <p>Parceiro: {detalhe.parceiro || '—'}</p>
              <p>Checklist: {detalhe.checklistCompleto ? 'Completo' : 'Pendente'}</p>
              {detalhe.garantiaId && <p>Garantia: emitida</p>}
              {detalhe.observacoes && <p className="text-slate-500">Obs: {detalhe.observacoes}</p>}
              {detalhe.createdAt && <p className="text-xs text-slate-400">Criada em {formatDate(detalhe.createdAt)}</p>}
            </section>

            {!!detalhe.pedido?.agendamentos?.length && (
              <section>
                <h4 className="mb-2 font-semibold text-primary-700">Agendamentos</h4>
                <ul className="space-y-2">
                  {detalhe.pedido.agendamentos.map((ag) => (
                    <li key={ag.id} className="rounded-lg border border-abs-gray px-3 py-2">
                      <p>{formatDate(ag.data)} · {ag.horarioInicio}–{ag.horarioFim}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {ag.status}{ag.tecnico ? ` · ${ag.tecnico.nome}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!!detalhe.pedido?.pagamentos?.length && (
              <section>
                <h4 className="mb-2 font-semibold text-primary-700">Pagamentos</h4>
                <ul className="space-y-2">
                  {detalhe.pedido.pagamentos.map((p) => (
                    <li key={p.id} className="flex justify-between rounded-lg border border-abs-gray px-3 py-2">
                      <span>{formatCurrency(p.valor)} · {p.metodo}</span>
                      <span className="text-xs text-slate-500">
                        {labelPagamento(p.status)}
                        {p.paymentDate ? ` · ${formatDate(p.paymentDate)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {detalhe.checklist && Object.keys(detalhe.checklist).length > 0 && (
              <section>
                <h4 className="mb-2 font-semibold text-primary-700">Checklist do técnico</h4>
                <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
                  {Object.entries(detalhe.checklist).map(([k, v]) => (
                    <p key={k}>
                      <span className="text-slate-400">{k}:</span>{' '}
                      {/^https?:\/\//i.test(v) ? (
                        <a href={v} target="_blank" rel="noreferrer" className="text-primary-600 underline">abrir</a>
                      ) : v || '—'}
                    </p>
                  ))}
                </div>
                <BotaoVerFotos
                  fotos={fotosDoChecklist(detalhe.checklist)}
                  label="Ver fotos do checklist"
                  titulo="Fotos da execução"
                  className="mt-2"
                />
              </section>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!checklistOs} onClose={() => setChecklistOs(null)} title="Checklist do Técnico">
        <p className="mb-3 text-sm text-slate-500">Todos os campos são obrigatórios para finalizar a OS e emitir garantia.</p>
        <Input label="URL Foto Antes" value={checklist.fotoAntes} onChange={(e) => setChecklist({ ...checklist, fotoAntes: e.target.value })} />
        <Input label="URL Foto Depois" value={checklist.fotoDepois} onChange={(e) => setChecklist({ ...checklist, fotoDepois: e.target.value })} />
        <Input label="Materiais utilizados" value={checklist.materiais} onChange={(e) => setChecklist({ ...checklist, materiais: e.target.value })} />
        <Input label="Observações" value={checklist.observacoes} onChange={(e) => setChecklist({ ...checklist, observacoes: e.target.value })} />
        <Input label="Assinatura digital do cliente" value={checklist.assinaturaCliente} onChange={(e) => setChecklist({ ...checklist, assinaturaCliente: e.target.value })} />
        <Button variant="cta" onClick={salvarChecklist} className="mt-2">Finalizar serviço</Button>
      </Modal>
    </div>
  );
}
