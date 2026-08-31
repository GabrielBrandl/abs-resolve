import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { ProductCarousel, ProductCarouselItem } from '../../components/loja/ProductCarousel';
import { YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import {
  IconCalendar,
  IconCard,
  IconCheck,
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

const HERO_CHECKS = [
  'Preço antes da visita',
  'Agendamento em minutos',
  'Pagamento 100% seguro',
  'Garantia de até 90 dias',
];

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
  const { garantiaPadraoDias } = useStoreConfig();
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias).filter((s) => s.tipo !== 'peca' && !s.slug.startsWith('peca-'));
  const destaques = servicos.slice(0, 4);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16.5rem]">
        <div className="overflow-hidden rounded-[14px] shadow-[0_10px_30px_rgba(0,45,98,0.18)] lg:grid lg:grid-cols-2">
          <div className="bg-[#002d62] p-6 text-white sm:p-7 md:p-8">
            <div className="flex min-h-full flex-col justify-between lg:min-h-[340px]">
              <div>
                <h1 className="max-w-[20rem] text-[30px] font-black leading-[1.12] md:text-[36px]">
                  Soluções rápidas para sua{' '}
                  <span className="text-[#ffb800]">casa ou empresa.</span>
                </h1>
                <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/80">
                  Profissionais qualificados, preço justo, pagamento seguro e garantia
                  {garantiaPadraoDias ? ` de até ${garantiaPadraoDias} dias.` : '.'}
                </p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {HERO_CHECKS.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[11px] font-semibold leading-snug sm:text-[12px]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ffb800] text-[#002d62]">
                        <IconCheck className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/c/eletricista" className="mt-7 inline-block">
                <YellowButton className="px-7 py-3.5 text-[13px] uppercase tracking-wide">
                  Ver preço e agendar →
                </YellowButton>
              </Link>
            </div>
          </div>

          <div className="relative min-h-[220px] sm:min-h-[280px] lg:min-h-[340px]">
            <img
              src="/hero-abs.webp"
              alt="Técnico da ABS Resolve em atendimento"
              width={800}
              height={480}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover object-[center_20%]"
            />
            <div className="absolute right-3 top-3 rounded-lg bg-[#0b1220]/92 px-2.5 py-1.5 text-xs font-semibold shadow-lg sm:right-4 sm:top-4 sm:px-3 sm:py-2 sm:text-sm">
              <span className="text-[#ffb800]">★ 4,8</span>
              <span className="ml-1 text-white/90 sm:ml-1.5">+2.000 avaliações</span>
            </div>
          </div>
        </div>

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
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[22px] font-black text-[#111827]">
            Mais contratados <span className="text-[18px]">🔥</span>
          </h2>
          <Link to="/busca" className="text-sm font-bold text-[#1d4ed8]">
            Ver todos os serviços &gt;
          </Link>
        </div>
        <ProductCarousel>
          {destaques.map((s) => (
            <ProductCarouselItem key={s.slug}>
              <ServiceCard servico={s} />
            </ProductCarouselItem>
          ))}
        </ProductCarousel>
      </section>

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
