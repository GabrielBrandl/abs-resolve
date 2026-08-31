import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';
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
  IconCoinsCashback,
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
  const { cashbackPercent, garantiaPadraoDias } = useStoreConfig();
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias).filter((s) => s.tipo !== 'peca' && !s.slug.startsWith('peca-'));
  const destaques = servicos.slice(0, 3);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Hero — layout em 3 blocos como no mock do cliente */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_16.5rem]">
        <div className="relative overflow-hidden rounded-[14px] bg-[#002d62] text-white shadow-[0_10px_30px_rgba(0,45,98,0.18)]">
          <div className="flex h-full min-h-[340px] flex-col justify-between p-7 md:p-8">
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
                  <li key={item} className="flex items-center gap-2 text-[12px] font-semibold leading-snug">
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

        <div className="relative hidden min-h-[340px] overflow-hidden rounded-[14px] lg:block">
          <img
            src="/hero-abs.webp"
            alt="Técnico da ABS Resolve em atendimento"
            width={800}
            height={480}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-[center_20%]"
          />
          <div className="absolute right-4 top-4 rounded-lg bg-[#0b1220]/92 px-3 py-2 text-sm font-semibold shadow-lg">
            <span className="text-[#ffb800]">★ 4,8</span>
            <span className="ml-1.5 text-white/90">+2.000 avaliações</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 lg:grid-rows-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex min-h-[6.4rem] flex-col items-center justify-center gap-2 rounded-[12px] border border-[#e6e8ee] bg-white px-2 py-3 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
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
        <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {destaques.map((s) => (
            <ServiceCard key={s.slug} servico={s} />
          ))}
          <aside
            id="cashback"
            className="relative flex h-full min-h-[17.5rem] flex-col overflow-hidden rounded-[14px] border-2 border-[#ffb800] bg-[linear-gradient(160deg,#002d62_0%,#003875_55%,#002d62_100%)] p-5 text-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#ffb800]/10 blur-2xl"
            />
            <div className="relative flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/85">
                Cashback em todos os serviços!
              </p>
              <div className="mt-3 flex items-end justify-center gap-1.5">
                <span className="text-[46px] font-black leading-none text-[#ffb800]">
                  {percentLabel(cashbackPercent)}%
                </span>
                <span className="mb-1 text-[15px] font-black uppercase tracking-wide text-[#ffb800]">
                  de volta
                </span>
              </div>
              <IconCoinsCashback className="mt-2 h-[4.5rem] w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]" />
            </div>
            <Link to="/conta/cashback" className="relative mt-4 block">
              <YellowButton className="w-full py-2.5 text-[11px] uppercase tracking-wide">
                Saiba como funciona
              </YellowButton>
            </Link>
          </aside>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#e6e8ee] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {TRUST_LINE.map((item) => (
            <p key={item.text} className="flex items-center gap-2 text-[12px] font-semibold text-[#334155]">
              <item.Icon className="h-4 w-4 text-[#002d62]" />
              {item.text}
            </p>
          ))}
        </div>
        <div className="rounded-lg border border-[#e6e8ee] px-4 py-2 text-center">
          <p className="text-[11px] font-bold text-[#002d62]">Nossos clientes recomendam!</p>
          <p className="text-sm font-black text-amber-500">★★★★★ 4,8/5</p>
        </div>
      </section>
    </div>
  );
}
