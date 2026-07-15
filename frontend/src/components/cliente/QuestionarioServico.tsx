import { useEffect, useMemo, useRef, useState } from 'react';
import { solicitacaoApi } from '../../services/modules.service';
import { formatCurrency } from '../../types';
import {
  imagemParaOpcao,
  imagemServicoComRespostas,
  temImagemOpcao,
} from '../../config/imagens-opcoes';
import { gtmPush } from '../../utils/gtm';
import { Button, Loading, Logo, TextoComMarca } from '../ui';

export interface FluxoPergunta {
  id: string;
  titulo: string;
  opcoes: Array<{ id: string; label: string }>;
  showIf?: { perguntaId: string; opcaoIds: string[] };
}

export interface FluxoServicoData {
  slug: string;
  nome: string;
  perguntas: FluxoPergunta[];
  fotosObrigatorias: string[];
}

export interface PrecoCalculado {
  preco: number;
  breakdown: Array<{ label: string; valor: number }>;
  requerValidacaoTecnica: boolean;
  mensagemValidacao?: string;
}

function perguntasVisiveis(perguntas: FluxoPergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    return val != null && p.showIf.opcaoIds.includes(val);
  });
}

interface Props {
  slug: string;
  nome: string;
  quantidade: number;
  imagemCatalogo?: string | null;
  respostas: Record<string, string>;
  onResposta: (perguntaId: string, valor: string) => void;
  onPrecoChange: (preco: PrecoCalculado | null) => void;
  onResetRespostas?: () => void;
}

