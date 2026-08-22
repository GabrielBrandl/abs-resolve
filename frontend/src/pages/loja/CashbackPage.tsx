import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientePortalApi } from '../../services/modules.service';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
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
      <div className="rounded-2xl bg-accent-500/25 p-6">
        <p className="text-sm">Seu saldo ABS</p>
        <p className="text-3xl font-bold text-primary-900">{money(saldo)}</p>
        <p className="text-sm text-emerald-700">Disponível para usar no próximo serviço</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-primary-800 px-4 py-2 text-sm font-bold text-white">
          Usar meu cashback
        </Link>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-bold">Use seu cashback agora</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {servicos.map((s) => (
            <div key={s.slug}>
              <ServiceCard servico={s} cta="Usar cashback e agendar" />
              {s.precoMinimo ? (
                <p className="mt-1 text-center text-xs text-emerald-700">
                  Você paga {money(priceAfterCashback(Math.max(0, s.precoMinimo - saldo)))}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 font-bold">Extrato do cashback</h2>
        {pedidos.length === 0 ? (
          <p className="text-sm text-slate-500">Quando um serviço for concluído, o cashback aparece aqui.</p>
        ) : (
          <ul className="divide-y text-sm">
            {pedidos.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>
                  {p.solicitacao?.servico?.nome || p.numero} · {formatDate(p.createdAt)}
                </span>
                <span className="font-semibold text-emerald-700">+ {money(cashbackOf(p.valor))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
