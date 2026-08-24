import { WHATSAPP_LINK } from '../../storefront/constants';
import { IconShield, IconWhatsApp } from './icons';

export function StoreFooter() {
  return (
    <footer>
      <div className="bg-[#002d62] text-white">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-4 px-4 py-5 md:flex-row md:items-center">
          <p className="flex items-start gap-3 text-sm font-semibold">
            <IconShield className="mt-0.5 h-6 w-6 text-[#ffb800]" />
            Garantia de até 90 dias em todos os serviços. E se precisar, a gente resolve.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-sm">
              <IconWhatsApp className="h-5 w-5 text-[#25D366]" />
              Fale com a gente agora. Atendimento rápido pelo WhatsApp
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[#002d62]"
            >
              Chamar no WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="bg-[#001e44] py-3 text-center text-[11px] text-white/50">
        © {new Date().getFullYear()} ABS Resolve · Manaus - AM · Chamou. Confiou. Resolveu.
      </div>
    </footer>
  );
}
