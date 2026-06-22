import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { dashboardApi } from '../services/modules.service';
import type { DashboardKPIs } from '../types';
import { formatCurrency } from '../types';
import { Loading, Card, Logo } from '../components/ui';

const BRAND_COLORS = ['#0033B5', '#00288F', '#F7C400', '#FFD633', '#0052FF', '#10b981', '#6366f1'];

export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [receita, setReceita] = useState<{ mes: string; valor: number }[]>([]);
  const [diario, setDiario] = useState<{ dia: string; valor: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.kpis(), dashboardApi.receita(), dashboardApi.faturamentoDiario()])
      .then(([k, r, d]) => { setKpis(k); setReceita(r); setDiario(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const modulos = [
    { title: 'Clientes', path: '/clientes', icon: '👥' },
    { title: 'CRM', path: '/crm', icon: '🎯' },
    { title: 'Pedidos', path: '/pedidos', icon: '📦' },
    { title: 'Financeiro', path: '/financeiro', icon: '💰' },
    { title: 'Ordens de Serviço', path: '/ordens-servico', icon: '🔧' },
    { title: 'Admin', path: '/admin', icon: '⚙️' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4 rounded-xl abs-gradient p-6 text-white">
        <Logo className="h-14 brightness-0 invert" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
          <p className="text-sm text-white/80">ABS Resolve Já — operação em tempo real</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Faturamento Hoje', value: formatCurrency(kpis?.financeiro.faturamentoDiario || 0), accent: 'border-l-accent-500' },
          { label: 'Faturamento Mês', value: formatCurrency(kpis?.financeiro.receitaMes || 0), accent: 'border-l-primary-600' },
          { label: 'Lucro Estimado', value: formatCurrency(kpis?.financeiro.lucroEstimado || 0), accent: 'border-l-green-500' },
          { label: 'Ticket Médio', value: formatCurrency(kpis?.comercial.ticketMedio || 0), accent: 'border-l-primary-700' },
          { label: 'Conversão CRM', value: `${kpis?.comercial.taxaConversao}%`, accent: 'border-l-purple-500' },
          { label: 'Serviços Executados', value: kpis?.operacional.servicosExecutados, accent: 'border-l-teal-500' },
          { label: 'Cancelamentos', value: kpis?.operacional.cancelamentos, accent: 'border-l-red-500' },
          { label: 'Clientes Recorrentes', value: kpis?.comercial.clientesRecorrentes, accent: 'border-l-indigo-500' },
        ].map((k) => (
          <Card key={k.label} className={`border-l-4 ${k.accent}`}>
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="text-2xl font-bold text-primary-700">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Faturamento Diário (14 dias)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={diario}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              <Line type="monotone" dataKey="valor" stroke="#0033B5" strokeWidth={2} dot={{ fill: '#F7C400' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Receita Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={receita}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              <Bar dataKey="valor" fill="#0033B5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Serviços por Categoria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={kpis?.operacional.servicosPorCategoria?.map((s) => ({ name: s.categoria, value: s.total }))}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label
              >
                {kpis?.operacional.servicosPorCategoria?.map((_, i) => (
                  <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Margem por Serviço</h3>
          <div className="max-h-[250px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500">
                <th className="pb-2">Serviço</th><th className="pb-2">Qtd</th><th className="pb-2">Receita</th><th className="pb-2">Margem</th>
              </tr></thead>
              <tbody>
                {kpis?.financeiro.margemPorServico?.map((m) => (
                  <tr key={m.servico} className="border-t border-abs-gray">
                    <td className="py-2 capitalize">{m.servico.replace(/-/g, ' ')}</td>
                    <td className="py-2">{m.count}</td>
                    <td className="py-2">{formatCurrency(m.receita)}</td>
                    <td className="py-2 font-medium text-green-600">{m.margemPct}%</td>
                  </tr>
                )) || <tr><td colSpan={4} className="py-4 text-slate-400">Sem dados ainda</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => (
          <Link key={m.path} to={m.path} className="rounded-xl border border-abs-gray bg-white p-5 shadow-sm transition hover:border-primary-500 hover:shadow-md">
            <span className="text-2xl">{m.icon}</span>
            <h3 className="mt-2 font-semibold text-primary-700">{m.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
