import { TRUST_BADGES, WHATSAPP_LINK } from '../../storefront/constants';

export function StoreFooter() {
  return (
    <footer>
      <div className="border-t border-slate-200 bg-primary-50">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_BADGES.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="text-xl text-primary-700">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold text-primary-800">{b.title}</p>
                <p className="text-xs text-slate-500">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-primary-900 py-4 text-center text-sm text-white">
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="font-semibold text-accent-400">
          Precisa de ajuda? Fale com a ABS no WhatsApp
        </a>
        <p className="mt-2 text-xs text-white/70">© {new Date().getFullYear()} ABS Resolve · Manaus - AM</p>
      </div>
    </footer>
  );
}
