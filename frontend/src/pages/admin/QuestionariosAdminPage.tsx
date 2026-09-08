import { useEffect, useState } from 'react';
import { fluxoAdminApi } from '../../services/modules.service';
import type { FluxoConfigAdmin, FluxoPerguntaConfig, PrecoCompostoConfig } from '../../types';
import { PageHeader, Loading, Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

function novaPergunta(): FluxoPerguntaConfig {
  const id = `pergunta-${Date.now()}`;
  return {
    id,
    titulo: 'Nova pergunta',
    opcoes: [
      { id: 'opcao-1', label: 'Opção 1' },
      { id: 'opcao-2', label: 'Opção 2' },
    ],
  };
}

function precoCompostoVazio(): PrecoCompostoConfig {
  return {
    ativo: false,
    perguntaCapacidadeId: '',
    perguntaMetrosId: '',
    perguntaFornecimentoId: '',
    opcoesAbsFornece: [],
    mapaMetrosOpcao: {},
    metrosInclusosPadrao: 3,
    faixas: [],
  };
}

function sincronizarFaixas(
  config: FluxoConfigAdmin,
  composto: PrecoCompostoConfig
): PrecoCompostoConfig {
  const pergunta = config.perguntas.find((p) => p.id === composto.perguntaCapacidadeId);
  if (!pergunta) return composto;
  const prev = new Map(composto.faixas.map((f) => [f.opcaoId, f]));
  return {
    ...composto,
    faixas: pergunta.opcoes.map((op) => {
      const existente = prev.get(op.id);
      return {
        opcaoId: op.id,
        label: op.label,
        ajusteCapacidade: existente?.ajusteCapacidade ?? 0,
        valorKitInicial: existente?.valorKitInicial ?? 0,
        metrosInclusos: existente?.metrosInclusos ?? composto.metrosInclusosPadrao ?? 2,
        precoPorMetroExtra: existente?.precoPorMetroExtra ?? 0,
      };
    }),
  };
}

export function QuestionariosAdminPage() {
  const { toast } = useToast();
  const [lista, setLista] = useState<Array<{ slug: string; nome: string; totalPerguntas: number; modoPreco: string }>>([]);
  const [slugAtivo, setSlugAtivo] = useState('');
  const [config, setConfig] = useState<FluxoConfigAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarLista = () => {
    setLoading(true);
    fluxoAdminApi
      .listar()
      .then(setLista)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregarLista();
  }, []);

  useEffect(() => {
    if (!slugAtivo) return;
    fluxoAdminApi.obter(slugAtivo).then(setConfig).catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'error'));
  }, [slugAtivo, toast]);

  const salvar = async () => {
    if (!config) return;
    setSalvando(true);
    try {
      const atualizado = await fluxoAdminApi.atualizar(config.slug, {
        perguntas: config.perguntas,
        fotosObrigatorias: config.fotosObrigatorias,
        regrasValidacao: config.regrasValidacao,
        modoPreco: config.modoPreco,
        precoBase: config.precoBase,
        itensPreco: config.itensPreco,
        precoComposto: config.precoComposto,
        perguntaQuantidadeId: config.perguntaQuantidadeId,
        multiplicarBasePorQuantidade: config.multiplicarBasePorQuantidade,
      });
      setConfig(atualizado);
      toast('Questionário salvo!', 'success');
      carregarLista();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const restaurar = async () => {
    if (!config || !confirm(`Restaurar "${config.nome}" para o padrão do sistema?`)) return;
    setSalvando(true);
    try {
      const restaurado = await fluxoAdminApi.restaurar(config.slug);
      setConfig(restaurado);
      toast('Questionário restaurado', 'success');
      carregarLista();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const atualizarPergunta = (idx: number, patch: Partial<FluxoPerguntaConfig>) => {
    if (!config) return;
    const perguntas = [...config.perguntas];
    perguntas[idx] = { ...perguntas[idx], ...patch };
    setConfig({ ...config, perguntas });
  };

  const removerPergunta = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, perguntas: config.perguntas.filter((_, i) => i !== idx) });
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Questionários de Serviço"
        subtitle="Edite perguntas e valores — apenas administradores"
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-0">
          <p className="border-b px-4 py-3 text-sm font-semibold text-primary-800">Serviços</p>
          <ul className="max-h-[70vh] overflow-y-auto">
            {lista.map((item) => (
              <li key={item.slug}>
                <button
                  type="button"
                  onClick={() => setSlugAtivo(item.slug)}
                  className={`w-full border-b px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                    slugAtivo === item.slug ? 'bg-primary-50 font-semibold text-primary-800' : 'text-slate-600'
                  }`}
                >
                  <span className="block">{item.nome}</span>
                  <span className="text-xs text-slate-400">
                    {item.totalPerguntas} perguntas · {item.modoPreco === 'personalizado' ? 'preços custom' : 'preços padrão'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {!config ? (
          <Card>
            <p className="text-slate-500">Selecione um serviço para editar o questionário.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-primary-800">{config.nome}</h2>
                  <p className="text-xs text-slate-500">Slug: {config.slug}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={restaurar} disabled={salvando}>
                    Restaurar padrão
                  </Button>
                  <Button variant="cta" onClick={salvar} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Modo de preço</span>
                  <select
                    value={config.modoPreco}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modoPreco: e.target.value as 'padrao' | 'personalizado',
                      })
                    }
                    className="w-full rounded-lg border border-abs-gray px-3 py-2"
                  >
                    <option value="padrao">Padrão do sistema (tabela atual)</option>
                    <option value="personalizado">Personalizado (valores abaixo)</option>
                  </select>
                </label>
                {config.modoPreco === 'personalizado' && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      Preço-base / mão de obra (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                      value={config.precoBase ?? ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          precoBase: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      Só mão de obra da instalação. Não inclui kit nem metros de material.
                    </span>
                  </label>
                )}
              </div>

              {config.modoPreco === 'personalizado' && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Pergunta da quantidade</span>
                    <select
                      className="w-full rounded-lg border border-abs-gray px-3 py-2"
                      value={config.perguntaQuantidadeId || 'quantidade'}
                      onChange={(e) => setConfig({ ...config, perguntaQuantidadeId: e.target.value })}
                    >
                      {config.perguntas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.titulo} ({p.id})
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs text-slate-500">
                      Essa resposta vira o multiplicador (ex.: 4 tomadas).
                    </span>
                  </label>
                  <label className="flex items-start gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={config.multiplicarBasePorQuantidade !== false}
                      onChange={(e) =>
                        setConfig({ ...config, multiplicarBasePorQuantidade: e.target.checked })
                      }
                    />
                    <span>
                      <span className="block font-medium text-slate-700">Multiplicar preço base pela quantidade</span>
                      <span className="text-xs text-slate-500">Ex.: R$ 89 × 3 tomadas = R$ 267</span>
                    </span>
                  </label>
                </div>
              )}

              <div className="mb-6 rounded-xl border border-[#c7d7ef] bg-[#f4f8ff] p-4">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(config.precoComposto?.ativo)}
                    onChange={(e) => {
                      const base = config.precoComposto || precoCompostoVazio();
                      let next: PrecoCompostoConfig = {
                        ...base,
                        ativo: e.target.checked,
                        perguntaCapacidadeId: base.perguntaCapacidadeId || 'capacidadeBtu',
                        perguntaMetrosId: base.perguntaMetrosId || 'distanciaEvapCond',
                        perguntaFornecimentoId: base.perguntaFornecimentoId || 'materiaisInstalacaoAr',
                        opcoesAbsFornece: base.opcoesAbsFornece?.length
                          ? base.opcoesAbsFornece
                          : ['abs-fornece-kit'],
                        mapaMetrosOpcao: base.mapaMetrosOpcao || {
                          'ate-2m': 2,
                          'ate-3m': 3,
                          '3m-5m': 5,
                          '5m-7m': 7,
                          'acima-7m': 8,
                          'nao-sei': 2,
                        },
                        metrosInclusosPadrao: base.metrosInclusosPadrao ?? 2,
                        labelMaterialIncluso: 'Metros inclusos no kit de material',
                      };
                      if (e.target.checked) {
                        next = sincronizarFaixas(config, next);
                        setConfig({
                          ...config,
                          modoPreco: 'personalizado',
                          multiplicarBasePorQuantidade: false,
                          precoComposto: next,
                        });
                      } else {
                        setConfig({ ...config, precoComposto: next });
                      }
                    }}
                  />
                  <span>
                    <span className="block font-bold text-[#002d62]">
                      Preço composto — mão de obra × material (capacidade + metragem + fornecimento)
                    </span>
                    <span className="text-xs text-slate-600">
                      Fórmula: mão de obra (preço-base + ajustes) + kit ABS + metros adicionais + outros
                      adicionais. Material só entra se a ABS fornecer.
                    </span>
                  </span>
                </label>

                {config.precoComposto?.ativo && (
                  <div className="mt-4 space-y-5">
                    <div className="rounded-lg border border-[#dbe7f5] bg-white p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#002d62]">
                        1. Perguntas do cálculo
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Pergunta da capacidade</span>
                        <select
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 bg-white"
                          value={config.precoComposto.perguntaCapacidadeId}
                          onChange={(e) => {
                            const next = sincronizarFaixas(config, {
                              ...config.precoComposto!,
                              perguntaCapacidadeId: e.target.value,
                            });
                            setConfig({ ...config, precoComposto: next });
                          }}
                        >
                          {config.perguntas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.titulo}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Pergunta da metragem</span>
                        <select
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 bg-white"
                          value={config.precoComposto.perguntaMetrosId}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              precoComposto: { ...config.precoComposto!, perguntaMetrosId: e.target.value },
                            })
                          }
                        >
                          {config.perguntas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.titulo}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">
                          Pergunta do fornecimento do material
                        </span>
                        <select
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 bg-white"
                          value={config.precoComposto.perguntaFornecimentoId || ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              precoComposto: {
                                ...config.precoComposto!,
                                perguntaFornecimentoId: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Selecione…</option>
                          {config.perguntas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.titulo}
                            </option>
                          ))}
                        </select>
                      </label>
                      </div>

                    {config.precoComposto.perguntaFornecimentoId && (
                      <div className="mt-3">
                        <p className="mb-2 text-sm font-medium text-slate-700">
                          Opções = ABS fornece material (cobra kit + metros)
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {(
                            config.perguntas.find((p) => p.id === config.precoComposto?.perguntaFornecimentoId)
                              ?.opcoes || []
                          ).map((op) => {
                            const checked = (config.precoComposto?.opcoesAbsFornece || []).includes(op.id);
                            return (
                              <label key={op.id} className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const atual = new Set(config.precoComposto?.opcoesAbsFornece || []);
                                    if (e.target.checked) atual.add(op.id);
                                    else atual.delete(op.id);
                                    setConfig({
                                      ...config,
                                      precoComposto: {
                                        ...config.precoComposto!,
                                        opcoesAbsFornece: [...atual],
                                      },
                                    });
                                  }}
                                />
                                {op.label}
                              </label>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Se o cliente marcar que já possui o material, kit e metragem de material ficam R$ 0.
                        </p>
                      </div>
                    )}
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-emerald-800">
                        2. Material ABS por capacidade (não entra no preço-base)
                      </p>
                    <label className="mb-3 block max-w-xs text-sm">
                      <span className="mb-1 block font-medium text-slate-700">
                        Metros inclusos no kit de material (padrão)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="w-full rounded-lg border border-abs-gray px-3 py-2 bg-white"
                        value={config.precoComposto.metrosInclusosPadrao ?? 2}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0;
                          setConfig({
                            ...config,
                            precoComposto: {
                              ...config.precoComposto!,
                              metrosInclusosPadrao: v,
                            },
                          });
                        }}
                      />
                      <span className="mt-1 block text-xs text-slate-500">
                        Ex.: kit ABS cobre até 2 m; acima disso cobra metro adicional.
                      </span>
                    </label>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#002d62]">
                          Kit inicial + metros inclusos no kit + R$/metro extra
                        </p>
                        <Button
                          className="text-xs"
                          onClick={() =>
                            setConfig({
                              ...config,
                              precoComposto: sincronizarFaixas(config, config.precoComposto!),
                            })
                          }
                        >
                          Sync opções
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-abs-gray bg-white">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Capacidade</th>
                              <th className="px-3 py-2">Ajuste mão de obra (R$)</th>
                              <th className="px-3 py-2">Valor do kit inicial (R$)</th>
                              <th className="px-3 py-2">Metros inclusos no kit</th>
                              <th className="px-3 py-2">Valor do metro adicional (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(config.precoComposto.faixas || []).map((faixa, idx) => (
                              <tr key={faixa.opcaoId} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {faixa.label || faixa.opcaoId}
                                </td>
                                {(
                                  [
                                    ['ajusteCapacidade', faixa.ajusteCapacidade ?? 0],
                                    ['valorKitInicial', faixa.valorKitInicial ?? 0],
                                    ['metrosInclusos', faixa.metrosInclusos],
                                    ['precoPorMetroExtra', faixa.precoPorMetroExtra],
                                  ] as const
                                ).map(([campo, valor]) => (
                                  <td key={campo} className="px-3 py-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step={campo === 'metrosInclusos' ? 0.5 : 0.01}
                                      className="w-24 rounded border border-abs-gray px-2 py-1"
                                      value={valor}
                                      onChange={(e) => {
                                        const faixas = [...config.precoComposto!.faixas];
                                        faixas[idx] = {
                                          ...faixa,
                                          [campo]: Number(e.target.value) || 0,
                                        };
                                        setConfig({
                                          ...config,
                                          precoComposto: { ...config.precoComposto!, faixas },
                                        });
                                      }}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {!config.precoComposto.faixas?.length && (
                              <tr>
                                <td colSpan={5} className="px-3 py-3 text-slate-500">
                                  Selecione a pergunta de capacidade e clique em Sync opções.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">
                        3. Mapa das respostas de distância → metros
                      </p>
                      <p className="mb-2 text-xs text-slate-500">
                        Cada opção da pergunta de metragem precisa corresponder a um número de metros.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          config.perguntas.find((p) => p.id === config.precoComposto?.perguntaMetrosId)?.opcoes || []
                        ).map((op) => (
                          <label key={op.id} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate text-slate-700">{op.label}</span>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              className="w-20 rounded border border-abs-gray px-2 py-1"
                              value={config.precoComposto?.mapaMetrosOpcao?.[op.id] ?? ''}
                              onChange={(e) => {
                                const mapa = { ...(config.precoComposto?.mapaMetrosOpcao || {}) };
                                mapa[op.id] = Number(e.target.value) || 0;
                                setConfig({
                                  ...config,
                                  precoComposto: { ...config.precoComposto!, mapaMetrosOpcao: mapa },
                                });
                              }}
                            />
                            <span className="text-xs text-slate-400">m</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <label className="mb-6 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Fotos sugeridas (uma por linha)</span>
                <textarea
                  className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                  rows={3}
                  value={config.fotosObrigatorias.join('\n')}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      fotosObrigatorias: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </label>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-primary-800">Perguntas</h3>
                <Button
                  className="text-sm"
                  onClick={() => setConfig({ ...config, perguntas: [...config.perguntas, novaPergunta()] })}
                >
                  + Pergunta
                </Button>
              </div>

              <div className="space-y-4">
                {config.perguntas.map((p, pIdx) => (
                  <div key={`${p.id}-${pIdx}`} className="rounded-xl border border-abs-gray bg-slate-50/50 p-4">
                    <div className="mb-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-medium text-slate-500">ID (não altere se já em uso)</span>
                        <input
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                          value={p.id}
                          onChange={(e) => atualizarPergunta(pIdx, { id: e.target.value })}
                        />
                      </label>
                      <label className="text-sm sm:col-span-1">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Título</span>
                        <input
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                          value={p.titulo}
                          onChange={(e) => atualizarPergunta(pIdx, { titulo: e.target.value })}
                        />
                      </label>
                    </div>

                    {p.showIf && (
                      <p className="mb-2 text-xs text-amber-700">
                        Exibida se &quot;{p.showIf.perguntaId}&quot; ∈ [{p.showIf.opcaoIds.join(', ')}]
                      </p>
                    )}

                    <div className="space-y-2">
                      {p.opcoes.map((op, oIdx) => (
                        <div key={`${op.id}-${oIdx}`} className="flex flex-wrap items-end gap-2">
                          <input
                            className="min-w-[100px] flex-1 rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            placeholder="ID opção"
                            value={op.id}
                            onChange={(e) => {
                              const opcoes = [...p.opcoes];
                              opcoes[oIdx] = { ...opcoes[oIdx], id: e.target.value };
                              atualizarPergunta(pIdx, { opcoes });
                            }}
                          />
                          <input
                            className="min-w-[140px] flex-[2] rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            placeholder="Texto da opção"
                            value={op.label}
                            onChange={(e) => {
                              const opcoes = [...p.opcoes];
                              opcoes[oIdx] = { ...opcoes[oIdx], label: e.target.value };
                              atualizarPergunta(pIdx, { opcoes });
                            }}
                          />
                          {config.modoPreco === 'personalizado' && (
                            <>
                              <input
                                type="number"
                                className="w-24 rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                                placeholder="+ R$"
                                value={op.precoAdicional ?? ''}
                                onChange={(e) => {
                                  const opcoes = [...p.opcoes];
                                  opcoes[oIdx] = {
                                    ...opcoes[oIdx],
                                    precoAdicional: e.target.value ? Number(e.target.value) : undefined,
                                  };
                                  atualizarPergunta(pIdx, { opcoes });
                                }}
                              />
                              <select
                                className="w-40 rounded-lg border border-abs-gray px-2 py-1.5 text-xs"
                                value={op.modoCobranca || 'por_unidade'}
                                onChange={(e) => {
                                  const opcoes = [...p.opcoes];
                                  opcoes[oIdx] = {
                                    ...opcoes[oIdx],
                                    modoCobranca: e.target.value as 'fixo' | 'por_unidade',
                                  };
                                  atualizarPergunta(pIdx, { opcoes });
                                }}
                              >
                                <option value="por_unidade">Por unidade × qtd</option>
                                <option value="fixo">Valor fixo</option>
                              </select>
                            </>
                          )}
                          <button
                            type="button"
                            className="text-xs text-red-500"
                            onClick={() => {
                              const opcoes = p.opcoes.filter((_, i) => i !== oIdx);
                              atualizarPergunta(pIdx, { opcoes });
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                      <Button
                        className="text-xs"
                        onClick={() => {
                          const opcoes = [...p.opcoes, { id: `opcao-${Date.now()}`, label: 'Nova opção' }];
                          atualizarPergunta(pIdx, { opcoes });
                        }}
                      >
                        + Opção
                      </Button>
                    </div>

                    <button type="button" className="mt-3 text-xs text-red-600" onClick={() => removerPergunta(pIdx)}>
                      Remover pergunta
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
