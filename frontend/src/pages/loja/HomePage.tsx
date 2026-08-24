import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices } from '../../storefront/catalog';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';
import {
  IconBuilding,
  IconCard,
  IconCheck,
  IconHeadset,
  IconLock,
  IconShield,
  IconUniform,
  IconVerified,
  IconWhatsApp,
} from '../../components/loja/icons';

const HERO_CHECKS = [
  'Preço antes da visita',
  'Agendamento em minutos',
  'Pagamento 100% seguro',
  'Garantia de até 90 dias',
];

const FEATURES = [
  { Icon: IconVerified, title: 'Profissionais verificados' },
  { Icon: IconUniform, label: 'Uniformizados e identificados', title: 'Uniformizados e identificados' },
  { Icon: IconLock, title: 'Pagamento online seguro' },
  { Icon: IconCard, title: 'Parcelamento em até 3x' },
  { Icon: IconWhatsApp, title: 'Atendimento via WhatsApp' },
  { Icon: IconShield, title: 'Garantia de até 90 dias' },
];

const TRUST_LINE = [
  { Icon: IconBuilding, text: 'Atendemos em Manaus e região' },
  { Icon: IconHeadset, text: 'Agendamento em até 24h' },
  { Icon: IconLock, text: 'Preço justo e transparente' },
  { Icon: IconUniform, text: 'Equipe própria e qualificada' },
  { Icon: IconVerified, text: 'Mais de 2.000 clientes atendidos' },
];

export function HomePage() {
  const { cashbackPercent, garantiaPadraoDias } = useStoreConfig();
  const { categorias, loading } = useCatalog();
  const servicos = flattenServices(categorias);
  const destaques = servicos.slice(0, 3);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 lg:grid-cols-[1.38fr_0.62fr]">
        <div className="relative overflow-hidden rounded-[12px] bg-[#002d62] text-white">
          <div className="grid min-h-[340px] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative z-10 p-7 md:p-9">
              <h1 className="max-w-md text-[30px] font-black leading-[1.12] md:text-[36px]">
                Soluções rápidas para{' '}
                <span className="text-[#ffb800]">sua casa ou empresa.</span>
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
                Profissionais qualificados, preço justo, pagamento seguro e garantia de até {garantiaPadraoDias} dias.
              </p>
              <ul className="mt-5 space-y-2">
                {HERO_CHECKS.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffb800] text-[#002d62]">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/c/eletricista" className="mt-7 inline-block">
                <YellowButton className="px-6">Ver preço e agendar →</YellowButton>
              </Link>
            </div>
            <div className="relative hidden min-h-[340px] lg:block">
              <img src="/hero-abs.png" alt="Técnico ABS Resolve" className="h-full w-full object-cover object-[center_20%]" />
              <div className="absolute bottom-5 right-5 rounded-lg bg-[#001a44]/90 px-3 py-2 text-sm font-semibold">
                <span className="text-[#ffb800]">★ 4,8</span>
                <span className="ml-2 text-white/90">+2.000 avaliações</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 grid-rows-3 gap-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3 rounded-[10px] border border-[#e6e8ee] bg-white px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef3fb] text-[#002d62]">
                <f.Icon className="h-5 w-5" />
              </span>
              <p className="text-[12px] font-bold leading-tight text-[#002d62]">{f.title}</p>
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {destaques.map((s) => (
            <ServiceCard key={s.slug} servico={s} />
          ))}
          <aside id="cashback" className="relative overflow-hidden rounded-[12px] bg-[#002d62] p-5 text-white ring-2 ring-[#ffb800]">
            <p className="text-[13px] font-extrabold uppercase tracking-wide">Cashback em todos os serviços!</p>
            <p className="mt-3 text-[34px] font-black leading-none text-[#ffb800]">{percentLabel(cashbackPercent)}%</p>
            <p className="text-[22px] font-black text-[#ffb800]">DE VOLTA</p>
            <div className="mt-4 flex gap-2">
              <span className="h-10 w-10 rounded-full bg-[#ffb800] shadow-lg shadow-yellow-500/40" />
              <span className="h-8 w-8 rounded-full bg-[#ffd54a]" />
              <span className="h-6 w-6 rounded-full bg-[#f5c518]" />
            </div>
            <Link to="/conta/cashback" className="mt-6 block">
              <YellowButton className="w-full">Saiba como funciona</YellowButton>
            </Link>
          </aside>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[#e6e8ee] bg-white px-4 py-4">
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
