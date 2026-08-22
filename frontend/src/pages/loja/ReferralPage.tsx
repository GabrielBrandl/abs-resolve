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
    const text = `Use meu código ${code} na ABS Resolve. Você ganha ${money(REFERRAL_BONUS)} na primeira contratação e eu também ganho cashback. ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-accent-500/20 p-6">
        <h1 className="text-2xl font-bold text-primary-900">Indique um amigo</h1>
        <p className="mt-2 text-sm text-slate-600">
          Seu amigo ganha {money(REFERRAL_BONUS)} na primeira contratação. Você ganha {money(REFERRAL_BONUS)} de cashback quando o serviço dele for concluído.
        </p>
        <p className="mt-4 font-mono text-lg font-bold">{code}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={share} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            Indicar pelo WhatsApp
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-bold"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? 'Link copiado' : 'Copiar meu link'}
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {['Compartilhe o link', 'Seu amigo contrata', 'A ABS resolve', 'Você ganha cashback'].map((t, i) => (
          <div key={t} className="rounded-xl bg-white p-4">
            <p className="text-xs font-bold text-primary-600">{i + 1}</p>
            <p className="font-semibold">{t}</p>
          </div>
        ))}
      </div>
      <a href={WHATSAPP_LINK} className="block text-sm font-semibold text-primary-700">
        Indicar para o condomínio
      </a>
    </div>
  );
}
