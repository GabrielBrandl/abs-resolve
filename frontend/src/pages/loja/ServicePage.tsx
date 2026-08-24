import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { Breadcrumb, CashbackTag, Stars, TrustRow, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { addToCart } from '../../store/cartStore';
import { solicitacaoApi } from '../../services/modules.service';
import {
  cashbackOf,
  findService,
  frequentlyTogether,
  money,
  priceAfterCashback,
  relatedSameCategory,
} from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';

type Fluxo = {
  perguntas?: Array<{ id: string; titulo: string; opcoes: Array<{ id: string; label: string }> }>;
};

export function ServicePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const servico = findService(categorias, slug);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!slug) return;
    solicitacaoApi.fluxo(slug).then((d) => setFluxo(d as Fluxo)).catch(() => setFluxo(null));
  }, [slug]);

  const price = servico?.precoMinimo || 0;
  const cashback = cashbackOf(price);
  const together = useMemo(() => frequentlyTogether(categorias, slug, 4), [categorias, slug]);
  const sameCategory = useMemo(() => relatedSameCategory(categorias, slug, 4), [categorias, slug]);

  if (loading) return <Loading />;
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
    precoMinimo: servico.precoMinimo,
    precoTexto: servico.precoTexto || '',
    tipoPreco: servico.tipoPreco || 'fixo',
    imagemUrl: servico.imagemUrl,
  };

  const putInCart = () => addToCart(payload, qty);

  const goCart = () => {
    putInCart();
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

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_1fr_19rem]">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {servico.imagemUrl ? (
            <img src={servico.imagemUrl} alt={servico.nome} className="h-[360px] w-full object-cover" />
          ) : (
            <div className="flex h-[360px] items-center justify-center text-7xl">🔧</div>
          )}
          <div className="grid grid-cols-2 gap-2 p-4 text-center text-[11px] font-semibold text-slate-600 sm:grid-cols-4">
            <span>Profissionais verificados</span>
            <span>Garantia {servico.garantiaDias || 90} dias</span>
            <span>Pagamento seguro</span>
            <span>Nota fiscal</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary-600">{servico.categoriaNome}</p>
          <h1 className="mt-1 text-3xl font-black text-primary-950">{servico.nome}</h1>
          <Stars value={4.9} count={186} />
          <p className="mt-4 text-3xl font-black text-primary-800">{price ? money(price) : servico.precoTexto}</p>
          {cashback > 0 && <div className="mt-1"><CashbackTag>10% cashback · você ganha {money(cashback)}</CashbackTag></div>}
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{servico.descricao}</p>

          <div className="mt-6 space-y-4">
            {(fluxo?.perguntas || []).slice(0, 5).map((p, idx) => (
              <div key={p.id}>
                <p className="mb-2 text-sm font-bold text-primary-900">
                  {idx + 1}. {p.titulo}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.opcoes.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setRespostas((r) => ({ ...r, [p.id]: o.id }))}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                        respostas[p.id] === o.id
                          ? 'border-primary-800 bg-primary-800 text-white'
                          : 'border-slate-200 bg-white hover:border-primary-400'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="mb-2 text-sm font-bold">Quantidade</p>
              <div className="flex items-center gap-2">
                <button type="button" className="h-9 w-9 rounded-full border" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
                <span className="w-8 text-center font-black">{qty}</span>
                <button type="button" className="h-9 w-9 rounded-full border" onClick={() => setQty((n) => n + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-md">
          <p className="text-xs font-bold uppercase text-slate-400">Resumo do serviço</p>
          <p className="mt-1 font-bold text-primary-950">{servico.nome}</p>
          <p className="mt-3 text-3xl font-black text-primary-800">{price ? money(price * qty) : servico.precoTexto}</p>
          {cashback > 0 && (
            <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              Com cashback, o próximo pode sair por {money(priceAfterCashback(price))}
            </p>
          )}
          <YellowButton className="mt-4 w-full" onClick={goCart}>
            Adicionar e ir ao carrinho
          </YellowButton>
          <button
            type="button"
            onClick={putInCart}
            className="mt-2 w-full rounded-xl border-2 border-primary-800 py-3 text-sm font-black uppercase text-primary-800"
          >
            Só adicionar ao carrinho
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">Sem cadastro para olhar e montar o pedido. Login só na hora de pagar.</p>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-semibold text-primary-700">
            Precisa de algo diferente? Fale no WhatsApp
          </a>
        </aside>
      </div>

      <div className="mt-8 rounded-3xl bg-white p-5">
        <TrustRow />
      </div>

      <RelatedRail
        title="Aproveite a visita do profissional"
        subtitle="Quem contrata este serviço quase sempre leva estes também — mesmo deslocamento, mais resultado."
        servicos={together}
      />
      <RelatedRail
        title={`Mais da categoria ${servico.categoriaNome || ''}`}
        subtitle="Fica na mesma prateleira. Um clique e entra no pedido."
        servicos={sameCategory}
        cta="Levar da categoria"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-2xl lg:hidden">
        <YellowButton className="w-full" onClick={goCart}>
          Adicionar ao carrinho {price ? money(price * qty) : ''}
        </YellowButton>
      </div>
    </div>
  );
}
