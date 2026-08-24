import { Link, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { Breadcrumb, SectionTitle, TrustRow } from '../../components/loja/store-ui';
import { CategoryPhotoChip } from '../../components/loja/ShopSidebar';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { CATEGORY_NAV } from '../../storefront/constants';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { categorias, loading } = useCatalog();
  const categoria = categorias.find((c) => c.slug === slug);
  const servicos = categoria ? categoria.servicos : flattenServices(categorias).filter((s) => s.categoria === slug);
  const outras = categorias.filter((c) => c.slug !== slug);
  const cover = CATEGORY_NAV.find((c) => c.slug === slug)?.image || servicos[0]?.imagemUrl;

  if (loading) return <Loading />;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: categoria?.nome || 'Categoria' }]} />
      <div className="mt-3 overflow-hidden rounded-3xl bg-primary-900 text-white lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6">
          <p className="text-xs font-black uppercase tracking-wide text-accent-400">Categoria</p>
          <h1 className="mt-1 text-3xl font-black">{categoria?.nome || 'Serviços'}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/80">
            Tudo desta prateleira em um só lugar. Combine 2 ou 3 serviços e o profissional resolve na mesma visita.
          </p>
        </div>
        {cover && <img src={cover} alt="" className="hidden h-40 w-full object-cover lg:block" />}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
        {CATEGORY_NAV.filter((c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i).map((c) => (
          <CategoryPhotoChip key={c.slug} slug={c.slug} label={c.label} image={c.image} active={c.slug === slug} />
        ))}
      </div>

      <div className="mt-5">
        <TrustRow compact />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {servicos.map((s, i) => (
          <ServiceCard key={s.slug} servico={s} highlight={i === 0 ? 'Mais pedido' : undefined} />
        ))}
      </div>
      {servicos.length === 0 && (
        <p className="mt-8 text-slate-500">
          Nenhum serviço nesta categoria.{' '}
          <Link to="/" className="font-bold text-primary-700">
            Ver a loja
          </Link>
        </p>
      )}

      {outras.map((c) => (
        <section key={c.slug} className="mt-10">
          <SectionTitle title={`Quem olha ${categoria?.nome || 'isso'} também leva ${c.nome}`} to={`/c/${c.slug}`} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {c.servicos.slice(0, 4).map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
