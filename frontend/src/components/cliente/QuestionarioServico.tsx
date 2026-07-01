import { useEffect, useMemo, useState } from 'react';
import { diagnosticoApi, solicitacaoApi } from '../../services/modules.service';
import { formatCurrency } from '../../types';
import {
  imagemParaOpcao,
  imagemServicoComRespostas,
  MARGEM_ERRO_IA_PERCENT,
  temImagemOpcao,
} from '../../config/imagens-opcoes';
import { mapearDiagnosticoParaRespostas } from '../../utils/mapear-diagnostico';
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
  onDiagnosticoIaUsado?: (dados: { fotos: File[]; mensagem?: string }) => void;
}

export function QuestionarioServico({
  slug,
  nome,
  quantidade,
  imagemCatalogo,
  respostas,
  onResposta,
  onPrecoChange,
  onRespostasBulk,
  onDiagnosticoIaUsado,
}: Props) {
  const [fluxo, setFluxo] = useState<FluxoServicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [preco, setPreco] = useState<PrecoCalculado | null>(null);
  const [erro, setErro] = useState('');
  const [fotosIa, setFotosIa] = useState<File[]>([]);
  const [analisandoIa, setAnalisandoIa] = useState(false);
  const [msgIa, setMsgIa] = useState('');

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

  const todasRespondidas = visiveis.length > 0 && visiveis.every((p) => respostas[p.id]);

  useEffect(() => {
    if (!todasRespondidas) {
      setPreco(null);
      onPrecoChange(null);
      return;
    }
    let cancelled = false;
    setCalculando(true);
    solicitacaoApi
      .calcularPreco({ slug, respostas, quantidade })
      .then((r) => {
        if (cancelled) return;
        setPreco(r);
        onPrecoChange(r);
      })
      .catch((e) => {
        if (!cancelled) setErro(e instanceof Error ? e.message : 'Erro ao calcular preço');
      })
      .finally(() => {
        if (!cancelled) setCalculando(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, quantidade, respostas, todasRespondidas]);

  const analisarComIa = async () => {
    if (!fotosIa.length) {
      setErro('Envie pelo menos uma foto para a IA identificar');
      return;
    }
    setAnalisandoIa(true);
    setErro('');
    try {
      const res = await diagnosticoApi.analisar(fotosIa, undefined, slug);
      const spec = res.analise?.especificacao as { tipo?: string | null } | undefined;
      let mensagemIa = '';
      if (spec) {
        const patch = mapearDiagnosticoParaRespostas(slug, spec);
        if (Object.keys(patch).length && onRespostasBulk) {
          onRespostasBulk(patch);
          mensagemIa = `IA identificou: ${res.analise.produtoIdentificado || spec.tipo || 'produto'} (${res.analise.confianca ?? '—'}% confiança). Campos preenchidos automaticamente — confira antes de continuar.`;
          setMsgIa(mensagemIa);
        } else {
          mensagemIa = `IA: ${res.analise.produtoIdentificado || res.analise.descricao || 'Análise concluída'}. Ajuste as respostas manualmente se necessário.`;
          setMsgIa(mensagemIa);
        }
      } else {
        mensagemIa = `IA: ${res.analise?.produtoIdentificado || res.analise?.descricao || 'Análise concluída'}.`;
        setMsgIa(mensagemIa);
      }
      onDiagnosticoIaUsado?.({ fotos: [...fotosIa], mensagem: mensagemIa });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro na análise IA');
    } finally {
      setAnalisandoIa(false);
    }
  };

  if (loading) return <Loading />;
  if (erro && !fluxo) return <p className="text-red-600">{erro}</p>;
  if (!fluxo) return null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-lg font-bold text-primary-800">{nome}</h3>
        <p className="mb-4 text-sm text-slate-500">Quantidade no carrinho: {quantidade}</p>

        <Card className="mb-4 border border-blue-100 bg-blue-50/50">
          <p className="mb-2 text-sm font-semibold text-primary-800">Não sabe o tipo? Use a IA</p>
          <p className="mb-3 text-xs text-slate-600">
            O diagnóstico é feito por inteligência artificial e pode conter erros (margem estimada de até{' '}
            {MARGEM_ERRO_IA_PERCENT}%). Envie uma foto nítida do produto/local.
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mb-2 block w-full text-sm"
            onChange={(e) => {
              if (e.target.files?.length) setFotosIa(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          <Button variant="cta" className="text-sm" disabled={analisandoIa} onClick={analisarComIa}>
            {analisandoIa ? 'Analisando...' : 'Identificar com IA'}
          </Button>
          {msgIa && <p className="mt-2 text-xs text-green-700">{msgIa}</p>}
        </Card>

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
                      onClick={() => onResposta(p.id, op.id)}
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
                          className="h-14 w-full rounded-md border border-slate-200 bg-slate-50 object-contain p-1"
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
                  className="mt-3 h-36 w-full max-w-xs rounded-xl border border-abs-gray bg-slate-50 object-contain p-2"
                />
              )}
            </div>
          ))}
        </div>

        {calculando && <p className="mt-4 text-sm text-slate-500">Calculando preço...</p>}

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
          className="aspect-[4/3] w-full rounded-xl border border-abs-gray object-cover object-center shadow-sm lg:sticky lg:top-4"
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

export function FotosServicoStep({ nome, labels, arquivos, onChange }: FotosServicoProps) {
  const adicionar = (files: FileList | null) => {
    if (!files?.length) return;
    onChange([...arquivos, ...Array.from(files)]);
  };

  const remover = (idx: number) => {
    onChange(arquivos.filter((_, i) => i !== idx));
  };

  return (
    <div className="mb-6">
      <h4 className="font-semibold text-primary-800">{nome}</h4>
      <p className="mb-2 text-xs text-slate-500">Fotos sugeridas: {labels.join(', ')}</p>
      <input
        type="file"
        accept="image/*"
        multiple
        className="mb-2 block w-full text-sm"
        onChange={(e) => {
          adicionar(e.target.files);
          e.target.value = '';
        }}
      />
      {arquivos.length > 0 && (
        <ul className="space-y-1 text-sm text-slate-600">
          {arquivos.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{f.name}</span>
              <button type="button" className="text-red-500" onClick={() => remover(i)}>
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
      <Button onClick={onVoltar}>Voltar</Button>
      <Button variant="cta" onClick={onAvancar} disabled={disabled}>
        {avancarLabel}
      </Button>
    </div>
  );
}
