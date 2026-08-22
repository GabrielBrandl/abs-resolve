import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { REFERRAL_BONUS, WHATSAPP_LINK } from '../../storefront/constants';
import { money } from '../../storefront/catalog';

export function ReferralPage() {
  const user = useAuthStore((s) => s.user);
  const code = (user?.nome || 'ABS').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) + '20';
  const link = `${window.location.origin}/cadastro?ref=${code}`;
  const [copied, setCopied] = useState(false);

  const share = () => {
    const text = `Use meu código ${code} na ABS Resolve. Você ganha ${money(REFERRAL_BONUS)} na primeira contratação e eu também. ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-accent-500 p-6 text-primary-950 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Indique um amigo</h1>
          <p className="mt-2 max-w-lg text-sm font-semibold">
            Seu amigo ganha {money(REFERRAL_BONUS)} na primeira contratação. Você ganha {money(REFERRAL_BONUS)} de cashback quando o serviço dele for concluído.
          </p>
          <p className="mt-4 inline-block rounded-xl bg-white px-4 py-2 font-mono text-xl font-black">{code}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={share} className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-black text-white">
              Indicar pelo WhatsApp
            </button>
            <button
              type="button"
              className="rounded-xl bg-primary-900 px-4 py-2 text-sm font-black text-white"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              {copied ? 'Link copiado' : 'Copiar meu link'}
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {['Compartilhe o link', 'Seu amigo contrata', 'A ABS resolve', 'Você ganha cashback'].map((t, i) => (
          <div key={t} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-black">{i + 1}</p>
            <p className="mt-3 font-bold">{t}</p>
          </div>
        ))}
      </div>
      <a href={WHATSAPP_LINK} className="block text-sm font-bold text-primary-700">
        Indicar para o condomínio
      </a>
    </div>
  );
}
