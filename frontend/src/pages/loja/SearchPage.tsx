import { useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { useCatalog } from '../../hooks/useCatalog';
import { searchServices } from '../../storefront/catalog';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { categorias, loading } = useCatalog();
  const resultados = searchServices(categorias, q);

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary-900">{q ? `Resultados para “${q}”` : 'Todos os serviços'}</h1>
      <p className="mt-1 text-sm text-slate-500">{resultados.length} serviços encontrados</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resultados.map((s) => (
          <ServiceCard key={s.slug} servico={s} />
        ))}
      </div>
      {resultados.length === 0 && (
        <p className="mt-8 text-slate-500">Não encontramos esse serviço. Tente “tomada”, “chuveiro” ou “ar-condicionado”.</p>
      )}
    </div>
  );
}
