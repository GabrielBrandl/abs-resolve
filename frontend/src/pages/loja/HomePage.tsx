import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { CATEGORY_NAV, WHATSAPP_LINK } from '../../storefront/constants';

export function HomePage() {
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias);
  const destaques = servicos.slice(0, 8);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 overflow-hidden rounded-2xl bg-primary-800 text-white lg:grid-cols-[1.2fr_1fr]">
        <div className="p-8">
          <p className="text-sm font-semibold text-accent-400">Manaus · serviços com preço na hora</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Soluções rápidas para sua casa ou empresa.
          </h1>
          <ul className="mt-4 space-y-1 text-sm text-white/85">
            <li>✓ Preço antes da visita</li>
            <li>✓ Agendamento em minutos</li>
            <li>✓ Pagamento 100% seguro</li>
            <li>✓ Garantia de até 90 dias</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/c/eletricista"
              className="rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-primary-900"
            >
              Ver preço e agendar
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
        <div className="hidden items-end bg-primary-700 p-6 lg:flex">
          <div className="rounded-xl bg-white/10 p-5 text-sm">
            <p className="text-accent-400">4,8 · mais de 2.000 avaliações</p>
            <p className="mt-2 font-medium">Profissional uniformizado, identificado e com garantia ABS.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORY_NAV.filter((c, i, arr) => arr.findIndex((x) => x.label === c.label) === i).map((c) => (
          <Link
            key={c.label}
            to={`/c/${c.slug}`}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:border-primary-400"
          >
            <p className="text-2xl">{c.icon}</p>
            <p className="mt-2 text-sm font-semibold text-primary-800">{c.label}</p>
          </Link>
        ))}
      </section>

      <section id="ofertas">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary-900">Mais contratados</h2>
            <p className="text-sm text-slate-500">Os serviços que a ABS mais resolve em Manaus</p>
          </div>
          <Link to="/busca" className="text-sm font-semibold text-primary-700">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((s) => (
            <ServiceCard key={s.slug} servico={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
