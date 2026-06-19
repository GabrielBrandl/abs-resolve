import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi } from '../services/modules.service';
import type { DashboardKPIs } from '../types';
import { formatCurrency } from '../types';
import { PageHeader, Loading, Card } from '../components/ui';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899'];

export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [receita, setReceita] = useState<{ mes: string; valor: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.kpis(), dashboardApi.receita()])
      .then(([k, r]) => { setKpis(k); setReceita(r); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const modulos = [
    { title: 'Clientes', path: '/clientes', icon: '👥' },
    { title: 'CRM', path: '/crm', icon: '🎯' },
    { title: 'Pedidos', path: '/pedidos', icon: '📦' },
    { title: 'Financeiro', path: '/financeiro', icon: '💰' },
    { title: 'Marketplace', path: '/marketplace', icon: '🛒' },
    { title: 'Admin', path: '/admin', icon: '⚙️' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard Executivo" subtitle="Visão geral da plataforma ABS Resolve" />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Leads', value: kpis?.comercial.totalLeads, color: 'text-blue-600' },
          { label: 'Taxa Conversão', value: `${kpis?.comercial.taxaConversao}%`, color: 'text-purple-600' },
          { label: 'Receita Mês', value: formatCurrency(kpis?.financeiro.receitaMes || 0), color: 'text-green-600' },
          { label: 'OS em Andamento', value: kpis?.operacional.osEmAndamento, color: 'text-amber-600' },
          { label: 'Clientes Ativos', value: kpis?.comercial.totalClientes, color: 'text-indigo-600' },
          { label: 'Ticket Médio', value: formatCurrency(kpis?.comercial.ticketMedio || 0), color: 'text-rose-600' },
          { label: 'Inadimplência', value: `${kpis?.financeiro.inadimplencia}%`, color: 'text-red-600' },
          { label: 'Pedidos Finalizados', value: kpis?.operacional.pedidosFinalizados, color: 'text-teal-600' },
        ].map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Receita Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={receita}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
              <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Leads por Etapa</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={kpis?.leadsPorEtapa.map((l) => ({ name: l.etapa.replace(/_/g, ' '), value: l._count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {kpis?.leadsPorEtapa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => (
          <Link key={m.path} to={m.path} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <span className="text-2xl">{m.icon}</span>
            <h3 className="mt-2 font-semibold">{m.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
