import { Link } from 'react-router-dom';
import { cashbackOf, money, type ServicoLoja } from '../../storefront/catalog';

export function ServiceCard({
  servico,
  cta = 'Ver preço e agendar',
}: {
  servico: ServicoLoja;
  cta?: string;
}) {
  const price = servico.precoMinimo;
  const cashback = cashbackOf(price);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link to={`/s/${servico.slug}`} className="block aspect-[4/3] overflow-hidden bg-slate-100">
        {servico.imagemUrl ? (
          <img src={servico.imagemUrl} alt={servico.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🔧</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">Avaliação 4,9</p>
        <Link to={`/s/${servico.slug}`} className="mt-1 line-clamp-2 font-semibold text-primary-900">
          {servico.nome}
        </Link>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{servico.descricao}</p>
        <p className="mt-3 text-lg font-bold text-primary-800">
          {price ? `A partir de ${money(price)}` : servico.precoTexto || 'Sob orçamento'}
        </p>
        {cashback > 0 && (
          <p className="text-xs font-semibold text-emerald-700">10% cashback · {money(cashback)}</p>
        )}
        <Link
          to={`/s/${servico.slug}`}
          className="mt-3 block rounded-lg bg-primary-700 py-2 text-center text-sm font-bold text-white hover:bg-primary-800"
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}
