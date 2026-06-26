import { useState } from 'react';
import { Link } from 'react-router-dom';
import { diagnosticoApi } from '../../services/modules.service';
import { PageHeader, Card, Button, Logo } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface Analise {
  confianca?: number;
  descricao?: string;
  produtoIdentificado?: string;
  acao?: string;
  fonte?: string;
}

export function DiagnosticoIAPage() {
  const { toast } = useToast();
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
      const res = await diagnosticoApi.analisar(fotoFiles, contexto);
      setResultado(res);
      toast('Análise concluída', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na análise', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Diagnóstico com IA"
        subtitle="Suporte ao cliente — envie fotos e receba orientação. Não substitui a contratação do serviço."
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Atenção:</strong> este recurso é apenas informativo. Para contratar um técnico, use{' '}
        <Link to="/cliente/agendar" className="font-semibold underline">
          Solicitar Serviço
        </Link>{' '}
        e adicione os itens ao carrinho.
      </div>

      {!resultado ? (
        <Card>
          <h3 className="mb-2 font-semibold text-primary-700">Descreva o problema (opcional)</h3>
          <textarea
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            placeholder="Ex.: Chuveiro não esquenta, tomada com mau contato..."
            className="mb-4 w-full rounded-lg border border-abs-gray p-3 text-sm"
            rows={3}
          />

          <div className="mb-4 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-8 text-center">
            <p className="mb-3 text-4xl">📷</p>
            <p className="mb-3 text-sm text-slate-600">Fotos nítidas do local ou do equipamento</p>
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
            {loading ? 'Analisando com IA...' : 'Analisar fotos'}
          </Button>
        </Card>
      ) : (
        <Card className="text-center">
          <Logo className="mx-auto h-12" />
          <p className="mt-4 text-sm text-slate-500">
            Confiança da IA: {resultado.analise.confianca ?? '—'}%
            {resultado.analise.fonte === 'simulacao' && ' (modo simulação)'}
          </p>
          {resultado.analise.produtoIdentificado && (
            <p className="mt-2 font-semibold text-primary-700">{resultado.analise.produtoIdentificado}</p>
          )}
          {resultado.analise.descricao && (
            <p className="mt-2 text-slate-600">{resultado.analise.descricao}</p>
          )}
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{resultado.orientacao}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="cta" onClick={() => { setResultado(null); setFotoFiles([]); }}>
              Nova análise
            </Button>
            <Link to="/cliente/agendar">
              <Button>Ir para catálogo de serviços</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
