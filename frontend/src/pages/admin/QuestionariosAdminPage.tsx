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
    papel: 'normal',
    opcoes: [
      { id: 'opcao-1', label: 'Opção 1' },
      { id: 'opcao-2', label: 'Opção 2' },
    ],
  };
}

function temTabelaProgressiva(p: FluxoPerguntaConfig): boolean {
  return Object.values(p.precosPorQuantidade || {}).some((v) => Number(v) > 0);
}

function tabelaProgressivaPadrao(max = 5, base = 0): Record<string, number> {
  const tabela: Record<string, number> = {};
  for (let q = 1; q <= max; q++) tabela[String(q)] = base > 0 && q === 1 ? base : 0;
  return tabela;
}

function parecePerguntaQuantidade(p: FluxoPerguntaConfig): boolean {
  if (p.papel === 'quantidade') return true;
  if (p.papel === 'numero') return false;
  return p.id === 'quantidade' || /quantidad/i.test(p.titulo);
}

/** Perguntas elegíveis para vínculo de capacidade/fornecimento (não quantidade). */
function perguntasComOpcoesParaComposto(perguntas: FluxoPerguntaConfig[]) {
  return perguntas.filter(
    (p) => (p.papel || 'normal') === 'normal' && (p.opcoes?.length || 0) > 0 && !parecePerguntaQuantidade(p)
  );
}

function perguntasMetrosParaComposto(perguntas: FluxoPerguntaConfig[]) {
  return perguntas.filter(
    (p) =>
      !parecePerguntaQuantidade(p) &&
      (p.papel === 'numero' || ((p.papel || 'normal') === 'normal' && (p.opcoes?.length || 0) > 0))
  );
}

