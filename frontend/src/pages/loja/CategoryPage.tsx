import { Link, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { Breadcrumb, SectionTitle } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { categorias, loading } = useCatalog();
  const categoria = categorias.find((c) => c.slug === slug);
  const servicos = categoria ? categoria.servicos : flattenServices(categorias).filter((s) => s.categoria === slug);
  const outras = categorias.filter((c) => c.slug !== slug);

  if (loading) return <Loading />;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: categoria?.nome || 'Categoria' }]} />
      <h1 className="mt-2 text-3xl font-black text-primary-950">{categoria?.nome || 'Serviços'}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Tudo desta categoria em um só lugar. Combine 2 ou 3 serviços e o profissional resolve na mesma visita.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categorias.map((c) => (
          <Link
            key={c.slug}
            to={`/c/${c.slug}`}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              c.slug === slug ? 'bg-primary-800 text-white' : 'bg-white text-primary-800 ring-1 ring-slate-200'
            }`}
          >
            {c.icone} {c.nome}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <SectionTitle title={`Quem olha ${categoria?.nome || 'isso'} também vê ${c.nome}`} to={`/c/${c.slug}`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.servicos.slice(0, 4).map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
