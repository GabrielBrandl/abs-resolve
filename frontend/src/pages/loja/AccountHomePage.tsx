import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientePortalApi } from '../../services/modules.service';
import { useAuthStore } from '../../store/authStore';
import { Loading } from '../../components/ui';
import { cashbackOf, money } from '../../storefront/catalog';
import type { PedidoTimeline } from '../../types';
import { formatDate } from '../../types';

export function AccountHomePage() {
  const user = useAuthStore((s) => s.user);
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-primary-900">Olá, {firstName}! O que vamos resolver hoje?</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-accent-500/20 p-4">
          <p className="text-sm text-slate-500">Meu cashback</p>
          <p className="text-2xl font-bold text-primary-800">{money(cashback)}</p>
          <Link to="/conta/cashback" className="mt-3 inline-block rounded-lg bg-accent-500 px-3 py-2 text-xs font-bold text-primary-900">
            Usar meu cashback
          </Link>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm text-slate-500">Próximo serviço</p>
          {proximo?.agendamento ? (
            <>
              <p className="font-semibold">{proximo.solicitacao?.servico?.nome || proximo.numero}</p>
              <p className="text-sm text-slate-500">
                {formatDate(proximo.agendamento.data)} · {proximo.agendamento.horarioInicio}
              </p>
              <Link to="/conta/servicos" className="mt-2 inline-block text-sm font-semibold text-primary-700">
                Acompanhar serviço
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-500">Nenhum horário marcado.</p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm text-slate-500">Minha casa</p>
          <p className="font-semibold">{concluidos.length} serviços realizados</p>
          <p className="text-sm text-slate-500">Total gasto {money(gasto)}</p>
          <Link to="/" className="mt-2 inline-block text-sm font-semibold text-primary-700">
            Agendar outro serviço
          </Link>
        </div>
      </div>
    </div>
  );
}
