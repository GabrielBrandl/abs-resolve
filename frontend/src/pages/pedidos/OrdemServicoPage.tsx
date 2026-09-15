import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { osApi, agendamentoApi } from '../../services/modules.service';
import type { OrdemServico, OsMaterial, OsPendenciaTecnica } from '../../types';
import { ETAPAS_OS, formatCurrency, formatDate, formatEndereco, mapsLink } from '../../types';
import { PageHeader, Loading, Badge, Card, Button, Modal, Input, Select } from '../../components/ui';
import { BotaoVerFotos } from '../../components/GaleriaFotos';
import { RespostasQuestionario } from '../../components/RespostasQuestionario';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';

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

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
  const [materiais, setMateriais] = useState<OsMaterial[]>([]);
  const [pendencias, setPendencias] = useState<OsPendenciaTecnica[]>([]);
  const [custoPrevistoTotal, setCustoPrevistoTotal] = useState(0);
  const [ajusteManual, setAjusteManual] = useState(false);
  const [avisosSnapshot, setAvisosSnapshot] = useState<string[]>([]);
  const [aguardandoTecnica, setAguardandoTecnica] = useState(false);
  const [statusMateriais, setStatusMateriais] = useState('');
  const [carregandoMat, setCarregandoMat] = useState(false);
  const [novoMat, setNovoMat] = useState({ nome: '', quantidade: '1', unidade: 'unidade', custoUnitario: '', observacao: '' });
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);
  const [opcaoResolucao, setOpcaoResolucao] = useState('');
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));

  const carregar = () => {
    setLoading(true);
    osApi.listar(filtro ? { etapa: filtro } : undefined).then(setOrdens).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtro]);

  const carregarMateriais = async (osId: string) => {
    setCarregandoMat(true);
    try {
      const data = await osApi.materiais(osId);
      setMateriais(data.materiais || []);
      setPendencias(data.pendencias || []);
      setCustoPrevistoTotal(data.custoPrevistoTotal || 0);
      setAjusteManual(!!data.ajusteManual);
      setAguardandoTecnica(!!data.aguardandoConfirmacaoTecnica);
      setStatusMateriais(data.statusMateriais || '');
      const snap = data.snapshot as { avisos?: string[] } | null;
      setAvisosSnapshot(Array.isArray(snap?.avisos) ? snap.avisos : []);
    } catch {
      setMateriais([]);
      setPendencias([]);
      setCustoPrevistoTotal(0);
      setAjusteManual(false);
      setAguardandoTecnica(false);
      setStatusMateriais('');
      setAvisosSnapshot([]);
    } finally {
      setCarregandoMat(false);
    }
  };

  const abrirDetalhe = async (os: OrdemServico) => {
    setDetalhe(os);
    setNovoMat({ nome: '', quantidade: '1', unidade: 'unidade', custoUnitario: '', observacao: '' });
    await carregarMateriais(os.id);
  };

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

  const regenerar = async () => {
    if (!detalhe) return;
    if (!confirm('Regenerar materiais automáticos a partir das receitas? Linhas manuais/ajustadas podem ser afetadas nas automáticas.')) return;
    try {
      await osApi.regenerarMateriais(detalhe.id);
      toast('Materiais regenerados', 'success');
      await carregarMateriais(detalhe.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const adicionarLinha = async () => {
    if (!detalhe || !novoMat.nome.trim()) {
      toast('Informe o nome do material', 'error');
      return;
    }
    try {
      await osApi.adicionarMaterial(detalhe.id, {
        nome: novoMat.nome.trim(),
        quantidade: Number(novoMat.quantidade) || 1,
        unidade: novoMat.unidade,
        custoUnitario: novoMat.custoUnitario ? Number(novoMat.custoUnitario) : null,
        observacao: novoMat.observacao || undefined,
      });
      setNovoMat({ nome: '', quantidade: '1', unidade: 'unidade', custoUnitario: '', observacao: '' });
      toast('Material adicionado', 'success');
      await carregarMateriais(detalhe.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const atualizarQtd = async (m: OsMaterial, quantidade: number) => {
    if (!(quantidade > 0)) return;
    try {
      await osApi.atualizarMaterial(m.id, { quantidade });
      if (detalhe) await carregarMateriais(detalhe.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const removerLinha = async (id: string) => {
    if (!confirm('Remover este material da OS?')) return;
    try {
      await osApi.removerMaterial(id);
      if (detalhe) await carregarMateriais(detalhe.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const resolverPendencia = async (p: OsPendenciaTecnica) => {
    if (!opcaoResolucao) {
      toast('Selecione Inverter ou Convencional (ou a opção configurada)', 'error');
      return;
    }
    try {
      await osApi.resolverPendencia(p.id, { opcaoId: opcaoResolucao });
      toast('Pendência resolvida — materiais regenerados', 'success');
      setResolvendoId(null);
      setOpcaoResolucao('');
      if (detalhe) await carregarMateriais(detalhe.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const opcoesPendencia = (p: OsPendenciaTecnica) => {
    if (!Array.isArray(p.opcoesResolucao)) return [];
    return p.opcoesResolucao as Array<{ id: string; label: string }>;
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
                  <Button variant="secondary" onClick={() => void abrirDetalhe(os)}>Ver detalhes</Button>
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
              <RespostasQuestionario opcoes={detalhe.pedido?.solicitacao?.opcoes} />
              <BotaoVerFotos
                fotos={fotosSolicitacao(detalhe.pedido?.solicitacao?.fotos)}
                label="Fotos da solicitação"
                titulo="Fotos enviadas pelo cliente"
                className="mt-2"
              />
            </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-primary-800">Materiais para execução</h4>
                <div className="flex gap-1">
                  {isAdmin && (
                    <Button variant="secondary" onClick={() => void regenerar()}>
                      Regenerar
                    </Button>
                  )}
                </div>
              </div>
              <p className="mb-2 text-xs text-slate-500">
                Lista interna (não aparece para o cliente).
                {ajusteManual ? ' · Ajustes manuais registrados.' : ''}
              </p>
              {(aguardandoTecnica || statusMateriais) && (
                <p className="mb-2 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-900">
                  Status: {statusMateriais || 'Aguardando confirmação técnica'}
                </p>
              )}

              {pendencias.length > 0 && (
                <div className="mb-3 space-y-2">
                  {pendencias.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        p.status === 'pendente' ? 'border-amber-300 bg-white' : 'border-emerald-200 bg-emerald-50'
                      }`}
                    >
                      <p className="font-semibold text-slate-800">
                        {p.status === 'pendente' ? '⚠️ ' : '✓ '}
                        {p.titulo}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-600">{p.mensagem}</p>
                      {p.status === 'pendente' ? (
                        <p className="mt-1 font-medium text-amber-800">Aguardando confirmação técnica</p>
                      ) : (
                        <p className="mt-1 text-emerald-700">
                          Resolvida: {p.resolucaoOpcaoLabel || p.resolucaoOpcaoId}
                          {p.resolvidoEm ? ` · ${formatDate(p.resolvidoEm)}` : ''}
                        </p>
                      )}
                      {p.status === 'pendente' && (
                        <div className="mt-2 space-y-2">
                          {resolvendoId === p.id ? (
                            <>
                              <Select
                                label="Confirmar tecnologia / opção"
                                value={opcaoResolucao}
                                onChange={(e) => setOpcaoResolucao(e.target.value)}
                              >
                                <option value="">Selecione</option>
                                {opcoesPendencia(p).map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </Select>
                              <div className="flex gap-2">
                                <Button variant="cta" onClick={() => void resolverPendencia(p)}>
                                  Confirmar e regenerar materiais
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setResolvendoId(null);
                                    setOpcaoResolucao('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button
                              variant="cta"
                              onClick={() => {
                                setResolvendoId(p.id);
                                setOpcaoResolucao('');
                              }}
                            >
                              Resolver pendência
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {avisosSnapshot.map((a) => (
                <p key={a} className="mb-1 text-xs text-amber-800">{a}</p>
              ))}
              {carregandoMat ? (
                <p className="text-xs text-slate-400">Carregando materiais…</p>
              ) : (
                <>
                  <ul className="mb-3 space-y-1">
                    {materiais.map((m) => (
                      <li key={m.id} className="rounded-lg border border-white bg-white px-2 py-1.5 text-xs">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{m.nome}</p>
                            {(m.especificacao || m.bitolaModelo) && (
                              <p className="text-slate-500">
                                {[m.especificacao, m.bitolaModelo].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            <p className="text-slate-400">
                              {m.origem}
                              {m.observacao ? ` · ${m.observacao}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0.01}
                                step={0.01}
                                className="w-20 rounded border px-1 py-0.5 text-right"
                                defaultValue={num(m.quantidade)}
                                onBlur={(e) => {
                                  const q = Number(e.target.value);
                                  if (q !== num(m.quantidade)) void atualizarQtd(m, q);
                                }}
                              />
                              <span>{m.unidade}</span>
                            </div>
                            {m.custoPrevisto != null && (
                              <p className="mt-0.5 text-slate-600">{formatCurrency(num(m.custoPrevisto))}</p>
                            )}
                            <button type="button" className="text-red-600" onClick={() => void removerLinha(m.id)}>
                              Remover
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                    {!materiais.length && (
                      <p className="text-xs text-slate-400">
                        {aguardandoTecnica
                          ? 'Materiais bloqueados até resolver a pendência técnica.'
                          : 'Nenhum material gerado. Cadastre receitas no catálogo ou adicione manualmente.'}
                      </p>
                    )}
                  </ul>
                  <p className="mb-3 text-sm font-bold text-primary-800">
                    Custo previsto total: {formatCurrency(custoPrevistoTotal)}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input label="Adicionar material" value={novoMat.nome} onChange={(e) => setNovoMat({ ...novoMat, nome: e.target.value })} />
                    <Input label="Qtd" type="number" min={0.01} step={0.01} value={novoMat.quantidade} onChange={(e) => setNovoMat({ ...novoMat, quantidade: e.target.value })} />
                    <Select label="Unidade" value={novoMat.unidade} onChange={(e) => setNovoMat({ ...novoMat, unidade: e.target.value })}>
                      {['metro', 'unidade', 'rolo', 'kit', 'peca', 'pacote'].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </Select>
                    <Input label="Custo unit. (opcional)" type="number" step={0.01} value={novoMat.custoUnitario} onChange={(e) => setNovoMat({ ...novoMat, custoUnitario: e.target.value })} />
                  </div>
                  <Button variant="cta" className="mt-2" onClick={() => void adicionarLinha()}>
                    Adicionar à OS
                  </Button>
                </>
              )}
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
