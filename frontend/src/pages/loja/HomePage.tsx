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
  { Icon: IconUniform, title: 'Equipe uniformizada' },
  { Icon: IconLock, title: 'Pagamento seguro' },
  { Icon: IconCard, title: 'Parcele em até 3x' },
  { Icon: IconWhatsApp, title: 'WhatsApp direto' },
  { Icon: IconShield, title: 'Garantia de 90 dias' },
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
  const servicos = flattenServices(categorias).filter((s) => s.tipo !== 'peca' && !s.slug.startsWith('peca-'));
  const pecas = flattenServices(categorias).filter((s) => s.tipo === 'peca' || s.slug.startsWith('peca-'));
  const destaques = servicos.slice(0, 3);
  const pecasDestaque = pecas.slice(0, 4);

  if (loading) return <Loading />;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(20rem,36rem)_minmax(0,1fr)] lg:items-start lg:gap-4">
      <div className="lg:sticky lg:top-[10.5rem]">
        <div className="relative overflow-hidden rounded-[14px] bg-[#002d62] text-white shadow-[0_10px_30px_rgba(0,45,98,0.18)]">
          <div className="grid min-h-[352px] lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative z-10 p-7 md:p-9">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ffb800]">ABS Resolve · Manaus</p>
              <h1 className="mt-2 max-w-[22rem] text-[32px] font-black leading-[1.08] md:text-[38px]">
                Soluções rápidas para{' '}
                <span className="text-[#ffb800]">sua casa ou empresa.</span>
              </h1>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/80">
                Profissionais qualificados, preço justo, pagamento seguro e garantia de até {garantiaPadraoDias} dias.
              </p>
              <ul className="mt-5 space-y-2">
                {HERO_CHECKS.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[13px] font-semibold">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffb800] text-[#002d62]">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/c/eletricista" className="mt-7 inline-block">
                <YellowButton className="px-7 py-3.5 text-[13px]">Ver preço e agendar →</YellowButton>
              </Link>
            </div>
            <div className="relative hidden min-h-[352px] lg:block">
              <img
                src="/hero-abs.webp"
                alt="Técnico da ABS Resolve em atendimento"
                width={800}
                height={352}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover object-[center_18%]"
              />
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#002d62] to-transparent" />
              <div className="absolute bottom-5 right-5 rounded-lg bg-[#001a44]/90 px-3 py-2 text-sm font-semibold shadow-lg">
                <span className="text-[#ffb800]">★ 4,8</span>
                <span className="ml-2 text-white/90">+2.000 avaliações</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-5 lg:mt-0">
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex min-h-[5.25rem] items-center gap-2.5 rounded-[12px] border border-[#e6e8ee] bg-white px-3 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3fb] text-[#002d62]">
                <f.Icon className="h-5 w-5" />
              </span>
              <p className="min-w-0 flex-1 text-[12px] font-bold leading-snug text-[#002d62]">{f.title}</p>
            </div>
          ))}
        </div>

      {pecasDestaque.length > 0 && (
        <section id="pecas">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[22px] font-black text-[#111827]">Peças avulsas</h2>
            <Link to="/busca?q=peca" className="text-sm font-bold text-[#1d4ed8]">
              Ver todas as peças &gt;
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pecasDestaque.map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      )}

      <section id="ofertas">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[22px] font-black text-[#111827]">
            Mais contratados <span className="text-[18px]">🔥</span>
          </h2>
          <Link to="/busca" className="text-sm font-bold text-[#1d4ed8]">
            Ver todos os serviços &gt;
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {destaques.map((s) => (
            <ServiceCard key={s.slug} servico={s} />
          ))}
          <aside
            id="cashback"
            className="relative overflow-hidden rounded-[14px] bg-[#002d62] p-5 text-white ring-[3px] ring-[#ffb800]"
          >
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-white/90">Cashback em todos os serviços</p>
            <p className="mt-3 text-[42px] font-black leading-none text-[#ffb800]">{percentLabel(cashbackPercent)}%</p>
            <p className="mt-1 text-[20px] font-black tracking-wide text-[#ffb800]">DE VOLTA</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="h-12 w-12 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe27a,#ffb800_55%,#c98a00)] shadow-lg" />
              <span className="h-9 w-9 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe27a,#ffb800_55%,#c98a00)]" />
              <span className="mb-1 h-7 w-9 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe27a,#ffd54a_50%,#e0a000)]" />
            </div>
            <Link to="/conta/cashback" className="mt-6 block">
              <YellowButton className="w-full">Saiba como funciona</YellowButton>
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
    </div>
  );
}
