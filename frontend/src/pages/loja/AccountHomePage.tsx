import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientePortalApi } from '../../services/modules.service';
import { useAuthStore } from '../../store/authStore';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { useCatalog } from '../../hooks/useCatalog';
import { cashbackOf, flattenServices, money } from '../../storefront/catalog';
import type { PedidoTimeline } from '../../types';
import { formatDate } from '../../types';

export function AccountHomePage() {
  const user = useAuthStore((s) => s.user);
  const { categorias } = useCatalog();
  const [pedidos, setPedidos] = useState<PedidoTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.pedidos().then(setPedidos).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const concluidos = pedidos.filter((p) => ['finalizado', 'concluido'].includes(String(p.status)));
  const gasto = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const cashback = cashbackOf(gasto);
  const proximo = pedidos.find((p) => p.agendamento);
  const firstName = user?.nome?.split(' ')[0] || 'cliente';
  const recs = flattenServices(categorias).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary-950">Olá, {firstName}! O que vamos resolver hoje?</h1>
        <p className="text-slate-500">O que vamos resolver hoje?</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-accent-500 p-5 text-primary-950">
          <p className="text-sm font-bold">Meu cashback</p>
          <p className="mt-2 text-3xl font-black">{money(cashback)}</p>
          <p className="text-xs">disponível para usar</p>
          <Link to="/conta/cashback" className="mt-4 inline-block rounded-xl bg-primary-900 px-4 py-2 text-xs font-black text-white">
            Usar meu cashback
          </Link>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Próximo serviço</p>
          {proximo?.agendamento ? (
            <>
              <p className="mt-2 font-black text-primary-900">{proximo.solicitacao?.servico?.nome || proximo.numero}</p>
              <p className="text-sm text-slate-500">
                {formatDate(proximo.agendamento.data)} · {proximo.agendamento.horarioInicio}
              </p>
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                Atendimento confirmado
              </span>
              <Link to="/conta/servicos" className="mt-3 block text-sm font-bold text-primary-700">
                Acompanhar serviço →
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Nenhum horário marcado. Escolha um serviço e agende.</p>
          )}
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Minha casa</p>
          <p className="mt-2 text-3xl font-black text-primary-900">{concluidos.length}</p>
          <p className="text-sm text-slate-500">serviços realizados · {money(gasto)}</p>
          <Link to="/" className="mt-3 inline-block text-sm font-bold text-primary-700">
            Ver histórico da casa →
          </Link>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-primary-950">Meus serviços</h2>
          <Link to="/conta/servicos" className="text-sm font-bold text-primary-700">
            Ver todos
          </Link>
        </div>
        {pedidos.length === 0 ? (
          <p className="text-sm text-slate-500">Você ainda não contratou. Comece pela loja.</p>
        ) : (
          <ul className="divide-y">
            {pedidos.slice(0, 3).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{p.solicitacao?.servico?.nome || p.numero}</p>
                  <p className="text-xs text-slate-500">{formatDate(p.createdAt)} · {money(p.valor)}</p>
                </div>
                <Link to="/conta/servicos" className="text-sm font-bold text-primary-700">
                  Acompanhar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recs.length > 0 && (
        <section>
          <h2 className="mb-3 font-black text-primary-950">Recomendados para você</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {recs.map((s) => (
              <ServiceCard key={s.slug} servico={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
