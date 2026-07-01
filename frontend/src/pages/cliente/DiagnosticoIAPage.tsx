import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { diagnosticoApi } from '../../services/modules.service';
import { PageHeader, Card, Button, Logo, Loading } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface ServicoDiagnostico {
  slug: string;
  nome: string;
  dicaFoto: string;
}

interface CategoriaDiagnostico {
  slug: string;
  nome: string;
  icone: string;
  cor: string;
  servicos: ServicoDiagnostico[];
}

interface AtributoProduto {
  label: string;
  valor: string;
}

interface EspecificacaoProduto {
  categoriaProduto?: string | null;
  servicoCatalogoSlug?: string | null;
  servicoCatalogoNome?: string | null;
  modelo?: string | null;
  nomeComercial?: string | null;
  tipo?: string | null;
  atributos?: AtributoProduto[];
  estadoAparente?: string | null;
  compativelSubstituto?: string | null;
  observacoes?: string | null;
}

interface Analise {
  confianca?: number;
  descricao?: string;
  produtoIdentificado?: string;
  acao?: string;
  fonte?: string;
  especificacao?: EspecificacaoProduto;
}

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
  const [catalogo, setCatalogo] = useState<CategoriaDiagnostico[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('eletricista');
  const [servicoSlug, setServicoSlug] = useState<string>('auto');
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [contexto, setContexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ analise: Analise; orientacao?: string } | null>(null);

  useEffect(() => {
    diagnosticoApi.catalogo()
      .then((cats) => {
        setCatalogo(cats);
        if (cats.length) setCategoriaAtiva(cats[0].slug);
      })
      .catch(() => toast('Erro ao carregar catálogo', 'error'))
      .finally(() => setLoadingCatalogo(false));
  }, [toast]);

  const categoria = useMemo(
    () => catalogo.find((c) => c.slug === categoriaAtiva),
    [catalogo, categoriaAtiva]
  );

  const servicoSelecionado = useMemo(() => {
    if (servicoSlug === 'auto') return null;
    return categoria?.servicos.find((s) => s.slug === servicoSlug)
      ?? catalogo.flatMap((c) => c.servicos).find((s) => s.slug === servicoSlug);
  }, [servicoSlug, categoria, catalogo]);

  const dicaFoto = servicoSelecionado?.dicaFoto
    ?? 'Foto nítida do produto, etiqueta/modelo e local de instalação';

  const enviar = async () => {
    if (!fotoFiles.length) {
      toast('Selecione pelo menos uma foto', 'error');
      return;
    }
    setLoading(true);
    try {
      const slug = servicoSlug === 'auto' ? undefined : servicoSlug;
      const res = await diagnosticoApi.analisar(fotoFiles, contexto, slug);
      setResultado(res);
      toast('Análise concluída', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na análise', 'error');
    } finally {
      setLoading(false);
    }
  };

  const spec = resultado?.analise.especificacao;
  const servicoContratar = spec?.servicoCatalogoSlug;

  if (loadingCatalogo) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Diagnóstico com IA"
        subtitle="Identifique o produto por foto — análise automática com possibilidade de erro"
      />

      <Card className="mb-4 border border-amber-200 bg-amber-50/80">
        <p className="text-sm text-amber-900">
          <strong>Atenção:</strong> este diagnóstico é realizado por inteligência artificial. Pode haver erros na
          identificação (margem estimada de até 15%). Use o resultado como orientação e confira as informações antes de
          contratar.
        </p>
      </Card>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Para contratar com preço calculado, use{' '}
        <Link to="/cliente/agendar" className="font-semibold text-primary-600 underline">
          Solicitar Serviço
        </Link>
        {' '}(o diagnóstico por IA também está integrado às perguntas).
      </div>

      {!resultado ? (
        <Card>
          <h3 className="mb-3 font-semibold text-primary-700">1. Categoria do produto</h3>
          <div className="mb-6 flex flex-wrap gap-2">
            {catalogo.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => { setCategoriaAtiva(cat.slug); setServicoSlug('auto'); }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  categoriaAtiva === cat.slug
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-primary-50'
                }`}
              >
                {cat.icone} {cat.nome}
              </button>
            ))}
          </div>

          <h3 className="mb-3 font-semibold text-primary-700">2. Qual produto? (opcional)</h3>
          <div className="mb-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setServicoSlug('auto')}
              className={`rounded-xl border-2 p-3 text-left text-sm transition ${
                servicoSlug === 'auto' ? 'border-primary-500 bg-primary-50' : 'border-abs-gray'
              }`}
            >
              <span className="font-semibold">🔍 Deixar a IA identificar</span>
              <p className="mt-1 text-xs text-slate-500">A IA escolhe o produto/serviço mais provável</p>
            </button>
            {categoria?.servicos.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setServicoSlug(s.slug)}
                className={`rounded-xl border-2 p-3 text-left text-sm transition ${
                  servicoSlug === s.slug ? 'border-primary-500 bg-primary-50' : 'border-abs-gray'
                }`}
              >
                <span className="font-semibold">{s.nome}</span>
              </button>
            ))}
          </div>

          <h3 className="mb-2 font-semibold text-primary-700">3. Detalhes (opcional)</h3>
          <textarea
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            placeholder="Ex.: Tomada esquentando, chuveiro fraco, disjuntor desarmando..."
            className="mb-4 w-full rounded-lg border border-abs-gray p-3 text-sm"
            rows={3}
          />

          <div className="mb-4 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-8 text-center">
            <p className="mb-3 text-4xl">📷</p>
            <p className="mb-1 text-sm font-medium text-primary-800">
              {servicoSelecionado?.nome ?? 'Identificação automática'}
            </p>
            <p className="mb-3 text-sm text-slate-600">{dicaFoto}</p>
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
            {loading ? 'Analisando com IA...' : 'Identificar produto'}
          </Button>
        </Card>
      ) : (
        <Card className="text-center">
          <Logo variant="card" className="mx-auto h-14" />
          <p className="mt-4 text-sm text-slate-500">
            Confiança da IA: {resultado.analise.confianca ?? '—'}%
            {resultado.analise.fonte === 'simulacao' && ' (modo simulação — configure OPENAI_API_KEY para análise real)'}
          </p>
          {resultado.analise.produtoIdentificado && (
            <p className="mt-2 text-lg font-semibold text-primary-700">{resultado.analise.produtoIdentificado}</p>
          )}
          {spec?.servicoCatalogoNome && (
            <p className="mt-1 text-sm text-primary-600">Serviço relacionado: {spec.servicoCatalogoNome}</p>
          )}
          {resultado.analise.descricao && (
            <p className="mt-2 text-slate-600">{resultado.analise.descricao}</p>
          )}

          {spec && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-primary-100 bg-slate-50 p-4 text-left">
              <h4 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-700">
                Especificações identificadas
              </h4>
              <SpecRow label="Categoria" value={spec.categoriaProduto} />
              <SpecRow label="Modelo / código" value={spec.modelo} />
              <SpecRow label="Nome comercial" value={spec.nomeComercial} />
              <SpecRow label="Tipo" value={spec.tipo} />
              {spec.atributos
                ?.filter((a) => !/^marca$/i.test(a.label))
                .map((a) => (
                <SpecRow key={`${a.label}-${a.valor}`} label={a.label} value={a.valor} />
              ))}
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
              <Button>{servicoContratar ? 'Contratar serviço' : 'Ver catálogo de serviços'}</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
