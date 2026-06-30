import { useEffect, useMemo, useState } from 'react';
import { solicitacaoApi } from '../../services/modules.service';
import { formatCurrency } from '../../types';
import { Button, Card, Loading } from '../ui';

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
  respostas: Record<string, string>;
  onResposta: (perguntaId: string, valor: string) => void;
  onPrecoChange: (preco: PrecoCalculado | null) => void;
}

export function QuestionarioServico({ slug, nome, quantidade, respostas, onResposta, onPrecoChange }: Props) {
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

  if (loading) return <Loading />;
  if (erro && !fluxo) return <p className="text-red-600">{erro}</p>;
  if (!fluxo) return null;

  return (
    <div>
      <h3 className="mb-1 text-lg font-bold text-primary-800">{nome}</h3>
      <p className="mb-4 text-sm text-slate-500">Quantidade no carrinho: {quantidade}</p>

      <div className="space-y-4">
        {visiveis.map((p) => (
          <div key={p.id}>
            <p className="mb-2 font-medium text-primary-900">{p.titulo}</p>
            <div className="flex flex-wrap gap-2">
              {p.opcoes.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => onResposta(p.id, op.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    respostas[p.id] === op.id
                      ? 'border-primary-600 bg-primary-50 font-semibold text-primary-800'
                      : 'border-abs-gray bg-white text-slate-600 hover:border-primary-300'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {calculando && <p className="mt-4 text-sm text-slate-500">Calculando preço...</p>}

      {preco && (
        <Card className="mt-4 bg-slate-50">
          {preco.requerValidacaoTecnica ? (
            <p className="text-sm font-medium text-amber-700">
              ⚠️ {preco.mensagemValidacao || 'Este serviço requer validação técnica da ABS antes do pagamento.'}
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
