import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { ProductCarousel, ProductCarouselItem } from '../../components/loja/ProductCarousel';
import { CashbackPromoBanner } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';
import { BrandMarquee } from '../../components/loja/BrandMarquee';
import {
  IconCalendar,
  IconCard,
  IconPeople,
  IconPin,
  IconShield,
  IconStar,
  IconUniform,
  IconVerified,
  IconWhatsApp,
  IconInstall,
  IconParcelas,
} from '../../components/loja/icons';

const FEATURES = [
  { Icon: IconVerified, title: 'Profissionais verificados' },
  { Icon: IconUniform, title: 'Uniformizados e identificados' },
  { Icon: IconCard, title: 'Pagamento online seguro' },
  { Icon: IconParcelas, title: 'Parcelamento em até 3x' },
  { Icon: IconWhatsApp, title: 'Atendimento via WhatsApp' },
  { Icon: IconShield, title: 'Garantia de até 90 dias' },
];

const TRUST_LINE = [
  { Icon: IconPin, text: 'Atendemos em Manaus e região' },
  { Icon: IconCalendar, text: 'Agendamento em até 24h' },
  { Icon: IconInstall, text: 'Preço justo e transparente' },
  { Icon: IconPeople, text: 'Equipe própria e qualificada' },
  { Icon: IconStar, text: 'Mais de 2.000 clientes atendidos' },
];

export function HomePage() {
  const { cashbackPercent } = useStoreConfig();
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias).filter((s) => s.tipo !== 'peca' && !s.slug.startsWith('peca-'));
  const destaques = servicos.slice(0, 5);
  const cashbackPct = percentLabel(cashbackPercent);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16.5rem]">
        <Link
          to="/busca"
          className="block overflow-hidden rounded-[14px] shadow-[0_10px_30px_rgba(0,45,98,0.18)]"
          aria-label={`Programa de Cashback ABS Resolve — até ${cashbackPct}`}
        >
          <img
            src="/hero-cashback.jpg"
            alt={`Programa de Cashback ABS Resolve — até ${cashbackPct} de cashback em serviços`}
            width={1200}
            height={520}
            fetchPriority="high"
            decoding="async"
            className="h-auto w-full object-cover"
          />
        </Link>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none lg:mx-0 lg:grid lg:grid-cols-2 lg:grid-rows-3 lg:overflow-visible lg:px-0">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex min-h-[6.4rem] min-w-[7.2rem] shrink-0 flex-col items-center justify-center gap-2 rounded-[12px] border border-[#e6e8ee] bg-white px-2 py-3 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)] sm:min-w-[8rem] lg:min-w-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-[#002d62]">
                <f.Icon className="h-5 w-5" />
              </span>
              <p className="max-w-[8.5rem] text-[11px] font-bold leading-tight text-balance text-[#002d62]">
                {f.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="ofertas">
        <h2 className="mb-3 text-[22px] font-black text-[#111827]">
          Mais contratados <span className="text-[18px]">🔥</span>
        </h2>
        <div className="flex items-stretch gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex justify-end pr-2">
              <Link to="/busca" className="text-sm font-bold text-[#1d4ed8] hover:underline">
                Ver todos os serviços &gt;
              </Link>
            </div>
            <ProductCarousel
              layout="rail"
              className="min-w-0"
              showArrows
              showFade={false}
            >
              {destaques.map((s) => (
                <ProductCarouselItem key={s.slug} rail>
                  <ServiceCard
                    servico={s}
                    showCashbackBadge
                    cashbackLabel={cashbackPct}
                  />
                </ProductCarouselItem>
              ))}
            </ProductCarousel>
          </div>
          <div className="hidden w-[10.5rem] shrink-0 self-start lg:block">
            <CashbackPromoBanner />
          </div>
        </div>
        <div className="mt-3 w-[10.5rem] lg:hidden">
          <CashbackPromoBanner />
        </div>
      </section>

      <BrandMarquee />

      <section className="flex flex-col gap-4 rounded-[14px] border border-[#e6e8ee] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="-mx-1 flex flex-1 gap-4 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:pb-0">
          {TRUST_LINE.map((item) => (
            <p key={item.text} className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-[#334155] sm:shrink">
              <item.Icon className="h-4 w-4 text-[#002d62]" />
              {item.text}
            </p>
          ))}
        </div>
        <div className="shrink-0 rounded-lg border border-[#e6e8ee] px-4 py-2 text-center">
          <p className="text-[11px] font-bold text-[#002d62]">Nossos clientes recomendam!</p>
          <p className="text-sm font-black text-amber-500">★★★★★ 4,8/5</p>
        </div>
      </section>
    </div>
  );
}
