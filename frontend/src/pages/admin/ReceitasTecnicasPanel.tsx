import { useEffect, useState } from 'react';
import { catalogoAdminApi, fluxoAdminApi } from '../../services/modules.service';
import type { FluxoConfigAdmin, FluxoPerguntaConfig, ReceitaMaterial, ReceitaTecnica } from '../../types';
import { Button, Input, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

const TIPOS_CALC = [
  { value: 'metragem', label: 'Metragem (valor × fator)' },
  { value: 'quantidade', label: 'Quantidade (valor × fator)' },
  { value: 'fixo', label: 'Fixo (por OS ou por unidade)' },
  { value: 'bloco', label: 'Bloco (ceil(var/X)×Y)' },
];

const UNIDADES = ['metro', 'unidade', 'rolo', 'kit', 'peca', 'pacote'];

function asIds(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

function asOpcoesResolucao(v: unknown): Array<{ id: string; label: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      const o = x as Record<string, unknown>;
      const id = String(o.id || '').trim();
      if (!id) return null;
      return { id, label: String(o.label || id) };
    })
    .filter((x): x is { id: string; label: string } => Boolean(x));
}

type Props = {
  servicoId: string;
  servicoSlug: string;
  isAdmin: boolean;
};

const materialVazio = {
  nome: '',
  especificacao: '',
  bitolaModelo: '',
  unidade: 'unidade',
  tipoCalculo: 'fixo',
  fator: '1',
  perguntaRefId: '',
  blocoX: '',
  blocoY: '',
  fixoEscopo: 'por_os',
  quantidadeFixa: '1',
  observacaoInterna: '',
  custoUnitario: '',
  consumivelOperacional: false,
};

const formVazio = {
  nome: '',
  tipo: 'materiais',
  ativo: true,
  perguntaFornecimentoId: '',
  opcoesAbsFornece: [] as string[],
  pendenciaTitulo: '',
  pendenciaMensagem: '',
  pendenciaBloquearMateriais: true,
  perguntaResolucaoId: '',
  opcoesResolucao: [] as Array<{ id: string; label: string }>,
  condicoes: [] as Array<{ perguntaId: string; opcaoIds: string[] }>,
};

