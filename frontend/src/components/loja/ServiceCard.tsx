import { Link, useNavigate } from 'react-router-dom';
import { cashbackOf, money, type ServicoLoja } from '../../storefront/catalog';
import { addToCart } from '../../store/cartStore';
import { CashbackTag, Stars } from './store-ui';

export function ServiceCard({
  servico,
  cta = 'Comprar',
  highlight,
}: {
  servico: ServicoLoja;
  cta?: string;
  highlight?: string;
}) {
  const navigate = useNavigate();
  const price = servico.precoMinimo;
  const cashback = cashbackOf(price);
  const canBuy = servico.tipoPreco !== 'sob_orcamento';

  const addAndGo = () => {
    if (!canBuy) {
      navigate(`/s/${servico.slug}`);
      return;
    }
    addToCart({
      slug: servico.slug,
      nome: servico.nome,
      categoria: servico.categoria,
      precoMinimo: servico.precoMinimo,
      precoTexto: servico.precoTexto || '',
      tipoPreco: servico.tipoPreco || 'fixo',
      imagemUrl: servico.imagemUrl,
    });
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/s/${servico.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {servico.imagemUrl ? (
          <img src={servico.imagemUrl} alt={servico.nome} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-slate-200" />
        )}
        {highlight && (
          <span className="absolute left-2 top-2 rounded-full bg-accent-500 px-2.5 py-0.5 text-[10px] font-black text-primary-950">
            {highlight}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Stars value={4.9} count={186} />
        <Link to={`/s/${servico.slug}`} className="mt-1 line-clamp-2 min-h-10 font-bold text-primary-950">
          {servico.nome}
        </Link>
        <p className="mt-3 text-xs text-slate-500">A partir de</p>
        <p className="text-xl font-black text-primary-800">{price ? money(price) : servico.precoTexto || 'Sob orçamento'}</p>
        {cashback > 0 && (
          <div className="mt-1">
            <CashbackTag>10% cashback · {money(cashback)}</CashbackTag>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to={`/s/${servico.slug}`}
            className="rounded-full border border-primary-800 py-2 text-center text-xs font-black uppercase text-primary-800"
          >
            Ver
          </Link>
          <button
            type="button"
            onClick={addAndGo}
            className="rounded-full bg-accent-500 py-2 text-xs font-black uppercase text-primary-950"
          >
            {canBuy ? 'Levar' : cta}
          </button>
        </div>
      </div>
    </article>
  );
}
