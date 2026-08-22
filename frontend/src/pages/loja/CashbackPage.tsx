import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientePortalApi } from '../../services/modules.service';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { CashbackTag } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { cashbackOf, flattenServices, money, priceAfterCashback } from '../../storefront/catalog';
import type { PedidoTimeline } from '../../types';
import { formatDate } from '../../types';

export function CashbackPage() {
  const { categorias, loading: catLoading } = useCatalog();
  const [pedidos, setPedidos] = useState<PedidoTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.pedidos().then(setPedidos).finally(() => setLoading(false));
  }, []);

  if (loading || catLoading) return <Loading />;

  const gasto = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const saldo = cashbackOf(gasto);
  const servicos = flattenServices(categorias).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-accent-500 p-6 text-primary-950">
        <p className="text-sm font-bold">Seu saldo ABS</p>
        <p className="mt-1 text-4xl font-black">{money(saldo)}</p>
        <p className="text-sm">disponível para usar no próximo serviço</p>
        <div className="mt-4 flex flex-wrap gap-6 text-sm font-semibold">
          <span>Já ganhou {money(saldo)}</span>
          <span>Expira com o uso no agendamento</span>
        </div>
        <Link to="/" className="mt-5 inline-block rounded-xl bg-primary-900 px-4 py-2 text-sm font-black text-white">
          Usar meu cashback
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-black">Use seu cashback agora</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {servicos.map((s) => (
            <div key={s.slug} className="rounded-3xl bg-white p-2 shadow-sm">
              <ServiceCard servico={s} cta="Usar cashback e agendar" />
              {s.precoMinimo ? (
                <p className="px-3 pb-3 text-center text-xs font-bold text-emerald-700">
                  Você paga {money(Math.max(0, priceAfterCashback(s.precoMinimo) - (saldo > 0 ? Math.min(saldo, cashbackOf(s.precoMinimo)) : 0)))}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-black">Extrato do cashback</h2>
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
                <CashbackTag>+ {money(cashbackOf(p.valor))}</CashbackTag>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
