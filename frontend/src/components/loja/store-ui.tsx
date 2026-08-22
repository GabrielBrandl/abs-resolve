import { Link } from 'react-router-dom';
import { TRUST_BADGES, WHATSAPP_LINK } from '../../storefront/constants';

export function YellowButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-accent-500 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-primary-950 shadow-sm transition hover:bg-accent-400 disabled:opacity-50 ${className}`}
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
      className={`rounded-xl bg-primary-800 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-primary-700 disabled:opacity-50 ${className}`}
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
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
      {children}
    </span>
  );
}

export function TrustRow({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {TRUST_BADGES.map((b) => (
        <div key={b.title} className="flex items-start gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            {b.icon}
          </span>
          <div>
            <p className="text-xs font-bold text-primary-900">{b.title}</p>
            {!compact && <p className="text-[11px] text-slate-500">{b.text}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20"
    >
      WhatsApp
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
  const steps = ['Serviço', 'Detalhes', 'Pagamento', 'Agendamento'];
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
