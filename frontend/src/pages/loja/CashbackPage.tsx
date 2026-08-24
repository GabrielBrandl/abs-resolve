import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientePortalApi } from '../../services/modules.service';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { CashbackTag } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { cashbackOf, flattenServices, money, priceAfterCashback } from '../../storefront/catalog';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';
import type { PedidoTimeline } from '../../types';
import { formatDate } from '../../types';

export function CashbackPage() {
  const { categorias, loading: catLoading } = useCatalog();
  const { cashbackPercent } = useStoreConfig();
  const [pedidos, setPedidos] = useState<PedidoTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.pedidos().then(setPedidos).finally(() => setLoading(false));
  }, []);

  if (loading || catLoading) return <Loading />;

  const gasto = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const saldo = cashbackOf(gasto, cashbackPercent);
  const servicos = flattenServices(categorias).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary-900">Meu cashback</h1>
        <p className="text-sm text-slate-500">Use seu saldo e economize na próxima contratação.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl bg-[#fff5d6] p-6 text-primary-950">
          <p className="text-sm font-bold">Seu saldo ABS</p>
          <p className="mt-1 text-5xl font-black">{money(saldo)}</p>
          <div className="mt-3 flex gap-6 text-sm font-semibold">
            <span className="text-emerald-700">● Disponível {money(saldo)}</span>
            <span className="text-amber-700">● A liberar após o serviço</span>
          </div>
          <Link to="/" className="mt-5 inline-block rounded-lg bg-primary-800 px-5 py-3 text-sm font-black uppercase text-white">
            Usar meu cashback
          </Link>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Você já ganhou</p>
            <p className="text-2xl font-black text-primary-900">{money(saldo)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Cashback em todos os serviços</p>
            <p className="text-2xl font-black text-primary-900">{percentLabel(cashbackPercent)}%</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-black text-primary-900">Use seu cashback agora</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {servicos.map((s) => (
            <div key={s.slug} className="rounded-2xl bg-white p-2 shadow-sm">
              <ServiceCard servico={s} cta="Usar cashback e agendar" />
              {s.precoMinimo ? (
                <p className="px-3 pb-3 text-center text-xs font-bold text-emerald-700">
                  Você paga {money(Math.max(0, priceAfterCashback(s.precoMinimo, cashbackPercent) - (saldo > 0 ? Math.min(saldo, cashbackOf(s.precoMinimo, cashbackPercent)) : 0)))}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-black text-primary-900">Extrato do cashback</h2>
        {pedidos.length === 0 ? (
          <p className="text-sm text-slate-500">Quando um serviço for concluído, o cashback aparece aqui.</p>
        ) : (
          <ul className="divide-y text-sm">
            {pedidos.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-3">
                <span>
                  {p.solicitacao?.servico?.nome || p.numero}
                  <span className="block text-xs text-slate-400">{formatDate(p.createdAt)}</span>
                </span>
                <CashbackTag>+ {money(cashbackOf(p.valor, cashbackPercent))}</CashbackTag>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
