import type React from 'react';
import { createPortal } from 'react-dom';

export function Badge({ children, color = 'bg-abs-gray text-primary-700' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-xl border border-abs-gray bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary-700">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-slate-400">{message}</p>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  zIndex = 50,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  zIndex?: number;
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-700">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-medium text-primary-700">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
    </div>
  );
}

export function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm font-medium text-primary-700">{label}</label>
      <select
        {...props}
        className="w-full rounded-lg border border-abs-gray px-3 py-2 text-sm outline-none focus:border-primary-500"
      >
        {children}
      </select>
    </div>
  );
}

export function Button({ children, variant = 'primary', ...props }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'cta' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    cta: 'bg-accent-500 text-primary-900 font-semibold hover:bg-accent-400',
    secondary: 'bg-abs-gray text-primary-700 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-abs-gray">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium transition ${
            active === t.key ? 'border-b-2 border-accent-500 text-primary-700' : 'text-slate-500 hover:text-primary-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const MARCA_TEXTO = /^(ABS Resolve Já|ABS Resolve|ABS)$/;

/** Substitui texto da marca por logo inline (mensagens do backend). */
export function TextoComMarca({ texto, logoClassName = 'h-4' }: { texto: string; logoClassName?: string }) {
  const partes = texto.split(/(ABS Resolve Já|ABS Resolve|\bABS\b)/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (!parte) return null;
        if (MARCA_TEXTO.test(parte)) {
          return <Logo key={i} variant="inline" className={logoClassName} />;
        }
        return <span key={i}>{parte}</span>;
      })}
    </>
  );
}

export function Logo({
  className = 'h-16',
  variant = 'default',
}: {
  className?: string;
  /** default = login/cadastro | sidebar = menus laterais | card = cards claros | inline = dentro de frases */
  variant?: 'default' | 'sidebar' | 'card' | 'inline' | 'gradient' | 'light' | 'dark';
}) {
  const resolved =
    variant === 'gradient' || variant === 'light'
      ? 'default'
      : variant === 'dark'
        ? 'sidebar'
        : variant;

  if (resolved === 'inline') {
    return (
      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className={`inline-block align-middle object-contain ${className || 'h-5'}`}
        decoding="async"
      />
    );
  }

  const frame: Record<'default' | 'sidebar' | 'card', string> = {
    default:
      'inline-flex max-w-full items-center justify-center overflow-hidden rounded-2xl shadow-xl shadow-primary-900/30',
    sidebar:
      'inline-flex max-w-full items-center justify-center overflow-hidden rounded-xl bg-white px-2.5 py-1.5 shadow-md ring-1 ring-white/30',
    card: 'inline-flex max-w-full items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-slate-200',
  };

  return (
    <span className={frame[resolved]} role="img" aria-label="ABS Resolve">
      <img
        src="/logo.png"
        alt=""
        className={`${className} w-auto max-w-[min(100%,320px)] object-contain`}
        width={320}
        height={140}
        decoding="async"
      />
    </span>
  );
}

export function ScarcityBadge({ nivel }: { nivel: 'disponivel' | 'poucos' | 'ultimo' }) {
  const map = {
    disponivel: { label: 'Horários disponíveis', color: 'bg-green-100 text-green-700', dot: '🟢' },
    poucos: { label: 'Restam poucos horários', color: 'bg-amber-100 text-amber-700', dot: '🟡' },
    ultimo: { label: 'Último horário disponível', color: 'bg-red-100 text-red-700', dot: '🔴' },
  };
  const s = map[nivel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${s.color}`}>
      {s.dot} {s.label}
    </span>
  );
}