/** Corrige no admin se capacidade estiver ligada à quantidade de aparelhos. */
function corrigirCompostoNoCliente(
  config: FluxoConfigAdmin,
  composto: PrecoCompostoConfig
): PrecoCompostoConfig {
  if (!composto.ativo) return composto;
  let next = { ...composto };
  const cap = config.perguntas.find((p) => p.id === next.perguntaCapacidadeId);
  if (!cap || parecePerguntaQuantidade(cap) || !(cap.opcoes?.length)) {
    const prefer =
      config.perguntas.find((p) => p.id === 'capacidadeBtu') ||
      perguntasComOpcoesParaComposto(config.perguntas).find((p) =>
        /capacidade|btu/i.test(`${p.id} ${p.titulo}`)
      ) ||
      perguntasComOpcoesParaComposto(config.perguntas)[0];
    if (prefer) next = sincronizarFaixas(config, { ...next, perguntaCapacidadeId: prefer.id });
  }
  const metros = config.perguntas.find((p) => p.id === next.perguntaMetrosId);
  if (!metros || parecePerguntaQuantidade(metros)) {
    const prefer =
      config.perguntas.find((p) => p.id === 'distanciaEvapCond') ||
      perguntasMetrosParaComposto(config.perguntas).find((p) =>
        /metro|distanc|metragem/i.test(`${p.id} ${p.titulo}`)
      ) ||
      perguntasMetrosParaComposto(config.perguntas)[0];
    if (prefer) {
      next = {
        ...next,
        perguntaMetrosId: prefer.id,
        metrosNumericos: prefer.papel === 'numero' ? true : next.metrosNumericos,
      };
    }
  }
  const forn = next.perguntaFornecimentoId
    ? config.perguntas.find((p) => p.id === next.perguntaFornecimentoId)
    : undefined;
  if (!forn || parecePerguntaQuantidade(forn) || !(forn.opcoes?.length)) {
    const prefer =
      config.perguntas.find((p) => p.id === 'materiaisInstalacaoAr') ||
      perguntasComOpcoesParaComposto(config.perguntas).find((p) =>
        /material|fornece|possu/i.test(`${p.id} ${p.titulo}`)
      );
    if (prefer) next = { ...next, perguntaFornecimentoId: prefer.id };
  }
  return next;
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
  const [uploadOpcaoKey, setUploadOpcaoKey] = useState<string | null>(null);

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
    fluxoAdminApi
      .obter(slugAtivo)
      .then((cfg) => {
        if (cfg.precoComposto?.ativo) {
          const corrigido = corrigirCompostoNoCliente(cfg, cfg.precoComposto);
          setConfig({ ...cfg, precoComposto: corrigido });
        } else {
          setConfig(cfg);
        }
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'Erro', 'error'));
  }, [slugAtivo, toast]);

  const salvar = async () => {
    if (!config) return;
    setSalvando(true);
    try {
      let precoComposto = config.precoComposto;
      if (precoComposto?.ativo) {
        precoComposto = corrigirCompostoNoCliente(config, precoComposto);
        precoComposto = sincronizarFaixas(config, precoComposto);
        const cap = config.perguntas.find((p) => p.id === precoComposto!.perguntaCapacidadeId);
        if (!cap || parecePerguntaQuantidade(cap) || !(cap.opcoes?.length)) {
          throw new Error(
            'Preço composto: em “Pergunta da capacidade” escolha a pergunta de BTUs (não a quantidade de aparelhos).'
          );
        }
      }
      const atualizado = await fluxoAdminApi.atualizar(config.slug, {
        perguntas: config.perguntas,
        fotosObrigatorias: config.fotosObrigatorias,
        regrasValidacao: config.regrasValidacao,
        modoPreco: config.modoPreco,
        precoBase: config.precoBase,
        itensPreco: config.itensPreco,
        precoComposto,
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
    const next: typeof config = { ...config, perguntas };
    const pergunta = perguntas[idx];
    if (
      config.precoComposto?.ativo &&
      config.precoComposto.perguntaMetrosId === pergunta.id &&
      patch.papel !== undefined
    ) {
      next.precoComposto = {
        ...config.precoComposto,
        metrosNumericos: patch.papel === 'numero',
      };
    }
    // Preço progressivo ativo → desliga multiplicação e força modo personalizado
    if (perguntas.some(temTabelaProgressiva)) {
      next.multiplicarBasePorQuantidade = false;
      next.modoPreco = 'personalizado';
      if (!next.perguntaQuantidadeId) {
        const qtd = perguntas.find((p) => p.papel === 'quantidade' || p.id === 'quantidade');
        if (qtd) next.perguntaQuantidadeId = qtd.id;
      }
    }
    setConfig(next);
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
                  {config.modoPreco === 'padrao' && (
                    <span className="mt-1 block text-xs text-amber-700">
                      No modo padrão a loja ignora preço-base, preço por opção e itens de preço — usa a
                      tabela fixa do sistema. Para editar preços, escolha Personalizado.
                    </span>
                  )}
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
                      Controla o − / + de unidades na loja.
                    </span>
                  </label>
                  {(() => {
                    const progressivoAtivo = config.perguntas.some(temTabelaProgressiva);
                    return (
                      <label className={`flex items-start gap-2 pt-6 text-sm ${progressivoAtivo ? 'opacity-60' : ''}`}>
                        <input
                          type="checkbox"
                          className="mt-1"
                          disabled={progressivoAtivo}
                          checked={progressivoAtivo ? false : config.multiplicarBasePorQuantidade !== false}
                          onChange={(e) =>
                            setConfig({ ...config, multiplicarBasePorQuantidade: e.target.checked })
                          }
                        />
                        <span>
                          <span className="block font-medium text-slate-700">
                            Multiplicar preço base pela quantidade
                          </span>
                          <span className="text-xs text-slate-500">
                            {progressivoAtivo
                              ? 'Desativado enquanto houver preço progressivo na pergunta de quantidade (evita cobrança duplicada).'
                              : 'Ex.: R$ 89 × 3 = R$ 267. Use em serviços lineares. Não combine com preço progressivo.'}
                          </span>
                        </span>
                      </label>
                    );
                  })()}
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
                          : ['abs-fornece-kit', 'nao'],
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
                    {parecePerguntaQuantidade(
                      config.perguntas.find((p) => p.id === config.precoComposto?.perguntaCapacidadeId) || {
                        id: '',
                        titulo: '',
                        opcoes: [],
                      }
                    ) && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <strong>Atenção:</strong> “Pergunta da capacidade” está ligada à quantidade de
                        aparelhos. Escolha a pergunta de BTUs (ex.: Capacidade) e salve — senão a loja
                        não aplica kit/metros.
                      </div>
                    )}
                    <div className="rounded-lg border border-[#dbe7f5] bg-white p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#002d62]">
                        1. Perguntas do cálculo
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">Pergunta da capacidade (BTUs)</span>
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
                          {perguntasComOpcoesParaComposto(config.perguntas).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.titulo}
                            </option>
                          ))}
                        </select>
                        <span className="mt-1 block text-xs text-slate-500">
                          Não use a pergunta de quantidade de aparelhos.
                        </span>
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
                          {perguntasMetrosParaComposto(config.perguntas).map((p) => (
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
                          {perguntasComOpcoesParaComposto(config.perguntas).map((p) => (
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
                          Marque a opção pelo ID salvo (não pelo texto). Se o cliente escolher uma opção
                          marcada aqui, o sistema soma kit + metros extras. Sem marcação, kit/metros ficam
                          R$ 0.
                        </p>
                        {(config.precoComposto.opcoesAbsFornece || []).length === 0 && (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Nenhuma opção ABS marcada — o site não vai cobrar kit nem metragem.
                          </p>
                        )}
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
                      {(
                        config.perguntas.find((p) => p.id === config.precoComposto?.perguntaMetrosId)
                          ?.papel === 'numero'
                      ) ? (
                        <p className="text-xs text-emerald-700">
                          A pergunta de metragem está como “Número livre”: o cliente informa os metros
                          direto (+/−). Não é necessário mapear opções.
                        </p>
                      ) : (
                        <>
                      <p className="mb-2 text-xs text-slate-500">
                        Cada opção da pergunta de metragem precisa corresponder a um número de metros.
                        Ou mude a pergunta para “Número livre” para o cliente digitar a metragem.
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
                        </>
                      )}
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
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Título</span>
                        <input
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                          value={p.titulo}
                          onChange={(e) => atualizarPergunta(pIdx, { titulo: e.target.value })}
                        />
                      </label>
                      <label className="text-sm sm:col-span-2">
                        <span className="mb-1 block text-xs font-medium text-slate-500">Tipo da pergunta</span>
                        <select
                          className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm"
                          value={p.papel || 'normal'}
                          onChange={(e) => {
                            const papel = e.target.value as 'normal' | 'quantidade' | 'numero';
                            if (papel === 'numero') {
                              atualizarPergunta(pIdx, {
                                papel,
                                opcoes: [],
                                numeroMin: p.numeroMin ?? 0,
                                numeroMax: p.numeroMax ?? 30,
                                numeroPasso: p.numeroPasso ?? 1,
                                numeroUnidade: p.numeroUnidade || 'm',
                              });
                            } else if (papel === 'quantidade') {
                              atualizarPergunta(pIdx, {
                                papel,
                                opcoes: [],
                                numeroMin: p.numeroMin ?? 1,
                                numeroMax: p.numeroMax ?? 5,
                                numeroPasso: 1,
                                numeroUnidade: 'un.',
                                // Não ativa progressivo automaticamente — admin marca o checkbox
                                precosPorQuantidade: p.precosPorQuantidade,
                              });
                            } else {
                              atualizarPergunta(pIdx, {
                                papel: 'normal',
                                opcoes: p.opcoes?.length
                                  ? p.opcoes
                                  : [
                                      { id: 'opcao-1', label: 'Opção 1' },
                                      { id: 'opcao-2', label: 'Opção 2' },
                                    ],
                              });
                            }
                          }}
                        >
                          <option value="normal">Múltipla escolha (botões)</option>
                          <option value="quantidade">Quantidade do serviço (+/− unidades)</option>
                          <option value="numero">Número livre (+/−, ex.: metros)</option>
                        </select>
                        <span className="mt-1 block text-xs text-slate-500">
                          Use “Número livre” para metragem sem criar dezenas de opções.
                        </span>
                      </label>
                      {(p.papel || 'normal') !== 'quantidade' && (
                        <label className="flex items-start gap-2 text-sm sm:col-span-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={Boolean(p.replicarPorUnidade)}
                            onChange={(e) =>
                              atualizarPergunta(pIdx, { replicarPorUnidade: e.target.checked })
                            }
                          />
                          <span>
                            <span className="block font-medium text-slate-700">
                              Repetir esta pergunta para cada unidade
                            </span>
                            <span className="text-xs text-slate-500">
                              Com quantidade &gt; 1, o cliente responde de novo (ex.: Aparelho 1, Aparelho 2).
                              Use em capacidade, metragem, material etc. Deixe desmarcado para perguntas
                              compartilhadas (tipo de imóvel, andaime).
                            </span>
                          </span>
                        </label>
                      )}
                    </div>

                    {p.showIf && (
                      <p className="mb-2 text-xs text-amber-700">
                        Exibida se &quot;{p.showIf.perguntaId}&quot; ∈ [{p.showIf.opcaoIds.join(', ')}]
                      </p>
                    )}

                    {(p.papel || 'normal') === 'normal' && (
                      <div className="mb-2 grid gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
                        <label className="text-xs text-slate-600">
                          Exibir esta pergunta somente se
                          <select
                            className="mt-0.5 w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            value={p.showIf?.perguntaId || ''}
                            onChange={(e) => {
                              const pid = e.target.value;
                              if (!pid) {
                                atualizarPergunta(pIdx, { showIf: undefined });
                                return;
                              }
                              atualizarPergunta(pIdx, {
                                showIf: {
                                  perguntaId: pid,
                                  opcaoIds: p.showIf?.perguntaId === pid ? p.showIf.opcaoIds : [],
                                },
                              });
                            }}
                          >
                            <option value="">Sempre visível</option>
                            {config.perguntas
                              .filter((q) => q.id !== p.id)
                              .map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.titulo}
                                </option>
                              ))}
                          </select>
                        </label>
                        {p.showIf?.perguntaId && (
                          <label className="text-xs text-slate-600">
                            for a opção
                            <select
                              className="mt-0.5 w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                              value={p.showIf.opcaoIds[0] || ''}
                              onChange={(e) => {
                                atualizarPergunta(pIdx, {
                                  showIf: {
                                    perguntaId: p.showIf!.perguntaId,
                                    opcaoIds: e.target.value ? [e.target.value] : [],
                                  },
                                });
                              }}
                            >
                              <option value="">Selecione…</option>
                              {(
                                config.perguntas.find((q) => q.id === p.showIf?.perguntaId)?.opcoes ||
                                []
                              ).map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}

                    {(p.papel || 'normal') === 'numero' ? (
                      <div className="mb-2 grid gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 sm:grid-cols-4">
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-slate-500">Mínimo</span>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            value={p.numeroMin ?? 0}
                            onChange={(e) =>
                              atualizarPergunta(pIdx, { numeroMin: Number(e.target.value) || 0 })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-slate-500">Máximo</span>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            value={p.numeroMax ?? 30}
                            onChange={(e) =>
                              atualizarPergunta(pIdx, { numeroMax: Number(e.target.value) || 30 })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-slate-500">Passo</span>
                          <input
                            type="number"
                            min={0.1}
                            step={0.1}
                            className="w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            value={p.numeroPasso ?? 1}
                            onChange={(e) =>
                              atualizarPergunta(pIdx, { numeroPasso: Number(e.target.value) || 1 })
                            }
                          />
                        </label>
                        <label className="text-sm">
                          <span className="mb-1 block text-xs text-slate-500">Unidade</span>
                          <input
                            className="w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                            placeholder="m"
                            value={p.numeroUnidade || ''}
                            onChange={(e) => atualizarPergunta(pIdx, { numeroUnidade: e.target.value })}
                          />
                        </label>
                        <p className="sm:col-span-4 text-xs text-slate-500">
                          No preço composto, marque esta pergunta como “Pergunta da metragem” — o valor digitado
                          vira os metros reais.
                        </p>
                      </div>
                    ) : (p.papel || 'normal') === 'quantidade' ? (
                      <div className="mb-2 space-y-3 rounded-lg border border-dashed border-[#002d62]/30 bg-[#f8fbff] p-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="text-sm">
                            <span className="mb-1 block text-xs text-slate-500">Mín. unidades</span>
                            <input
                              type="number"
                              min={1}
                              className="w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                              value={p.numeroMin ?? 1}
                              onChange={(e) =>
                                atualizarPergunta(pIdx, { numeroMin: Math.max(1, Number(e.target.value) || 1) })
                              }
                            />
                          </label>
                          <label className="text-sm">
                            <span className="mb-1 block text-xs text-slate-500">Máx. unidades</span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              className="w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                              value={p.numeroMax ?? 5}
                              onChange={(e) => {
                                const max = Math.max(1, Math.min(20, Number(e.target.value) || 5));
                                const tabela: Record<string, number> = { ...(p.precosPorQuantidade || {}) };
                                for (let q = 1; q <= max; q++) {
                                  if (tabela[String(q)] == null) tabela[String(q)] = 0;
                                }
                                Object.keys(tabela).forEach((k) => {
                                  if (Number(k) > max) delete tabela[k];
                                });
                                atualizarPergunta(pIdx, { numeroMax: max, precosPorQuantidade: tabela });
                              }}
                            />
                          </label>
                        </div>

                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={temTabelaProgressiva(p) || Boolean(p.precosPorQuantidade && Object.keys(p.precosPorQuantidade).length)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const max = p.numeroMax ?? 5;
                                const base = Number(config.precoBase) || 0;
                                const tabela =
                                  p.precosPorQuantidade && Object.keys(p.precosPorQuantidade).length
                                    ? { ...p.precosPorQuantidade }
                                    : tabelaProgressivaPadrao(max, base);
                                for (let q = 1; q <= max; q++) {
                                  if (tabela[String(q)] == null) tabela[String(q)] = 0;
                                }
                                if (!config) return;
                                const perguntas = [...config.perguntas];
                                perguntas[pIdx] = {
                                  ...perguntas[pIdx],
                                  precosPorQuantidade: tabela,
                                };
                                setConfig({
                                  ...config,
                                  perguntas,
                                  modoPreco: 'personalizado',
                                  multiplicarBasePorQuantidade: false,
                                  perguntaQuantidadeId: config.perguntaQuantidadeId || p.id,
                                });
                              } else {
                                atualizarPergunta(pIdx, { precosPorQuantidade: undefined });
                              }
                            }}
                          />
                          <span>
                            <span className="block font-semibold text-[#002d62]">
                              Usar preço progressivo por quantidade
                            </span>
                            <span className="text-xs text-slate-600">
                              O valor da faixa é o total da mão de obra para aquela quantidade (substitui o
                              preço-base — não soma e não multiplica). Ex.: 3 un. = R$159.
                            </span>
                          </span>
                        </label>

                        {(temTabelaProgressiva(p) ||
                          Boolean(p.precosPorQuantidade && Object.keys(p.precosPorQuantidade).length)) && (
                          <>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                  <tr>
                                    <th className="px-3 py-2">Quantidade</th>
                                    <th className="px-3 py-2">Mão de obra total (R$)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from({ length: p.numeroMax ?? 5 }, (_, i) => i + 1).map((q) => (
                                    <tr key={q} className="border-t border-slate-100">
                                      <td className="px-3 py-2 font-medium text-slate-800">
                                        {q} {q === 1 ? 'unidade' : 'unidades'}
                                      </td>
                                      <td className="px-3 py-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step={0.01}
                                          className="w-28 rounded border border-abs-gray px-2 py-1"
                                          placeholder={q === 1 ? '89' : q === 2 ? '129' : q === 3 ? '159' : ''}
                                          value={p.precosPorQuantidade?.[String(q)] ?? ''}
                                          onChange={(e) => {
                                            const tabela = { ...(p.precosPorQuantidade || {}) };
                                            const v = e.target.value;
                                            if (!v) delete tabela[String(q)];
                                            else tabela[String(q)] = Number(v) || 0;
                                            atualizarPergunta(pIdx, { precosPorQuantidade: tabela });
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-xs text-slate-500">
                              Ex.: 1 = R$89 · 2 = R$129 · 3 = R$159 · 4 = R$189 · 5 = R$219. Com 3 unidades a mão
                              de obra é só R$159 (não R$89×3 nem R$89+R$159).
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                    <div className="space-y-2">
                      {parecePerguntaQuantidade(p) && (
                        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <p className="font-medium">Esta pergunta parece ser de quantidade</p>
                          <p className="mt-0.5 text-xs">
                            Para o − / + na loja e o preço progressivo, converta o tipo para “Quantidade do
                            serviço (+/− unidades)”.
                          </p>
                          <button
                            type="button"
                            className="mt-2 rounded-lg bg-[#002d62] px-3 py-1.5 text-xs font-semibold text-white"
                            onClick={() => {
                              const max = Math.max(
                                5,
                                ...p.opcoes.map((o) => Number(o.id)).filter((n) => Number.isFinite(n) && n > 0)
                              );
                              const maxFinal = Math.min(20, max || 5);
                              const tabela = tabelaProgressivaPadrao(
                                maxFinal,
                                Number(config.precoBase) || 0
                              );
                              if (!config) return;
                              const perguntas = [...config.perguntas];
                              perguntas[pIdx] = {
                                ...perguntas[pIdx],
                                papel: 'quantidade',
                                opcoes: [],
                                numeroMin: 1,
                                numeroMax: maxFinal,
                                numeroPasso: 1,
                                numeroUnidade: 'un.',
                                precosPorQuantidade: tabela,
                              };
                              setConfig({
                                ...config,
                                perguntas,
                                modoPreco: 'personalizado',
                                multiplicarBasePorQuantidade: false,
                                perguntaQuantidadeId: p.id,
                              });
                            }}
                          >
                            Converter para quantidade (+/−) e habilitar preço progressivo
                          </button>
                        </div>
                      )}
                      {p.opcoes.map((op, oIdx) => (
                        <div
                          key={`${op.id}-${oIdx}`}
                          className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2"
                        >
                          <div className="flex flex-wrap items-end gap-2">
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

                          {config.modoPreco === 'personalizado' && (
                            <div className="space-y-2 rounded-md border border-dashed border-slate-200 bg-slate-50 p-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="text-xs text-slate-600">
                                  Adicional (R$)
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    className="mt-0.5 block w-28 rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                                    placeholder="0"
                                    value={op.precoAdicional ?? ''}
                                    onChange={(e) => {
                                      const opcoes = [...p.opcoes];
                                      opcoes[oIdx] = {
                                        ...opcoes[oIdx],
                                        precoAdicional: e.target.value
                                          ? Number(e.target.value)
                                          : undefined,
                                      };
                                      atualizarPergunta(pIdx, { opcoes });
                                    }}
                                  />
                                </label>
                                <label className="flex items-start gap-2 text-sm pt-4">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={(op.modoCobranca || 'por_unidade') === 'por_unidade'}
                                    disabled={!op.precoAdicional}
                                    onChange={(e) => {
                                      const opcoes = [...p.opcoes];
                                      opcoes[oIdx] = {
                                        ...opcoes[oIdx],
                                        modoCobranca: e.target.checked ? 'por_unidade' : 'fixo',
                                      };
                                      atualizarPergunta(pIdx, { opcoes });
                                    }}
                                  />
                                  <span>
                                    <span className="block font-medium text-slate-700">
                                      Cobrar por unidade (multiplicar pela quantidade)
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      Marcado = R$12 × 3 un. = R$36. Desmarcado = uma vez por atendimento
                                      (ex.: andaime compartilhado), sem multiplicar.
                                    </span>
                                  </span>
                                </label>
                              </div>

                              {(Number(op.precoAdicional) || 0) > 0 && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <label className="text-xs text-slate-600">
                                    Aplicar adicional somente se a pergunta
                                    <select
                                      className="mt-0.5 w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                                      value={Object.keys(op.when || {})[0] || ''}
                                      onChange={(e) => {
                                        const opcoes = [...p.opcoes];
                                        const pid = e.target.value;
                                        if (!pid) {
                                          const { when: _w, ...rest } = opcoes[oIdx];
                                          opcoes[oIdx] = rest;
                                        } else {
                                          opcoes[oIdx] = {
                                            ...opcoes[oIdx],
                                            when: { [pid]: op.when?.[pid] || [] },
                                          };
                                        }
                                        atualizarPergunta(pIdx, { opcoes });
                                      }}
                                    >
                                      <option value="">Sempre (sem condição)</option>
                                      {config.perguntas
                                        .filter((q) => q.id !== p.id && (q.papel || 'normal') === 'normal')
                                        .map((q) => (
                                          <option key={q.id} value={q.id}>
                                            {q.titulo}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                  {Object.keys(op.when || {})[0] && (
                                    <label className="text-xs text-slate-600">
                                      for igual a
                                      <select
                                        className="mt-0.5 w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                                        value={(op.when?.[Object.keys(op.when)[0]] || [])[0] || ''}
                                        onChange={(e) => {
                                          const chave = Object.keys(op.when || {})[0];
                                          if (!chave) return;
                                          const opcoes = [...p.opcoes];
                                          opcoes[oIdx] = {
                                            ...opcoes[oIdx],
                                            when: e.target.value
                                              ? { [chave]: [e.target.value] }
                                              : { [chave]: [] },
                                          };
                                          atualizarPergunta(pIdx, { opcoes });
                                        }}
                                      >
                                        <option value="">Selecione a opção…</option>
                                        {(
                                          config.perguntas.find(
                                            (q) => q.id === Object.keys(op.when || {})[0]
                                          )?.opcoes || []
                                        ).map((o) => (
                                          <option key={o.id} value={o.id}>
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-2 rounded-md border border-dashed border-[#c7d7ef] bg-[#f8fbff] p-2">
                            <p className="text-xs font-semibold text-[#002d62]">Imagem da opção (opcional)</p>
                            <div className="flex flex-wrap items-center gap-3">
                              {op.imagemUrl ? (
                                <img
                                  src={op.imagemUrl}
                                  alt=""
                                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-400">
                                  sem foto
                                </div>
                              )}
                              <label className="cursor-pointer rounded-lg border border-[#002d62] px-3 py-1.5 text-xs font-semibold text-[#002d62]">
                                {uploadOpcaoKey === `${p.id}:${op.id}` ? 'Enviando…' : 'Upload de imagem'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadOpcaoKey === `${p.id}:${op.id}`}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (!file || !config) return;
                                    const key = `${p.id}:${op.id}`;
                                    setUploadOpcaoKey(key);
                                    try {
                                      const { url } = await fluxoAdminApi.uploadImagemOpcao(
                                        config.slug,
                                        p.id,
                                        op.id,
                                        file
                                      );
                                      const opcoes = [...p.opcoes];
                                      opcoes[oIdx] = {
                                        ...opcoes[oIdx],
                                        imagemUrl: url,
                                        usarComoImagemPrincipal:
                                          opcoes[oIdx].usarComoImagemPrincipal ?? true,
                                      };
                                      atualizarPergunta(pIdx, { opcoes });
                                      toast('Imagem da opção enviada. Salve o questionário.', 'success');
                                    } catch (err) {
                                      toast(err instanceof Error ? err.message : 'Erro no upload', 'error');
                                    } finally {
                                      setUploadOpcaoKey(null);
                                    }
                                  }}
                                />
                              </label>
                              {op.imagemUrl && (
                                <button
                                  type="button"
                                  className="text-xs text-red-600"
                                  onClick={() => {
                                    const opcoes = [...p.opcoes];
                                    opcoes[oIdx] = {
                                      ...opcoes[oIdx],
                                      imagemUrl: undefined,
                                      usarComoImagemPrincipal: false,
                                    };
                                    atualizarPergunta(pIdx, { opcoes });
                                  }}
                                >
                                  Remover imagem
                                </button>
                              )}
                            </div>
                            <label className="block text-xs text-slate-600">
                              Ou cole a URL da imagem
                              <input
                                className="mt-0.5 w-full rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
                                placeholder="https://… ou /opcoes/…"
                                value={op.imagemUrl || ''}
                                onChange={(e) => {
                                  const opcoes = [...p.opcoes];
                                  const url = e.target.value.trim();
                                  opcoes[oIdx] = {
                                    ...opcoes[oIdx],
                                    imagemUrl: url || undefined,
                                    usarComoImagemPrincipal: url
                                      ? opcoes[oIdx].usarComoImagemPrincipal ?? true
                                      : false,
                                  };
                                  atualizarPergunta(pIdx, { opcoes });
                                }}
                              />
                            </label>
                            <label className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={Boolean(op.usarComoImagemPrincipal && op.imagemUrl)}
                                disabled={!op.imagemUrl}
                                onChange={(e) => {
                                  const opcoes = [...p.opcoes];
                                  opcoes[oIdx] = {
                                    ...opcoes[oIdx],
                                    usarComoImagemPrincipal: e.target.checked,
                                  };
                                  atualizarPergunta(pIdx, { opcoes });
                                }}
                              />
                              <span>
                                <span className="block font-medium text-slate-700">
                                  Ao selecionar esta opção, exibir esta imagem como imagem principal do
                                  serviço
                                </span>
                                <span className="text-xs text-slate-500">
                                  Independente do preço. Sem opção marcada, usa a imagem padrão do
                                  serviço.
                                </span>
                              </span>
                            </label>
                          </div>
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
                    )}

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
