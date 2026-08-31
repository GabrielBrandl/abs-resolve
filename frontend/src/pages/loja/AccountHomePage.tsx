import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientePortalApi } from '../../services/modules.service';
import { useAuthStore } from '../../store/authStore';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { useCatalog } from '../../hooks/useCatalog';
import { flattenServices, money } from '../../storefront/catalog';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import type { PedidoTimeline } from '../../types';
import { formatDate } from '../../types';

export function AccountHomePage() {
  const user = useAuthStore((s) => s.user);
  const { categorias } = useCatalog();
  const { garantiaPadraoDias } = useStoreConfig();
  const [pedidos, setPedidos] = useState<PedidoTimeline[]>([]);
  const [tab, setTab] = useState<'andamento' | 'agendados' | 'concluidos'>('andamento');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.pedidos().then(setPedidos).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const concluidos = pedidos.filter((p) => ['finalizado', 'concluido'].includes(String(p.status)));
  const agendados = pedidos.filter((p) => p.agendamento && !['finalizado', 'concluido', 'cancelado'].includes(String(p.status)));
  const andamento = pedidos.filter((p) => ['em_execucao', 'em_processamento', 'a_caminho'].includes(String(p.status)));
  const gasto = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const proximo = pedidos.find((p) => p.agendamento && !['finalizado', 'concluido', 'cancelado'].includes(String(p.status)));
  const firstName = user?.nome?.split(' ')[0] || 'cliente';
  const recs = flattenServices(categorias).slice(0, 3);
  const lista = tab === 'concluidos' ? concluidos : tab === 'agendados' ? agendados : andamento.length ? andamento : pedidos;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-black leading-tight text-[#002d62] sm:text-[32px]">Olá, {firstName}! 👋</h1>
        <p className="mt-1 text-sm text-slate-500">O que vamos resolver hoje?</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Nenhum horário marcado.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">Minha casa</p>
          <p className="mt-2 text-3xl font-black text-primary-900">{concluidos.length}</p>
          <p className="text-sm text-slate-500">serviços realizados</p>
          <p className="mt-1 text-sm font-semibold text-primary-800">{garantiaPadraoDias} dias de garantia nos serviços</p>
        </div>
        <div className="rounded-[14px] bg-[#002d62] p-5 text-white shadow-[0_8px_24px_rgba(0,45,98,0.18)]">
          <p className="text-sm font-bold text-white/80">Agendar novo serviço</p>
          <p className="mt-2 text-sm text-white/70">Preço antes da visita, pagamento seguro e profissional verificado.</p>
          <Link to="/" className="mt-4 inline-block rounded-lg bg-[#ffb800] px-4 py-2 text-xs font-black uppercase text-[#002d62]">
            Ver serviços
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-primary-900">Próximo atendimento</h2>
          {proximo && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Confirmado</span>}
        </div>
        {proximo?.agendamento ? (
          <>
            <p className="text-lg font-black text-primary-900">{proximo.solicitacao?.servico?.nome || proximo.numero}</p>
            <p className="mt-1 text-sm text-slate-500">{formatDate(proximo.agendamento.data)} · {proximo.agendamento.horarioInicio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/conta/servicos" className="rounded-lg bg-primary-800 px-4 py-2 text-xs font-black uppercase text-white">
                Acompanhar serviço
              </Link>
              <Link to="/conta/servicos" className="text-xs font-bold text-primary-700">Ver detalhes</Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Quando você agendar, o próximo horário aparece aqui.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-black text-primary-900">Meus serviços</h2>
          <div className="flex gap-1 text-xs font-bold">
            {([
              ['andamento', `Em andamento (${andamento.length})`],
              ['agendados', `Agendados (${agendados.length})`],
              ['concluidos', `Concluídos (${concluidos.length})`],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-full px-3 py-1 ${tab === k ? 'bg-primary-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum serviço neste filtro. Contrate pela loja.</p>
        ) : (
          <ul className="divide-y">
            {lista.slice(0, 4).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{p.solicitacao?.servico?.nome || p.numero}</p>
                  <p className="text-xs text-slate-500">{formatDate(p.createdAt)} · {money(p.valor)}</p>
                </div>
                <Link to="/conta/servicos" className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-black uppercase text-primary-950">
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {recs.length > 0 && (
          <section>
            <h2 className="mb-3 font-black text-primary-900">Recomendados para você</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {recs.map((s) => (
                <ServiceCard key={s.slug} servico={s} />
              ))}
            </div>
          </section>
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-primary-900">Resumo da conta</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span>Serviços realizados</span><strong>{concluidos.length}</strong></li>
            <li className="flex justify-between"><span>Total gasto</span><strong>{money(gasto)}</strong></li>
          </ul>
          <Link to="/conta/servicos" className="mt-4 inline-block text-sm font-bold text-primary-700">Ver relatório completo</Link>
        </div>
      </div>
    </div>
  );
}
