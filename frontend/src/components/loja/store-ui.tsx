import { Link } from 'react-router-dom';
import { TRUST_BADGES, WHATSAPP_LINK } from '../../storefront/constants';
import { IconDoc, IconLock, IconShield, IconVerified } from './icons';

const TRUST_ICONS = {
  verified: IconVerified,
  warranty: IconShield,
  payment: IconLock,
  invoice: IconDoc,
} as const;

export function AbsBrand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <img
        src="/logo-abs-resolve.png"
        alt="ABS Resolve"
        className="h-11 w-auto max-w-[148px] object-contain object-left"
        width={148}
        height={44}
        decoding="async"
      />
    </Link>
  );
}

export function YellowButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-accent-500 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-primary-950 shadow-sm transition hover:bg-accent-400 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function NavyButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-primary-800 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-primary-700 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function StoreCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Stars({ value = 4.9, count }: { value?: number; count?: number }) {
  return (
    <p className="text-sm font-medium text-amber-500">
      ★ {value.toFixed(1).replace('.', ',')}
      {count != null && <span className="ml-1 font-normal text-slate-500">({count})</span>}
    </p>
  );
}

export function CashbackTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-[2.6rem] flex-col items-center rounded-md bg-[#fff4cc] px-1.5 py-0.5 text-center text-[9px] font-black uppercase leading-tight tracking-wide text-[#9a7200]">
      {children}
    </span>
  );
}

/** Banner lateral de cashback — imagem promocional (apenas na home) */
export function CashbackPromoBanner() {
  return (
    <Link
      id="cashback"
      to="/cadastro"
      className="block w-full overflow-hidden rounded-[12px] shadow-[0_8px_24px_rgba(0,45,98,0.15)] transition hover:opacity-95"
      aria-label="Cashback em todos os serviços — saiba como funciona"
    >
      <img
        src="/cashback-promo.webp"
        alt="Cashback 10% em todos os serviços — saiba como funciona"
        width={200}
        height={225}
        loading="lazy"
        decoding="async"
        className="h-auto w-full object-cover"
      />
    </Link>
  );
}

export function TrustRow({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid items-stretch gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {TRUST_BADGES.map((b) => {
        const Icon = TRUST_ICONS[b.id];
        return (
          <div key={b.id} className="flex h-full min-h-[4.5rem] items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-800">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold leading-snug text-pretty text-primary-900">{b.title}</p>
              {!compact && <p className="text-[11px] leading-snug text-slate-500">{b.text}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrustStrip({ garantiaDias = 90 }: { garantiaDias?: number }) {
  const labels: Record<string, string> = {
    verified: 'Profissionais verificados',
    warranty: `Garantia ${garantiaDias} dias`,
    payment: 'Pagamento seguro',
    invoice: 'Nota fiscal',
  };

  return (
    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
      {TRUST_BADGES.map((b) => {
        const Icon = TRUST_ICONS[b.id];
        return (
          <div key={b.id} className="flex min-h-[3.5rem] items-center gap-2.5 rounded-2xl bg-primary-50 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary-800 shadow-sm">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 text-[12px] font-bold leading-tight text-[#002d62]">{labels[b.id] || b.short}</span>
          </div>
        );
      })}
    </div>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-[5.5rem] right-3 z-50 flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/25 md:bottom-5 md:right-4 md:h-12 md:px-5"
    >
      <span className="hidden md:inline">WhatsApp</span>
      <span className="md:hidden">WA</span>
    </a>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <p className="text-sm text-slate-500">
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && ' / '}
          {item.to ? (
            <Link to={item.to} className="text-primary-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </p>
  );
}

export function CheckoutStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = ['Serviço', 'Pedido', 'Pagamento', 'Agendamento'];
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const active = current === n;
        const done = current > n;
        return (
          <li key={label} className="text-center">
            <div
              className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                active ? 'bg-accent-500 text-primary-950' : done ? 'bg-primary-700 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {done ? '✓' : n}
            </div>
            <p className={`text-[11px] font-semibold ${active ? 'text-primary-800' : 'text-slate-500'}`}>{label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function SectionTitle({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-primary-950">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-bold text-primary-700">
          Ver todos
        </Link>
      )}
    </div>
  );
}
