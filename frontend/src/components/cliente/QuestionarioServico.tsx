import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitacaoApi } from '../../services/modules.service';
import { formatCurrency } from '../../types';
import {
  imagemParaOpcao,
  imagemServicoComRespostas,
  temImagemOpcao,
} from '../../config/imagens-opcoes';
import { gtmPush } from '../../utils/gtm';
import { Button, Card, Loading, Logo, TextoComMarca } from '../ui';

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
  onRespostasBulk?: (patch: Record<string, string>) => void;
}

export function QuestionarioServico({
  slug,
  nome,
  quantidade,
  imagemCatalogo,
  respostas,
  onResposta,
  onPrecoChange,
}: Props) {
  const [fluxo, setFluxo] = useState<FluxoServicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [preco, setPreco] = useState<PrecoCalculado | null>(null);
  const [erro, setErro] = useState('');

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

  if (loading) return <Loading />;
  if (erro && !fluxo) return <p className="text-red-600">{erro}</p>;
  if (!fluxo) return null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-lg font-bold text-primary-800">{nome}</h3>
        <p className="mb-4 text-sm text-slate-500">Quantidade no carrinho: {quantidade}</p>

        {fluxo.perguntas.length === 0 ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Este serviço usa <strong>preço fixo</strong>. O valor será confirmado automaticamente abaixo.
          </div>
        ) : (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Prefere conversar em vez de preencher tudo de uma vez? Use o{' '}
          <Link to="/cliente/diagnostico" className="font-semibold text-primary-700 underline">
            Consultor ABS
          </Link>
          .
        </div>
        )}

        <div className="space-y-4">
          {visiveis.map((p) => (
            <div key={p.id}>
              <p className="mb-2 font-medium text-primary-900">{p.titulo}</p>
              <div className="flex flex-wrap gap-2">
                {p.opcoes.map((op) => {
                  const selecionada = respostas[p.id] === op.id;
                  const thumb = temImagemOpcao(slug, p.id, op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        setErro('');
                        onResposta(p.id, op.id);
                        gtmPush('agendar_opcao_selecionada', {
                          servico_slug: slug,
                          pergunta_id: p.id,
                          pergunta: p.titulo,
                          opcao_id: op.id,
                          opcao: op.label,
                        });
                      }}
                      className={`flex max-w-[140px] flex-col items-center gap-1 rounded-lg border px-2 py-2 text-sm transition ${
                        selecionada
                          ? 'border-primary-600 bg-primary-50 font-semibold text-primary-800'
                          : 'border-abs-gray bg-white text-slate-600 hover:border-primary-300'
                      }`}
                    >
                      {thumb && (
                        <img
                          src={imagemParaOpcao(slug, p.id, op.id, imagemCatalogo)}
                          alt=""
                          className="h-20 w-full rounded-md border border-slate-200 bg-white object-contain object-center p-1"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <span className="text-center leading-tight">{op.label}</span>
                    </button>
                  );
                })}
              </div>
              {respostas[p.id] && temImagemOpcao(slug, p.id, respostas[p.id]) && (
                <img
                  src={imagemParaOpcao(slug, p.id, respostas[p.id], imagemCatalogo)}
                  alt=""
                  className="mt-3 aspect-[4/3] w-full max-w-sm rounded-xl border border-abs-gray bg-white object-contain object-center p-2 shadow-sm"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          ))}
        </div>

        {calculando && <p className="mt-4 text-sm text-slate-500">Calculando preço...</p>}

        {erro && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {erro}
          </div>
        )}

        {!todasRespondidas && fluxo.perguntas.length > 0 && (
          <p className="mt-4 text-sm text-slate-500">
            Selecione todas as opções acima para calcular o preço.
          </p>
        )}

        {preco && (
          <Card className="mt-4 bg-slate-50">
            {preco.requerValidacaoTecnica ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️{' '}
                {preco.mensagemValidacao ? (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <TextoComMarca texto={preco.mensagemValidacao} />
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    Este serviço requer validação técnica da <Logo variant="inline" className="h-4" /> antes do pagamento.
                  </span>
                )}
              </p>
            ) : (
              <>
                <p className="font-bold text-primary-800">Preço estimado: {formatCurrency(preco.preco)}</p>
                {preco.breakdown.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {preco.breakdown.map((b, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{b.label}</span>
                        <span>{formatCurrency(b.valor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>
        )}

        {erro && fluxo && <p className="mt-2 text-sm text-red-600">{erro}</p>}
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
