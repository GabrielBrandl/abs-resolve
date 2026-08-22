import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { cashbackOf, money, type ServicoLoja } from '../../storefront/catalog';

export function RelatedRail({
  title,
  subtitle,
  servicos,
  cta = 'Levar junto',
}: {
  title: string;
  subtitle?: string;
  servicos: ServicoLoja[];
  cta?: string;
}) {
  const add = useCartStore((s) => s.add);
  if (!servicos.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-lg font-black text-primary-950">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {servicos.map((s) => {
          const price = s.precoMinimo;
          return (
            <article key={s.slug} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <Link to={`/s/${s.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {s.imagemUrl ? (
                  <img src={s.imagemUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🔧</div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/s/${s.slug}`} className="line-clamp-2 text-sm font-bold text-primary-950">
                  {s.nome}
                </Link>
                <p className="text-sm font-black text-primary-800">{price ? money(price) : s.precoTexto}</p>
                {price ? <p className="text-[11px] font-semibold text-emerald-700">+ {money(cashbackOf(price))} cashback</p> : null}
                <button
                  type="button"
                  disabled={s.tipoPreco === 'sob_orcamento'}
                  onClick={() =>
                    add({
                      slug: s.slug,
                      nome: s.nome,
                      categoria: s.categoria,
                      precoMinimo: s.precoMinimo,
                      precoTexto: s.precoTexto || '',
                      tipoPreco: s.tipoPreco,
                      imagemUrl: s.imagemUrl,
                    })
                  }
                  className="mt-2 rounded-lg bg-accent-500 px-2.5 py-1.5 text-[11px] font-black uppercase text-primary-950 disabled:opacity-40"
                >
                  {s.tipoPreco === 'sob_orcamento' ? 'Ver serviço' : cta}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
