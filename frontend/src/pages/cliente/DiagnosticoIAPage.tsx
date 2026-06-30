import { useState } from 'react';
import { Link } from 'react-router-dom';
import { diagnosticoApi } from '../../services/modules.service';
import { PageHeader, Card, Button, Logo } from '../../components/ui';
import { useToast } from '../../components/Toast';

type TipoDiagnostico = 'geral' | 'disjuntor';

interface EspecificacaoDisjuntor {
  marca?: string | null;
  modelo?: string | null;
  nomeComercial?: string | null;
  amperagem?: string | null;
  tipo?: string | null;
  curva?: string | null;
  tensao?: string | null;
  polos?: number | null;
  estadoAparente?: string | null;
  observacoes?: string | null;
  compativelSubstituto?: string | null;
}

interface Analise {
  confianca?: number;
  descricao?: string;
  produtoIdentificado?: string;
  acao?: string;
  fonte?: string;
  especificacao?: EspecificacaoDisjuntor;
}

const TIPOS: { id: TipoDiagnostico; label: string; hint: string; icon: string }[] = [
  {
    id: 'geral',
    label: 'Diagnóstico geral',
    hint: 'Qualquer problema elétrico ou hidráulico',
    icon: '🔍',
  },
  {
    id: 'disjuntor',
    label: 'Identificar disjuntor',
    hint: 'Marca, amperagem, tipo, curva e substituto',
    icon: '⚡',
  },
];

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

export function DiagnosticoIAPage() {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<TipoDiagnostico>('disjuntor');
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [contexto, setContexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ analise: Analise; orientacao?: string } | null>(null);

  const enviar = async () => {
    if (!fotoFiles.length) {
      toast('Selecione pelo menos uma foto', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await diagnosticoApi.analisar(fotoFiles, contexto, tipo);
      setResultado(res);
      toast('Análise concluída', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na análise', 'error');
    } finally {
      setLoading(false);
    }
  };

  const spec = resultado?.analise.especificacao;

  return (
    <div>
      <PageHeader
        title="Diagnóstico com IA"
        subtitle="Envie fotos e receba identificação do equipamento ou orientação sobre o problema."
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Atenção:</strong> este recurso é informativo. Para contratar um técnico, use{' '}
        <Link to="/cliente/agendar" className="font-semibold underline">
          Solicitar Serviço
        </Link>
        .
      </div>

      {!resultado ? (
        <Card>
          <h3 className="mb-3 font-semibold text-primary-700">Tipo de análise</h3>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipo(t.id)}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  tipo === t.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-abs-gray hover:border-primary-200'
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <p className="mt-2 font-semibold text-primary-800">{t.label}</p>
                <p className="mt-1 text-xs text-slate-500">{t.hint}</p>
              </button>
            ))}
          </div>

          <h3 className="mb-2 font-semibold text-primary-700">
            {tipo === 'disjuntor' ? 'Detalhes (opcional)' : 'Descreva o problema (opcional)'}
          </h3>
          <textarea
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            placeholder={
              tipo === 'disjuntor'
                ? 'Ex.: Disjuntor do chuveiro desarmando, quadro antigo, dúvida sobre amperagem...'
                : 'Ex.: Chuveiro não esquenta, tomada com mau contato...'
            }
            className="mb-4 w-full rounded-lg border border-abs-gray p-3 text-sm"
            rows={3}
          />

          <div className="mb-4 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-8 text-center">
            <p className="mb-3 text-4xl">{tipo === 'disjuntor' ? '⚡' : '📷'}</p>
            <p className="mb-3 text-sm text-slate-600">
              {tipo === 'disjuntor'
                ? 'Foto nítida do disjuntor (frente + etiqueta/código se possível) e do quadro'
                : 'Fotos nítidas do local ou do equipamento'}
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFotoFiles(Array.from(e.target.files || []))}
              className="text-sm"
            />
            {fotoFiles.length > 0 && (
              <p className="mt-2 text-sm font-medium text-primary-700">{fotoFiles.length} foto(s) selecionada(s)</p>
            )}
          </div>

          <Button variant="cta" onClick={enviar} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Analisando com IA...' : tipo === 'disjuntor' ? 'Identificar disjuntor' : 'Analisar fotos'}
          </Button>
        </Card>
      ) : (
        <Card className="text-center">
          <Logo className="mx-auto h-12" />
          <p className="mt-4 text-sm text-slate-500">
            Confiança da IA: {resultado.analise.confianca ?? '—'}%
            {resultado.analise.fonte === 'simulacao' && ' (modo simulação — configure OPENAI_API_KEY para análise real)'}
          </p>
          {resultado.analise.produtoIdentificado && (
            <p className="mt-2 text-lg font-semibold text-primary-700">{resultado.analise.produtoIdentificado}</p>
          )}
          {resultado.analise.descricao && (
            <p className="mt-2 text-slate-600">{resultado.analise.descricao}</p>
          )}

          {spec && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-primary-100 bg-slate-50 p-4 text-left">
              <h4 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-700">
                Especificações identificadas
              </h4>
              <SpecRow label="Marca" value={spec.marca} />
              <SpecRow label="Modelo / código" value={spec.modelo} />
              <SpecRow label="Nome comercial" value={spec.nomeComercial} />
              <SpecRow label="Amperagem" value={spec.amperagem} />
              <SpecRow label="Tipo" value={spec.tipo} />
              <SpecRow label="Curva" value={spec.curva} />
              <SpecRow label="Tensão" value={spec.tensao} />
              <SpecRow label="Polos" value={spec.polos} />
              <SpecRow label="Estado" value={spec.estadoAparente} />
              <SpecRow label="Substituto compatível" value={spec.compativelSubstituto} />
              {spec.observacoes && (
                <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">{spec.observacoes}</p>
              )}
            </div>
          )}

          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{resultado.orientacao}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="cta" onClick={() => { setResultado(null); setFotoFiles([]); }}>
              Nova análise
            </Button>
            <Link to="/cliente/agendar">
              <Button>Contratar troca de disjuntor</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