export function ReceitasTecnicasPanel({ servicoId, servicoSlug, isAdmin }: Props) {
  const { toast } = useToast();
  const [receitas, setReceitas] = useState<ReceitaTecnica[]>([]);
  const [fluxo, setFluxo] = useState<FluxoConfigAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [novaNome, setNovaNome] = useState('');
  const [novaTipo, setNovaTipo] = useState('materiais');
  const [editId, setEditId] = useState<string | null>(null);
  const [formReceita, setFormReceita] = useState(formVazio);
  const [matForm, setMatForm] = useState(materialVazio);
  const [editMatId, setEditMatId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const perguntas: FluxoPerguntaConfig[] = fluxo?.perguntas || [];
  const isPendencia = formReceita.tipo === 'pendencia_tecnica';
  const perguntaForn = perguntas.find((p) => p.id === formReceita.perguntaFornecimentoId);
  const perguntaRes = perguntas.find((p) => p.id === formReceita.perguntaResolucaoId);

  const carregar = async () => {
    setLoading(true);
    try {
      const list = await catalogoAdminApi.receitas(servicoId);
      setReceitas(list);
      if (servicoSlug) {
        try {
          setFluxo(await fluxoAdminApi.obter(servicoSlug));
        } catch {
          setFluxo(null);
        }
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao carregar receitas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [servicoId, servicoSlug]);

  const abrirEdicao = (r: ReceitaTecnica) => {
    setEditId(r.id);
    setFormReceita({
      nome: r.nome,
      tipo: r.tipo || 'materiais',
      ativo: r.ativo,
      perguntaFornecimentoId: r.perguntaFornecimentoId || '',
      opcoesAbsFornece: asIds(r.opcoesAbsFornece),
      pendenciaTitulo: r.pendenciaTitulo || '',
      pendenciaMensagem: r.pendenciaMensagem || '',
      pendenciaBloquearMateriais: r.pendenciaBloquearMateriais !== false,
      perguntaResolucaoId: r.perguntaResolucaoId || '',
      opcoesResolucao: asOpcoesResolucao(r.opcoesResolucao),
      condicoes: (r.condicoes || []).map((c) => ({
        perguntaId: c.perguntaId,
        opcaoIds: asIds(c.opcaoIds),
      })),
    });
    setMatForm(materialVazio);
    setEditMatId(null);
  };

  const criar = async () => {
    if (!novaNome.trim()) {
      toast('Informe o nome da receita', 'error');
      return;
    }
    setSalvando(true);
    try {
      const r = await catalogoAdminApi.criarReceita(servicoId, {
        nome: novaNome.trim(),
        tipo: novaTipo,
        ativo: true,
        pendenciaTitulo: novaTipo === 'pendencia_tecnica' ? novaNome.trim() : undefined,
        pendenciaBloquearMateriais: true,
      });
      setNovaNome('');
      setNovaTipo('materiais');
      toast('Receita criada', 'success');
      await carregar();
      abrirEdicao(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const salvarReceita = async () => {
    if (!editId) return;
    if (isPendencia && !formReceita.pendenciaTitulo.trim()) {
      toast('Informe o título da pendência', 'error');
      return;
    }
    setSalvando(true);
    try {
      await catalogoAdminApi.atualizarReceita(editId, {
        nome: formReceita.nome,
        tipo: formReceita.tipo,
        ativo: formReceita.ativo,
        perguntaFornecimentoId: formReceita.perguntaFornecimentoId || null,
        opcoesAbsFornece: formReceita.opcoesAbsFornece,
        pendenciaTitulo: formReceita.pendenciaTitulo || null,
        pendenciaMensagem: formReceita.pendenciaMensagem || null,
        pendenciaBloquearMateriais: formReceita.pendenciaBloquearMateriais,
        perguntaResolucaoId: formReceita.perguntaResolucaoId || null,
        opcoesResolucao: formReceita.opcoesResolucao,
        condicoes: formReceita.condicoes.filter((c) => c.perguntaId && c.opcaoIds.length),
      });
      toast('Receita salva', 'success');
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const duplicar = async (id: string) => {
    try {
      const r = await catalogoAdminApi.duplicarReceita(id);
      toast('Receita duplicada (inativa)', 'success');
      await carregar();
      abrirEdicao(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const salvarMaterial = async () => {
    if (!editId) return;
    if (!matForm.nome.trim()) {
      toast('Informe o nome do material', 'error');
      return;
    }
    const body = {
      nome: matForm.nome.trim(),
      especificacao: matForm.especificacao || null,
      bitolaModelo: matForm.bitolaModelo || null,
      unidade: matForm.unidade,
      tipoCalculo: matForm.tipoCalculo,
      fator: Number(matForm.fator) || 1,
      perguntaRefId: matForm.perguntaRefId || null,
      blocoX: matForm.blocoX ? Number(matForm.blocoX) : null,
      blocoY: matForm.blocoY ? Number(matForm.blocoY) : null,
      fixoEscopo: matForm.tipoCalculo === 'fixo' ? matForm.fixoEscopo : null,
      quantidadeFixa: matForm.quantidadeFixa ? Number(matForm.quantidadeFixa) : null,
      observacaoInterna: matForm.observacaoInterna || null,
      custoUnitario: matForm.custoUnitario ? Number(matForm.custoUnitario) : null,
      consumivelOperacional: matForm.consumivelOperacional,
    };
    setSalvando(true);
    try {
      if (editMatId) {
        await catalogoAdminApi.atualizarMaterialReceita(editMatId, body);
        toast('Material atualizado', 'success');
      } else {
        await catalogoAdminApi.adicionarMaterialReceita(editId, body);
        toast('Material adicionado', 'success');
      }
      setMatForm(materialVazio);
      setEditMatId(null);
      await carregar();
      const atual = (await catalogoAdminApi.receitas(servicoId)).find((x) => x.id === editId);
      if (atual) abrirEdicao(atual);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const editarMaterial = (m: ReceitaMaterial) => {
    setEditMatId(m.id);
    setMatForm({
      nome: m.nome,
      especificacao: m.especificacao || '',
      bitolaModelo: m.bitolaModelo || '',
      unidade: m.unidade || 'unidade',
      tipoCalculo: m.tipoCalculo,
      fator: String(m.fator ?? 1),
      perguntaRefId: m.perguntaRefId || '',
      blocoX: m.blocoX != null ? String(m.blocoX) : '',
      blocoY: m.blocoY != null ? String(m.blocoY) : '',
      fixoEscopo: m.fixoEscopo || 'por_os',
      quantidadeFixa: m.quantidadeFixa != null ? String(m.quantidadeFixa) : '1',
      observacaoInterna: m.observacaoInterna || '',
      custoUnitario: m.custoUnitario != null ? String(m.custoUnitario) : '',
      consumivelOperacional: m.consumivelOperacional === true,
    });
  };

  const removerMaterial = async (id: string) => {
    if (!confirm('Desativar este material da receita?')) return;
    try {
      await catalogoAdminApi.removerMaterialReceita(id);
      toast('Material desativado', 'success');
      await carregar();
      if (editId) {
        const atual = (await catalogoAdminApi.receitas(servicoId)).find((x) => x.id === editId);
        if (atual) abrirEdicao(atual);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const sincronizarOpcoesResolucao = (perguntaId: string) => {
    const p = perguntas.find((x) => x.id === perguntaId);
    setFormReceita((f) => ({
      ...f,
      perguntaResolucaoId: perguntaId,
      opcoesResolucao: (p?.opcoes || [])
        .filter((o) => o.id !== 'nao-sei')
        .map((o) => ({ id: o.id, label: o.label })),
    }));
  };

  const receitaEdit = receitas.find((r) => r.id === editId);

  if (loading) return <p className="text-sm text-slate-500">Carregando receitas…</p>;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-bold text-primary-800">Receitas Técnicas</h3>
      <p className="mb-3 text-xs text-slate-500">
        Interno/operacional. Materiais para execução ou pendências técnicas na OS. Não altera preço nem checkout.
      </p>

      {isAdmin && (
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Input label="Nova receita" value={novaNome} onChange={(e) => setNovaNome(e.target.value)} placeholder="Ex: Pendência tecnologia AR" />
          <Select label="Tipo da receita" value={novaTipo} onChange={(e) => setNovaTipo(e.target.value)}>
            <option value="materiais">Materiais para execução</option>
            <option value="pendencia_tecnica">Pendência técnica</option>
          </Select>
          <div className="flex items-end">
            <Button variant="cta" disabled={salvando} onClick={() => void criar()}>
              Criar
            </Button>
          </div>
        </div>
      )}

      <div className="mb-3 space-y-1">
        {receitas.map((r) => (
          <div
            key={r.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm ${
              editId === r.id ? 'border-primary-400' : 'border-slate-200'
            }`}
          >
            <div>
              <span className="font-medium">{r.nome}</span>
              <span className="ml-2 text-xs text-slate-500">
                {r.tipo === 'pendencia_tecnica' ? 'Pendência técnica' : 'Materiais'} ·{' '}
                {r.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="secondary" onClick={() => abrirEdicao(r)}>
                {editId === r.id ? 'Editando' : 'Editar'}
              </Button>
              {isAdmin && (
                <Button variant="secondary" onClick={() => void duplicar(r.id)}>
                  Duplicar
                </Button>
              )}
            </div>
          </div>
        ))}
        {!receitas.length && <p className="text-xs text-slate-400">Nenhuma receita cadastrada para este serviço.</p>}
      </div>

      {editId && receitaEdit && (
        <div className="space-y-3 rounded-lg border border-primary-200 bg-white p-3">
          <Input label="Nome" value={formReceita.nome} onChange={(e) => setFormReceita((f) => ({ ...f, nome: e.target.value }))} disabled={!isAdmin} />
          <Select
            label="Tipo da receita"
            value={formReceita.tipo}
            disabled={!isAdmin}
            onChange={(e) => setFormReceita((f) => ({ ...f, tipo: e.target.value }))}
          >
            <option value="materiais">Materiais para execução</option>
            <option value="pendencia_tecnica">Pendência técnica</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formReceita.ativo}
              disabled={!isAdmin}
              onChange={(e) => setFormReceita((f) => ({ ...f, ativo: e.target.checked }))}
            />
            Receita ativa
          </label>

          {isPendencia ? (
            <>
              <Input
                label="Título da pendência *"
                value={formReceita.pendenciaTitulo}
                disabled={!isAdmin}
                onChange={(e) => setFormReceita((f) => ({ ...f, pendenciaTitulo: e.target.value }))}
                placeholder="Ex: Tecnologia do aparelho a confirmar"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-primary-700">Mensagem interna</label>
                <textarea
                  className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                  rows={3}
                  disabled={!isAdmin}
                  value={formReceita.pendenciaMensagem}
                  onChange={(e) => setFormReceita((f) => ({ ...f, pendenciaMensagem: e.target.value }))}
                  placeholder="Ex.: Cliente informou BTUs mas não soube se é Inverter ou Convencional…"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formReceita.pendenciaBloquearMateriais}
                  disabled={!isAdmin}
                  onChange={(e) => setFormReceita((f) => ({ ...f, pendenciaBloquearMateriais: e.target.checked }))}
                />
                Bloquear compra/separação de materiais até resolver?
              </label>
              <Select
                label="Pergunta a confirmar ao resolver"
                value={formReceita.perguntaResolucaoId}
                disabled={!isAdmin}
                onChange={(e) => sincronizarOpcoesResolucao(e.target.value)}
              >
                <option value="">Selecione</option>
                {perguntas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} ({p.id})
                  </option>
                ))}
              </Select>
              {perguntaRes && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">
                    Opções de resolução (admin escolhe ao clicar em Resolver)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formReceita.opcoesResolucao.map((o) => (
                      <span key={o.id} className="rounded border px-2 py-1 text-xs">
                        {o.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Select
                label="Pergunta de fornecimento (ABS vs cliente)"
                value={formReceita.perguntaFornecimentoId}
                disabled={!isAdmin}
                onChange={(e) =>
                  setFormReceita((f) => ({
                    ...f,
                    perguntaFornecimentoId: e.target.value,
                    opcoesAbsFornece: [],
                  }))
                }
              >
                <option value="">Não configurar (sempre gera tudo)</option>
                {perguntas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} ({p.id})
                  </option>
                ))}
              </Select>
              {perguntaForn && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Opções que significam “ABS fornece”</p>
                  <div className="flex flex-wrap gap-2">
                    {perguntaForn.opcoes.map((o) => {
                      const checked = formReceita.opcoesAbsFornece.includes(o.id);
                      return (
                        <label key={o.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={checked}
                            onChange={() =>
                              setFormReceita((f) => ({
                                ...f,
                                opcoesAbsFornece: checked
                                  ? f.opcoesAbsFornece.filter((x) => x !== o.id)
                                  : [...f.opcoesAbsFornece, o.id],
                              }))
                            }
                          />
                          {o.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600">Condições (AND)</p>
              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setFormReceita((f) => ({
                      ...f,
                      condicoes: [...f.condicoes, { perguntaId: '', opcaoIds: [] }],
                    }))
                  }
                >
                  + Condição
                </Button>
              )}
            </div>
            {formReceita.condicoes.map((c, idx) => {
              const p = perguntas.find((x) => x.id === c.perguntaId);
              return (
                <div key={idx} className="mb-2 rounded border border-slate-100 p-2">
                  <Select
                    label="Pergunta"
                    value={c.perguntaId}
                    disabled={!isAdmin}
                    onChange={(e) => {
                      const next = [...formReceita.condicoes];
                      next[idx] = { perguntaId: e.target.value, opcaoIds: [] };
                      setFormReceita((f) => ({ ...f, condicoes: next }));
                    }}
                  >
                    <option value="">Selecione</option>
                    {perguntas.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.titulo}
                      </option>
                    ))}
                  </Select>
                  {p && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.opcoes.map((o) => {
                        const checked = c.opcaoIds.includes(o.id);
                        return (
                          <label key={o.id} className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              disabled={!isAdmin}
                              checked={checked}
                              onChange={() => {
                                const next = [...formReceita.condicoes];
                                next[idx] = {
                                  ...c,
                                  opcaoIds: checked
                                    ? c.opcaoIds.filter((x) => x !== o.id)
                                    : [...c.opcaoIds, o.id],
                                };
                                setFormReceita((f) => ({ ...f, condicoes: next }));
                              }}
                            />
                            {o.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-red-600"
                      onClick={() =>
                        setFormReceita((f) => ({
                          ...f,
                          condicoes: f.condicoes.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      Remover condição
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <Button variant="cta" disabled={salvando} onClick={() => void salvarReceita()}>
              Salvar receita
            </Button>
          )}

          {!isPendencia && (
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-semibold text-primary-800">Materiais da receita</p>
              <ul className="mb-3 space-y-1 text-xs">
                {(receitaEdit.materiais || [])
                  .filter((m) => m.ativo !== false)
                  .map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5">
                      <span>
                        <strong>{m.nome}</strong>
                        {m.especificacao ? ` · ${m.especificacao}` : ''} · {m.tipoCalculo}
                      </span>
                      {isAdmin && (
                        <span className="flex gap-1">
                          <button type="button" className="text-primary-600" onClick={() => editarMaterial(m)}>
                            Editar
                          </button>
                          <button type="button" className="text-red-600" onClick={() => void removerMaterial(m.id)}>
                            Remover
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              {isAdmin && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input label="Nome do material *" value={matForm.nome} onChange={(e) => setMatForm({ ...matForm, nome: e.target.value })} />
                  <Input label="Especificação" value={matForm.especificacao} onChange={(e) => setMatForm({ ...matForm, especificacao: e.target.value })} />
                  <Select label="Unidade" value={matForm.unidade} onChange={(e) => setMatForm({ ...matForm, unidade: e.target.value })}>
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                  <Select label="Tipo de cálculo" value={matForm.tipoCalculo} onChange={(e) => setMatForm({ ...matForm, tipoCalculo: e.target.value })}>
                    {TIPOS_CALC.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                  <Input label="Fator" type="number" step="0.01" value={matForm.fator} onChange={(e) => setMatForm({ ...matForm, fator: e.target.value })} />
                  {(matForm.tipoCalculo === 'metragem' ||
                    matForm.tipoCalculo === 'quantidade' ||
                    matForm.tipoCalculo === 'bloco') && (
                    <Select
                      label="Pergunta de referência"
                      value={matForm.perguntaRefId}
                      onChange={(e) => setMatForm({ ...matForm, perguntaRefId: e.target.value })}
                    >
                      <option value="">Padrão</option>
                      {perguntas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.titulo}
                        </option>
                      ))}
                    </Select>
                  )}
                  {matForm.tipoCalculo === 'fixo' && (
                    <>
                      <Select label="Escopo fixo" value={matForm.fixoEscopo} onChange={(e) => setMatForm({ ...matForm, fixoEscopo: e.target.value })}>
                        <option value="por_os">Por OS</option>
                        <option value="por_unidade">Por unidade</option>
                      </Select>
                      <Input label="Qtd fixa" type="number" value={matForm.quantidadeFixa} onChange={(e) => setMatForm({ ...matForm, quantidadeFixa: e.target.value })} />
                    </>
                  )}
                  {matForm.tipoCalculo === 'bloco' && (
                    <>
                      <Input label="Bloco X" type="number" value={matForm.blocoX} onChange={(e) => setMatForm({ ...matForm, blocoX: e.target.value })} />
                      <Input label="Bloco Y" type="number" value={matForm.blocoY} onChange={(e) => setMatForm({ ...matForm, blocoY: e.target.value })} />
                    </>
                  )}
                  <Input label="Custo unit. (R$)" type="number" value={matForm.custoUnitario} onChange={(e) => setMatForm({ ...matForm, custoUnitario: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={matForm.consumivelOperacional}
                      onChange={(e) => setMatForm({ ...matForm, consumivelOperacional: e.target.checked })}
                    />
                    Consumível operacional
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button variant="cta" disabled={salvando} onClick={() => void salvarMaterial()}>
                      {editMatId ? 'Atualizar material' : 'Adicionar material'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
