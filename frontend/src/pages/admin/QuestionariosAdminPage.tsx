import { useEffect, useState } from 'react';
import { fluxoAdminApi } from '../../services/modules.service';
import type { FluxoConfigAdmin, FluxoPerguntaConfig } from '../../types';
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
                    <span className="mb-1 block font-medium text-slate-700">Preço base (R$)</span>
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
                  </label>
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
                            <input
                              type="number"
                              className="w-28 rounded-lg border border-abs-gray px-2 py-1.5 text-sm"
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
