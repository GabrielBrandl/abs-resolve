import { Link, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { Breadcrumb } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { categorias, loading } = useCatalog();
  const categoria = categorias.find((c) => c.slug === slug);
  const servicos = categoria ? categoria.servicos : flattenServices(categorias).filter((s) => s.categoria === slug);

  if (loading) return <Loading />;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: categoria?.nome || 'Categoria' }]} />
      <h1 className="mt-2 text-3xl font-black text-primary-950">{categoria?.nome || 'Serviços'}</h1>
      <p className="mt-1 text-sm text-slate-500">{servicos.length} opções com preço visível, cashback e garantia ABS.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {servicos.map((s) => (
          <ServiceCard key={s.slug} servico={s} />
        ))}
      </div>
      {servicos.length === 0 && (
        <p className="mt-8 text-slate-500">
          Nenhum serviço nesta categoria.{' '}
          <Link to="/" className="font-bold text-primary-700">
            Ver todos
          </Link>
        </p>
      )}
    </div>
  );
}
