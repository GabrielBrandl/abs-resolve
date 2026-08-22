import { TRUST_BADGES, WHATSAPP_LINK } from '../../storefront/constants';

export function StoreFooter() {
  return (
    <footer>
      <div className="border-t border-slate-200 bg-[#eef3ff]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_BADGES.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex h-10 w-8 items-center justify-center rounded-full bg-white text-lg text-primary-700 shadow-sm">
                {b.icon}
              </span>
              <div>
                <p className="text-sm font-bold text-primary-900">{b.title}</p>
                <p className="text-xs text-slate-500">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-primary-950 py-5 text-center text-sm text-white">
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="font-bold text-accent-400">
          Precisa de ajuda? Fale com a ABS no WhatsApp
        </a>
        <p className="mt-2 text-xs text-white/60">© {new Date().getFullYear()} ABS Resolve · Manaus - AM · Chamou. Confiou. Resolveu.</p>
      </div>
    </footer>
  );
}
