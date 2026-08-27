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
  const pecas = resultados.filter((s) => s.tipo === 'peca' || s.slug.startsWith('peca-'));
  const servicos = resultados.filter((s) => s.tipo !== 'peca' && !s.slug.startsWith('peca-'));

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-3xl font-black text-primary-950">{q ? `Resultados para “${q}”` : 'Catálogo ABS Resolve'}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {resultados.length} {resultados.length === 1 ? 'item encontrado' : 'itens encontrados'}
        {servicos.length || pecas.length
          ? ` · ${servicos.length} serviço${servicos.length === 1 ? '' : 's'} · ${pecas.length} peça${pecas.length === 1 ? '' : 's'}`
          : ''}
      </p>

      {servicos.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-black text-[#002d62]">Serviços</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {servicos.map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      )}

      {pecas.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-black text-[#002d62]">Peças avulsas</h2>
          <p className="mb-3 text-sm text-slate-500">Compre a peça agora. A instalação pode ser adicionada no mesmo pedido.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pecas.map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      )}

      {resultados.length === 0 && (
        <p className="mt-8 text-slate-500">
          Não encontramos esse item. Tente “tomada”, “tom”, “interruptor”, “chuveiro” ou “peça”.
        </p>
      )}
    </div>
  );
}
