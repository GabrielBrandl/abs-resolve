import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { Breadcrumb, Stars, TrustStrip, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { addToCart } from '../../store/cartStore';
import { solicitacaoApi } from '../../services/modules.service';
import { funil } from '../../utils/gtm';
import {
  findService,
  frequentlyTogether,
  fotoServico,
  money,
  relatedSameCategory,
} from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { isPecaSlug, pecasDoServico } from '../../storefront/pecas';

type FluxoPergunta = {
  id: string;
  titulo: string;
  opcoes: Array<{ id: string; label: string }>;
  showIf?: { perguntaId: string; opcaoIds: string[] };
};

type Fluxo = {
  perguntas?: FluxoPergunta[];
};

function perguntasVisiveis(perguntas: FluxoPergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    return val != null && p.showIf.opcaoIds.includes(val);
  });
}

function quantidadeDaResposta(opcaoId: string) {
  if (opcaoId === 'mais-4' || opcaoId === '4-ou-mais' || opcaoId === '3-ou-mais') return 5;
  const n = Number(opcaoId);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function ServicePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const servico = findService(categorias, slug);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [precoCalculado, setPrecoCalculado] = useState<number | null>(null);
  const [erroPerguntas, setErroPerguntas] = useState('');

  useEffect(() => {
    if (!slug) return;
    solicitacaoApi.fluxo(slug).then((d) => setFluxo(d as Fluxo)).catch(() => setFluxo(null));
  }, [slug]);

  const perguntasBasicas = useMemo(() => (fluxo?.perguntas || []).slice(0, 5), [fluxo?.perguntas]);
  const visiveis = useMemo(
    () => perguntasVisiveis(perguntasBasicas, respostas),
    [perguntasBasicas, respostas]
  );
  const todasRespondidas =
    visiveis.length === 0 || visiveis.every((p) => Boolean(respostas[p.id]));

  useEffect(() => {
    if (!slug || !todasRespondidas || visiveis.length === 0) {
      setPrecoCalculado(null);
      return;
    }
    let cancelled = false;
    solicitacaoApi
      .calcularPreco({ slug, respostas, quantidade: qty })
      .then((r) => {
        if (!cancelled) setPrecoCalculado(Number(r.preco));
      })
      .catch(() => {
        if (!cancelled) setPrecoCalculado(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, respostas, qty, todasRespondidas, visiveis.length]);

  const price = servico?.precoMinimo || 0;
  const precoUnitario = precoCalculado ?? price;
  const together = useMemo(() => frequentlyTogether(categorias, slug, 4), [categorias, slug]);
  const sameCategory = useMemo(() => relatedSameCategory(categorias, slug, 4), [categorias, slug]);
  const pecas = useMemo(() => pecasDoServico(slug).slice(0, 4), [slug]);

  useEffect(() => {
    if (!servico) return;
    funil.visualizouServico({
      slug: servico.slug,
      nome: servico.nome,
      categoria: servico.categoria,
    });
  }, [servico?.slug]);

  if (loading) return <Loading />;
  if (isPecaSlug(slug)) return <Navigate to={`/p/${slug}`} replace />;
  if (!servico) {
    return (
      <div>
        <h1 className="text-xl font-bold">Serviço não encontrado</h1>
        <Link to="/" className="mt-3 inline-block text-primary-700">Voltar à loja</Link>
      </div>
    );
  }

  const payload = {
    slug: servico.slug,
    nome: servico.nome,
    categoria: servico.categoria,
    precoMinimo: precoUnitario,
    precoTexto: servico.precoTexto || '',
    tipoPreco: servico.tipoPreco || 'fixo',
    imagemUrl: servico.imagemUrl,
    ...(visiveis.length > 0 ? { respostas } : {}),
  };

  const escolherResposta = (perguntaId: string, opcaoId: string) => {
    setErroPerguntas('');
    setRespostas((r) => ({ ...r, [perguntaId]: opcaoId }));
    if (perguntaId === 'quantidade') {
      setQty(quantidadeDaResposta(opcaoId));
    }
  };

  const validarPerguntas = () => {
    if (visiveis.length === 0) return true;
    const faltando = visiveis.find((p) => !respostas[p.id]);
    if (faltando) {
      setErroPerguntas(`Responda: ${faltando.titulo}`);
      return false;
    }
    return true;
  };

  const putInCart = () => {
    if (!validarPerguntas()) return;
    addToCart(payload, qty);
  };

  const goCart = () => {
    if (!validarPerguntas()) return;
    funil.clicouComprarAgendar({
      slug: servico.slug,
      nome: servico.nome,
      origem: 'pagina_servico',
      valor: precoUnitario ? precoUnitario * qty : undefined,
    });
    addToCart(payload, qty);
    navigate('/carrinho');
  };

  return (
    <div className="pb-24 lg:pb-0">
      <Breadcrumb
        items={[
          { label: 'Início', to: '/' },
          { label: servico.categoriaNome || 'Serviços', to: `/c/${servico.categoria}` },
          { label: servico.nome },
        ]}
      />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.05fr_1fr_20rem]">
        <div className="overflow-hidden rounded-[12px] bg-white shadow-sm">
          <img
            src={`${fotoServico(servico)}${fotoServico(servico).includes('?') ? '&' : '?'}v=3`}
            alt={servico.nome}
            className="h-[280px] w-full object-cover object-center"
          />
          <TrustStrip garantiaDias={servico.garantiaDias || 90} />
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#002d62]">{servico.categoriaNome}</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight text-[#111827]">{servico.nome}</h1>
          <Stars value={4.9} count={186} />
          <div className="mt-4 rounded-[10px] border border-[#e6e8ee] bg-[#f8fafc] p-4">
            <p className="text-xs text-slate-500">{visiveis.length > 0 ? 'A partir de' : 'Preço fixo'}</p>
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-[32px] font-black text-[#002d62]">
                {precoUnitario ? money(precoUnitario) : servico.precoTexto}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{servico.descricao}</p>

          <div className="mt-6 space-y-4">
            {visiveis.map((p, idx) => (
              <div key={p.id}>
                <p className="mb-2 text-sm font-bold text-[#002d62]">
                  {idx + 1}. {p.titulo}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.opcoes.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => escolherResposta(p.id, o.id)}
                      className={`min-w-[7rem] rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
                        respostas[p.id] === o.id
                          ? 'border-[#002d62] bg-[#e8f0ff] text-[#002d62]'
                          : 'border-slate-200 bg-white hover:border-[#002d62]/40'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {visiveis.length === 0 && (
              <div>
                <p className="mb-2 text-sm font-bold">Quantidade</p>
                <div className="flex w-fit items-center overflow-hidden rounded-md border border-[#d5d9e2]">
                  <button type="button" className="h-9 w-9" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
                  <span className="w-8 text-center font-black">{qty}</span>
                  <button type="button" className="h-9 w-9" onClick={() => setQty((n) => n + 1)}>+</button>
                </div>
              </div>
            )}
            {erroPerguntas && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroPerguntas}</p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#002d62]">Resumo do serviço</p>
            {visiveis.length > 0 && (
              <button type="button" className="text-xs font-bold text-[#1d4ed8]" onClick={() => { setRespostas({}); setErroPerguntas(''); }}>
                Limpar
              </button>
            )}
          </div>
          <p className="mt-2 font-bold text-[#111827]">{servico.nome}</p>
          <p className="mt-3 text-[30px] font-black text-[#002d62]">
            {precoUnitario ? money(precoUnitario * qty) : servico.precoTexto}
          </p>
          <YellowButton className="mt-4 w-full" onClick={goCart}>
            Comprar e agendar
          </YellowButton>
          <button
            type="button"
            onClick={putInCart}
            className="mt-2 w-full rounded-lg border-2 border-[#002d62] py-3 text-sm font-black uppercase text-[#002d62]"
          >
            Adicionar ao carrinho
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">Sem cadastro obrigatório. Login só se você quiser.</p>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-semibold text-[#002d62]">
            Precisa de algo diferente? Fale no WhatsApp
          </a>
        </aside>
      </div>

      <div className="mt-6 rounded-[12px] bg-[#fff4cc] p-4">
        <RelatedRail
          title="Aproveite a visita do profissional"
          subtitle="Adicione outros serviços e economize no mesmo atendimento."
          servicos={together}
        />
      </div>
      {pecas.length > 0 && (
        <RelatedRail
          title="Peças avulsas deste serviço"
          subtitle="Leve a peça agora e, se quiser, a instalação no mesmo pedido."
          servicos={pecas}
        />
      )}
      <RelatedRail
        title={`Mais da categoria ${servico.categoriaNome || ''}`}
        subtitle="Fica na mesma prateleira. Um clique e entra no pedido."
        servicos={sameCategory}
        cta="Levar da categoria"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-2xl lg:hidden">
        <YellowButton className="w-full" onClick={goCart}>
          Adicionar ao carrinho {precoUnitario ? money(precoUnitario * qty) : ''}
        </YellowButton>
      </div>
    </div>
  );
}
