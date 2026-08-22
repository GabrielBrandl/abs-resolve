import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { SectionTitle, TrustRow, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { CATEGORY_NAV, WHATSAPP_LINK } from '../../storefront/constants';

const STEPS = [
  ['1', 'Escolha o serviço', 'Preço na hora, sem visita só para orçar.'],
  ['2', 'Agende o horário', 'Hoje, amanhã ou no dia que preferir.'],
  ['3', 'Pague online', 'PIX, cartão ou débito. 100% seguro.'],
  ['4', 'A ABS resolve', 'Profissional verificado, com garantia e nota fiscal.'],
];

export function HomePage() {
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias);
  const destaques = servicos.slice(0, 8);
  const cats = CATEGORY_NAV.filter((c, i, arr) => arr.findIndex((x) => x.label === c.label) === i);

  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-primary-800 text-white lg:grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-8 md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-400">Manaus · preço antes da visita</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight md:text-5xl">
            Soluções rápidas para sua casa ou empresa.
          </h1>
          <ul className="mt-5 space-y-2 text-sm text-white/85">
            <li>✓ Preço antes da visita</li>
            <li>✓ Agendamento em minutos</li>
            <li>✓ Pagamento 100% seguro</li>
            <li>✓ Garantia de até 90 dias</li>
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/c/eletricista">
              <YellowButton>Ver preço e agendar</YellowButton>
            </Link>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="rounded-xl border border-white/30 px-4 py-3 text-sm font-bold">
              Falar no WhatsApp
            </a>
          </div>
        </div>
        <div className="relative hidden min-h-[280px] bg-gradient-to-br from-primary-700 to-primary-950 p-8 lg:block">
          <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-white/10 p-5 backdrop-blur">
            <p className="text-accent-400">★ 4,8 · mais de 2.000 avaliações</p>
            <p className="mt-2 text-lg font-bold">Profissional uniformizado, identificado e com garantia ABS.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cats.map((c) => (
          <Link
            key={c.label}
            to={`/c/${c.slug}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-primary-400"
          >
            <p className="text-2xl">{c.icon}</p>
            <p className="mt-2 text-xs font-bold text-primary-900">{c.label}</p>
          </Link>
        ))}
      </section>

      <section id="ofertas">
        <SectionTitle title="Mais contratados" subtitle="Os serviços que a ABS mais resolve em Manaus" to="/busca" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((s, i) => (
            <ServiceCard key={s.slug} servico={s} highlight={i < 3 ? 'Mais vendido' : undefined} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <SectionTitle title="Como funciona" subtitle="Do clique à conclusão, sem burocracia" />
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl bg-primary-50 p-4">
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-black text-primary-950">
                {n}
              </p>
              <p className="mt-3 font-bold text-primary-900">{t}</p>
              <p className="mt-1 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-accent-500 p-6 text-primary-950 md:flex md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase">Cashback ABS</p>
          <p className="mt-1 text-2xl font-black">10% de volta em todo serviço concluído.</p>
          <p className="text-sm">Use no próximo agendamento. Sem pegadinha.</p>
        </div>
        <Link to="/cadastro" className="mt-4 inline-block rounded-xl bg-primary-900 px-5 py-3 text-sm font-black text-white md:mt-0">
          Criar conta grátis
        </Link>
      </section>

      <TrustRow />
    </div>
  );
}
