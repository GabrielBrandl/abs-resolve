import { Link } from 'react-router-dom';
import { cashbackOf, money, type ServicoLoja } from '../../storefront/catalog';
import { CashbackTag, Stars } from './store-ui';

export function ServiceCard({
  servico,
  cta = 'Agendar',
  highlight,
}: {
  servico: ServicoLoja;
  cta?: string;
  highlight?: string;
}) {
  const price = servico.precoMinimo;
  const cashback = cashbackOf(price);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/s/${servico.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {servico.imagemUrl ? (
          <img src={servico.imagemUrl} alt={servico.nome} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🔧</div>
        )}
        {highlight && (
          <span className="absolute left-2 top-2 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-black text-primary-950">
            {highlight}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Stars value={4.9} count={186} />
        <Link to={`/s/${servico.slug}`} className="mt-1 line-clamp-2 min-h-10 font-bold text-primary-950">
          {servico.nome}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{servico.descricao}</p>
        <p className="mt-3 text-xs text-slate-500">A partir de</p>
        <p className="text-xl font-black text-primary-800">{price ? money(price) : servico.precoTexto || 'Sob orçamento'}</p>
        {cashback > 0 && <div className="mt-1"><CashbackTag>10% cashback · {money(cashback)}</CashbackTag></div>}
        <Link
          to={`/s/${servico.slug}`}
          className="mt-4 block rounded-xl bg-accent-500 py-2.5 text-center text-sm font-black uppercase tracking-wide text-primary-950"
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}
