import { WHATSAPP_LINK } from '../../storefront/constants';
import { TrustRow } from './store-ui';

export function StoreFooter() {
  return (
    <footer>
      <div className="border-t border-slate-200 bg-[#eef3ff]">
        <div className="mx-auto max-w-7xl px-4 py-7">
          <TrustRow />
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
