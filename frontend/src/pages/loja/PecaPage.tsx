import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { Breadcrumb, CashbackTag, TrustStrip, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { addToCart } from '../../store/cartStore';
import { cashbackOf, findService, fotoServico, money } from '../../storefront/catalog';
import { findPeca, pecasDoServico } from '../../storefront/pecas';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';

export function PecaPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const { cashbackPercent } = useStoreConfig();
  const peca = findPeca(slug) || findService(categorias, slug);
  const [qty, setQty] = useState(1);

  const relatedService = peca?.servicoRelacionado ? findService(categorias, peca.servicoRelacionado) : null;
  const otherParts = useMemo(
    () => pecasDoServico(peca?.servicoRelacionado || '').filter((p) => p.slug !== slug).slice(0, 4),
    [peca?.servicoRelacionado, slug]
  );

  if (loading) return <Loading />;
  if (!peca) {
    return (
      <div>
        <h1 className="text-xl font-bold">Peça não encontrada</h1>
        <Link to="/busca?q=peca" className="mt-3 inline-block text-primary-700">
          Ver peças
        </Link>
      </div>
    );
  }

  const price = peca.precoMinimo || 0;
  const cashback = cashbackOf(price, cashbackPercent);
  const payload = {
    slug: peca.slug,
    nome: peca.nome,
    categoria: peca.categoria,
    precoMinimo: peca.precoMinimo,
    precoTexto: peca.precoTexto || '',
    tipoPreco: peca.tipoPreco || 'fixo',
    imagemUrl: peca.imagemUrl,
    tipo: 'peca' as const,
    servicoRelacionado: peca.servicoRelacionado,
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
          { label: 'Peças avulsas', to: '/c/pecas' },
          { label: peca.nome },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr_20rem]">
        <div className="overflow-hidden rounded-[12px] bg-white shadow-sm">
          <img src={fotoServico(peca)} alt={peca.nome} className="h-[280px] w-full object-cover object-center" />
          <TrustStrip garantiaDias={peca.garantiaDias || 90} />
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#002d62]">Peça avulsa</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight text-[#111827]">{peca.nome}</h1>
          <div className="mt-4 rounded-[10px] border border-[#e6e8ee] bg-[#f8fafc] p-4">
            <p className="text-xs text-slate-500">Preço da peça</p>
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-[32px] font-black text-[#002d62]">{price ? money(price) : peca.precoTexto}</p>
              {cashback > 0 && <CashbackTag>{percentLabel(cashbackPercent)}% CASHBACK</CashbackTag>}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{peca.descricao}</p>
          <p className="mt-3 text-sm text-slate-500">
            A instalação não está inclusa. Se quiser, adicione o serviço de troca no mesmo pedido.
          </p>
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold">Quantidade</p>
            <div className="flex w-fit items-center overflow-hidden rounded-md border border-[#d5d9e2]">
              <button type="button" className="h-9 w-9" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                −
              </button>
              <span className="w-8 text-center font-black">{qty}</span>
              <button type="button" className="h-9 w-9" onClick={() => setQty((n) => n + 1)}>
                +
              </button>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-black text-[#002d62]">Resumo da peça</p>
          <p className="mt-2 font-bold text-[#111827]">{peca.nome}</p>
          <p className="mt-3 text-[30px] font-black text-[#002d62]">{price ? money(price * qty) : peca.precoTexto}</p>
          <YellowButton className="mt-4 w-full" onClick={goCart}>
            Comprar peça
          </YellowButton>
          <button
            type="button"
            onClick={putInCart}
            className="mt-2 w-full rounded-lg border-2 border-[#002d62] py-3 text-sm font-black uppercase text-[#002d62]"
          >
            Adicionar ao carrinho
          </button>
          {relatedService && (
            <Link
              to={`/s/${relatedService.slug}`}
              className="mt-3 block text-center text-xs font-semibold text-[#002d62] underline"
            >
              Também quero a instalação ({relatedService.nome})
            </Link>
          )}
        </aside>
      </div>

      {relatedService && (
        <div className="mt-6">
          <RelatedRail
            title="Instale com a ABS"
            subtitle="Leve a peça e o serviço no mesmo pedido."
            servicos={[relatedService]}
          />
        </div>
      )}
      {otherParts.length > 0 && (
        <RelatedRail title="Outras peças desta linha" subtitle="Combine no mesmo pedido." servicos={otherParts} />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-2xl lg:hidden">
        <YellowButton className="w-full" onClick={goCart}>
          Comprar peça {price ? money(price * qty) : ''}
        </YellowButton>
      </div>
    </div>
  );
}
