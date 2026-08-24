import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { money } from '../../storefront/catalog';
import { useStoreConfig } from '../../hooks/useStoreConfig';

export function ReferralPage() {
  const { bonusIndicacao } = useStoreConfig();
  const user = useAuthStore((s) => s.user);
  const code = (user?.nome || 'ABS').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) + '20';
  const link = `${window.location.origin}/cadastro?ref=${code}`;
  const [copied, setCopied] = useState(false);

  const share = () => {
    const text = `Use meu código ${code} na ABS Resolve. Você ganha ${money(bonusIndicacao)} na primeira contratação e eu também. ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-accent-500 p-6 text-primary-950 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Indique e ganhe</h1>
          <p className="mt-2 max-w-lg text-sm font-semibold">
            Seu amigo ganha <strong>{money(bonusIndicacao)}</strong> na primeira contratação. Você ganha{' '}
            <strong>{money(bonusIndicacao)}</strong> de cashback quando o serviço dele for concluído.
          </p>
          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="text-xs font-bold text-slate-500">Seu código</p>
            <p className="font-mono text-2xl font-black">{code}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={share} className="rounded-lg bg-[#25D366] px-4 py-2 text-xs font-black uppercase text-white">
                Indicar pelo WhatsApp
              </button>
              <button
                type="button"
                className="rounded-lg border border-primary-800 px-4 py-2 text-xs font-black uppercase text-primary-800"
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
      </div>

      <section>
        <h2 className="mb-3 font-black text-primary-900">Indicar é simples</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Compartilhe', 'Envie seu código ou link'],
            ['Seu amigo contrata', 'Ele usa o benefício na primeira visita'],
            ['A ABS resolve', 'O serviço é concluído'],
            ['Você ganha', `${money(bonusIndicacao)} de cashback`],
          ].map(([t, d], i) => (
            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-sm font-black text-white">{i + 1}</p>
              <p className="mt-3 font-black text-primary-900">{t}</p>
              <p className="text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-primary-900">Quanto você pode ganhar?</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <li className="rounded-xl bg-slate-50 p-3"><strong>1 amigo</strong><br />{money(bonusIndicacao)}</li>
            <li className="rounded-xl bg-slate-50 p-3"><strong>5 amigos</strong><br />{money(bonusIndicacao * 5)}</li>
            <li className="rounded-xl bg-slate-50 p-3"><strong>10 amigos</strong><br />{money(bonusIndicacao * 10)}</li>
            <li className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">Quanto mais indicar, mais volta</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-primary-800 p-5 text-white">
          <p className="text-xs font-black uppercase">Indique para o condomínio</p>
          <p className="mt-2 text-sm text-white/80">Vizinhos também resolvem a casa com a ABS. Compartilhe o mesmo código.</p>
          <button type="button" onClick={share} className="mt-4 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-black uppercase">
            Compartilhar no WhatsApp
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        O cashback é liberado após a conclusão do primeiro serviço do indicado.{' '}
        <Link to="/conta/cashback" className="font-bold text-primary-700">Ver meu cashback</Link>
      </p>
    </div>
  );
}