export function QuestionarioServico({
  slug,
  nome,
  quantidade,
  imagemCatalogo,
  respostas,
  onResposta,
  onPrecoChange,
  onResetRespostas,
}: Props) {
  const [fluxo, setFluxo] = useState<FluxoServicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [preco, setPreco] = useState<PrecoCalculado | null>(null);
  const [erro, setErro] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    solicitacaoApi
      .fluxo(slug)
      .then(setFluxo)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar questionário'))
      .finally(() => setLoading(false));
  }, [slug]);

  const visiveis = useMemo(
    () => (fluxo ? perguntasVisiveis(fluxo.perguntas, respostas) : []),
    [fluxo, respostas]
  );

  const imagemAtual = imagemServicoComRespostas(slug, respostas, imagemCatalogo);
  const perguntaAtual = visiveis.find((p) => !respostas[p.id]) ?? null;
  const perguntasRespondidas = visiveis.filter((p) => respostas[p.id]);
  const progresso = visiveis.length > 0
    ? Math.round((perguntasRespondidas.length / visiveis.length) * 100)
    : 100;

  const todasRespondidas =
    (fluxo?.perguntas.length ?? 0) === 0 ||
    (visiveis.length > 0 && visiveis.every((p) => respostas[p.id]));

  useEffect(() => {
    if (!todasRespondidas) {
      setPreco(null);
      onPrecoChange(null);
      setErro('');
      return;
    }
    let cancelled = false;
    setCalculando(true);
    setErro('');
    solicitacaoApi
      .calcularPreco({ slug, respostas, quantidade })
      .then((r) => {
        if (cancelled) return;
        setPreco(r);
        onPrecoChange(r);
        setErro('');
      })
      .catch((e) => {
        if (!cancelled) {
          setPreco(null);
          onPrecoChange(null);
          setErro(e instanceof Error ? e.message : 'Faltam alguns campos a serem selecionados.');
        }
      })
      .finally(() => {
        if (!cancelled) setCalculando(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, quantidade, respostas, todasRespondidas]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [perguntasRespondidas.length, preco, calculando, erro]);

  if (loading) return <Loading />;
  if (erro && !fluxo) return <p className="text-red-600">{erro}</p>;
  if (!fluxo) return null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-primary-700 px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">Consultor ABS</p>
                <p className="text-xs text-white/75">{nome} · Quantidade: {quantidade}</p>
              </div>
              {fluxo.perguntas.length > 0 && (
                <span className="rounded-full bg-white/15 px-2 py-1 text-xs">
                  {perguntasRespondidas.length}/{visiveis.length}
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-accent-500 transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="max-h-[32rem] min-h-72 space-y-3 overflow-y-auto bg-slate-50 p-4">
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                Olá! Vou fazer algumas perguntas rápidas para entender o serviço e calcular o valor para você.
              </div>
            </div>

            {fluxo.perguntas.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                  Este serviço possui preço fixo. Estou calculando o valor automaticamente.
                </div>
              </div>
            )}

            {perguntasRespondidas.map((pergunta) => {
              const opcao = pergunta.opcoes.find((item) => item.id === respostas[pergunta.id]);
              if (!opcao) return null;
              return (
                <div key={pergunta.id} className="space-y-2">
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                      {pergunta.titulo}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-primary-600 px-3 py-2 text-sm font-medium text-white">
                      {opcao.label}
                    </div>
                  </div>
                </div>
              );
            })}

            {perguntaAtual && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-900 shadow-sm">
                  {perguntaAtual.titulo}
                </div>
              </div>
            )}

            {calculando && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                  Calculando seu orçamento...
                </div>
              </div>
            )}

            {erro && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {erro}
                </div>
              </div>
            )}

            {preco && (
              <div className="flex justify-start">
                <div className="w-full max-w-[92%] rounded-2xl rounded-tl-md border border-primary-200 bg-white p-4 text-sm shadow-sm">
                  {preco.requerValidacaoTecnica ? (
                    <p className="font-medium text-amber-700">
                      ⚠️{' '}
                      {preco.mensagemValidacao ? (
                        <TextoComMarca texto={preco.mensagemValidacao} />
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          Este serviço requer validação técnica da{' '}
                          <Logo variant="inline" className="h-4" /> antes do pagamento.
                        </span>
                      )}
                    </p>
                  ) : (
                    <>
                      <p className="text-slate-600">Perfeito! Com base nas suas respostas:</p>
                      <p className="mt-1 text-xl font-bold text-primary-800">
                        {formatCurrency(preco.preco)}
                      </p>
                      {preco.breakdown.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                          {preco.breakdown.map((item, index) => (
                            <li key={index} className="flex justify-between gap-3">
                              <span>{item.label}</span>
                              <span>{formatCurrency(item.valor)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 text-xs text-slate-500">
                        Agora é só avançar para conferir o resumo do pedido.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {perguntaAtual && (
            <div className="border-t border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Escolha uma resposta
              </p>
              <div className="flex flex-wrap gap-2">
                {perguntaAtual.opcoes.map((opcao) => {
                  const possuiImagem = temImagemOpcao(slug, perguntaAtual.id, opcao.id);
                  return (
                    <button
                      key={opcao.id}
                      type="button"
                      onClick={() => {
                        setErro('');
                        onResposta(perguntaAtual.id, opcao.id);
                        gtmPush('agendar_opcao_selecionada', {
                          servico_slug: slug,
                          pergunta_id: perguntaAtual.id,
                          pergunta: perguntaAtual.titulo,
                          opcao_id: opcao.id,
                          opcao: opcao.label,
                        });
                      }}
                      className={`flex min-h-10 items-center gap-2 rounded-xl border border-primary-200 bg-white px-3 py-2 text-left text-sm font-medium text-primary-800 transition hover:border-primary-500 hover:bg-primary-50 ${
                        possuiImagem ? 'max-w-[150px] flex-col' : ''
                      }`}
                    >
                      {possuiImagem && (
                        <img
                          src={imagemParaOpcao(slug, perguntaAtual.id, opcao.id, imagemCatalogo)}
                          alt=""
                          className="h-20 w-full rounded-lg bg-white object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <span>{opcao.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(preco || (erro && todasRespondidas)) && fluxo.perguntas.length > 0 && onResetRespostas && (
            <div className="border-t border-slate-200 bg-white px-4 py-3 text-right">
              <button
                type="button"
                onClick={onResetRespostas}
                className="text-xs font-medium text-primary-600 underline"
              >
                Refazer conversa
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 lg:w-56">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Visual do serviço</p>
        <img
          src={imagemAtual}
          alt={nome}
          className="aspect-[4/3] w-full rounded-xl border border-abs-gray bg-white object-contain object-center p-2 shadow-sm lg:sticky lg:top-4"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if (imagemCatalogo) (e.target as HTMLImageElement).src = imagemCatalogo;
          }}
        />
      </div>
    </div>
  );
}

interface FotosServicoProps {
  slug: string;
  nome: string;
  labels: string[];
  arquivos: File[];
  onChange: (files: File[]) => void;
}

function BotaoEnviarFoto({
  label = 'Enviar foto',
  multiple = true,
  onFiles,
}: {
  label?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="cta"
        className="w-full sm:w-auto"
        onClick={() => inputRef.current?.click()}
      >
        📷 {label}
      </Button>
    </div>
  );
}

export function FotosServicoStep({ slug, nome, labels, arquivos, onChange }: FotosServicoProps) {
  const adicionar = (files: File[]) => {
    if (!files.length) return;
    onChange([...arquivos, ...files]);
    gtmPush('agendar_foto_enviada', {
      servico_slug: slug,
      servico_nome: nome,
      qtd_fotos: files.length,
      total_fotos: arquivos.length + files.length,
    });
  };

  const remover = (idx: number) => {
    onChange(arquivos.filter((_, i) => i !== idx));
  };

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-primary-800">{nome}</h4>
      <p className="mb-3 text-xs text-slate-500">Fotos sugeridas: {labels.join(', ')}</p>
      <BotaoEnviarFoto onFiles={adicionar} />
      {arquivos.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {arquivos.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-abs-gray bg-white px-3 py-2">
              <span className="truncate">✓ {f.name}</span>
              <button type="button" className="shrink-0 text-red-500" onClick={() => remover(i)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface NavProps {
  onVoltar: () => void;
  onAvancar: () => void;
  avancarLabel?: string;
  disabled?: boolean;
}

export function QuestionarioNav({ onVoltar, onAvancar, avancarLabel = 'Continuar', disabled }: NavProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
      <Button
        onClick={() => {
          gtmPush('agendar_nav_voltar', { botao: 'Voltar' });
          onVoltar();
        }}
      >
        Voltar
      </Button>
      <Button
        variant="cta"
        onClick={() => {
          gtmPush('agendar_nav_avancar', { botao: avancarLabel });
          onAvancar();
        }}
        disabled={disabled}
      >
        {avancarLabel}
      </Button>
    </div>
  );
}
