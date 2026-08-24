import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { CategoryPhotoGrid } from '../../components/loja/ShopSidebar';
import { SectionTitle, TrustRow, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';

const STEPS = [
  ['1', 'Escolha o serviço', 'Preço na hora, sem visita só para orçar.'],
  ['2', 'Complete o pedido', 'Leve serviços da mesma visita e economize tempo.'],
  ['3', 'Pague online', 'PIX, cartão ou débito. 100% seguro.'],
  ['4', 'A ABS resolve', 'Profissional verificado, com garantia e nota fiscal.'],
];

export function HomePage() {
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias);
  const destaques = servicos.slice(0, 8);

  if (loading) return <Loading />;

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-primary-800 text-white lg:grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-8 md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent-400">Manaus · vitrine de serviços</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight md:text-5xl">
            Compre o serviço certo. Leve o que a casa precisa na mesma visita.
          </h1>
          <ul className="mt-5 space-y-2 text-sm text-white/85">
            <li>✓ Elétrica, hidráulica, montagem e ar-condicionado</li>
            <li>✓ Preço na hora e combos da mesma categoria</li>
            <li>✓ Pagamento seguro e 10% de cashback</li>
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/c/eletricista">
              <YellowButton className="rounded-full">Começar por Elétrica</YellowButton>
            </Link>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="rounded-full border border-white/30 px-4 py-3 text-sm font-bold">
              Falar no WhatsApp
            </a>
          </div>
        </div>
        <div className="relative hidden min-h-[280px] lg:block">
          <img src="/servicos/instalacao-ar-split.webp" alt="" className="h-full w-full object-cover" />
          <div className="absolute bottom-8 left-8 right-8 rounded-3xl bg-primary-950/80 p-5 backdrop-blur">
            <p className="text-accent-400">★ 4,8 · mais de 2.000 avaliações</p>
            <p className="mt-2 text-lg font-bold">Quanto mais serviços na mesma visita, mais a casa resolve de uma vez.</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle title="Compre por categoria" subtitle="Fotos reais do que a ABS faz. Clique e entre na prateleira." />
        <CategoryPhotoGrid />
      </section>

      <section id="ofertas">
        <SectionTitle title="Mais vendidos da semana" subtitle="O que mais sai na ABS agora" to="/busca" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((s, i) => (
            <ServiceCard key={s.slug} servico={s} highlight={i < 4 ? 'Mais vendido' : undefined} />
          ))}
        </div>
      </section>

      {categorias.map((cat) => (
        <section key={cat.slug}>
          <SectionTitle
            title={cat.nome}
            subtitle={`Tudo de ${cat.nome.toLowerCase()} para resolver na mesma visita`}
            to={`/c/${cat.slug}`}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cat.servicos.slice(0, 4).map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <SectionTitle title="Como a ABS vende e resolve" />
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="rounded-3xl bg-primary-50 p-4">
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-black text-primary-950">
                {n}
              </p>
              <p className="mt-3 font-bold text-primary-900">{t}</p>
              <p className="mt-1 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <TrustRow />
    </div>
  );
}
