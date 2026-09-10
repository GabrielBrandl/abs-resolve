import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { dashboardApi } from '../services/modules.service';
import type { DashboardGerencial } from '../types';
import { formatCurrency } from '../types';
import { Card, Loading, PageHeader, Select, TableWrapper } from '../components/ui';
import { useToast } from '../components/Toast';

type Periodo = 'hoje' | '7d' | 'mes' | 'mes_passado' | 'ano' | 'personalizado';
type SortServico = 'quantidade' | 'receita' | 'margemPct';

const Variacao = ({ valor }: { valor: number | null }) => (
  <p className={`mt-1 text-xs ${valor == null ? 'text-slate-400' : valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    {valor == null ? 'Sem período anterior' : `${valor >= 0 ? '▲' : '▼'} ${Math.abs(valor).toFixed(1)}% vs. anterior`}
  </p>
);

export function DashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [dados, setDados] = useState<DashboardGerencial | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortServico>('receita');
  const { toast } = useToast();

  useEffect(() => {
    if (periodo === 'personalizado' && (!de || !ate)) return;
    setLoading(true);
    dashboardApi.gerencial({ periodo, ...(de ? { de } : {}), ...(ate ? { ate } : {}) })
      .then(setDados)
      .catch((e) => toast(e instanceof Error ? e.message : 'Erro ao carregar dashboard', 'error'))
      .finally(() => setLoading(false));
  }, [periodo, de, ate]);

  const servicos = useMemo(
    () => [...(dados?.servicos || [])].sort((a, b) => b[sort] - a[sort]),
    [dados, sort],
  );

  return (
    <div>
      <PageHeader
        title="Dashboard executivo"
        subtitle={dados?.periodo.label || 'Visão integrada do negócio'}
        action={
          <div className="flex flex-wrap items-end gap-2">
            <Select label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
              <option value="hoje">Hoje</option><option value="7d">Últimos 7 dias</option>
              <option value="mes">Este mês</option><option value="mes_passado">Mês passado</option>
              <option value="ano">Este ano</option><option value="personalizado">Personalizado</option>
            </Select>
            {periodo === 'personalizado' && <>
              <label className="mb-3 text-xs text-slate-500">De <input aria-label="Data inicial" type="date" value={de} onChange={(e) => setDe(e.target.value)} className="ml-1 rounded-lg border px-2 py-2 text-sm" /></label>
              <label className="mb-3 text-xs text-slate-500">Até <input aria-label="Data final" type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="ml-1 rounded-lg border px-2 py-2 text-sm" /></label>
            </>}
          </div>
        }
      />
      {loading ? <Loading /> : dados && <>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ['Faturamento', formatCurrency(dados.cards.faturamento.valor), dados.cards.faturamento.variacaoPct],
            ['Receita recebida', formatCurrency(dados.cards.receitaRecebida.valor), dados.cards.receitaRecebida.variacaoPct],
            ['Nº vendas', String(dados.cards.numeroVendas.valor), dados.cards.numeroVendas.variacaoPct],
            ['Ticket médio', formatCurrency(dados.cards.ticketMedio.valor), dados.cards.ticketMedio.variacaoPct],
          ].map(([label, value, variation]) => <Card key={String(label)} className="border-t-4 border-t-[#0033B5]">
            <p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-primary-700">{value}</p>
            <Variacao valor={variation as number | null} />
          </Card>)}
          <Card className="border-t-4 border-t-[#F7C400]">
            <p className="text-sm text-slate-500">Margem</p>
            <p className="mt-1 text-2xl font-bold text-primary-700">{dados.cards.margemContribuicao.fonte === 'financeiro' && dados.cards.margemContribuicao.valor != null ? `${formatCurrency(dados.cards.margemContribuicao.valor)} · ${dados.cards.margemContribuicao.pct?.toFixed(1)}%` : '—'}</p>
            {dados.cards.margemContribuicao.fonte === 'financeiro' && dados.cards.margemContribuicao.valor != null ? <Variacao valor={dados.cards.margemContribuicao.variacaoPct} /> : <p className="mt-1 text-xs text-amber-700">Cadastre custos no Financeiro</p>}
          </Card>
          <Card className="border-t-4 border-t-[#F7C400]">
            <p className="text-sm text-slate-500">Resultado operacional</p>
            <p className="mt-1 text-2xl font-bold text-primary-700">{dados.cards.resultadoOperacional.fonte === 'financeiro' && dados.cards.resultadoOperacional.valor != null ? formatCurrency(dados.cards.resultadoOperacional.valor) : '—'}</p>
            {dados.cards.resultadoOperacional.fonte === 'financeiro' && dados.cards.resultadoOperacional.valor != null ? <Variacao valor={dados.cards.resultadoOperacional.variacaoPct} /> : <p className="mt-1 text-xs text-amber-700">Cadastre custos no Financeiro</p>}
          </Card>
        </div>

        <h2 className="mb-3 text-lg font-bold text-primary-700">Comercial</h2>
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <Card>
            <h3 className="mb-4 font-semibold">Funil de vendas</h3>
            <div className="space-y-3 text-center">
              <div className="rounded-lg bg-[#0033B5] p-3 text-white"><b>{dados.comercial.funil.leads}</b> Leads</div>
              <p className="text-xs text-slate-500">{dados.comercial.funil.taxaLeadOrcamento.toFixed(1)}% convertem</p>
              <div className="mx-auto w-4/5 rounded-lg bg-blue-500 p-3 text-white"><b>{dados.comercial.funil.orcamentos}</b> Orçamentos</div>
              <p className="text-xs text-slate-500">{dados.comercial.funil.taxaOrcamentoVenda.toFixed(1)}% convertem</p>
              <div className="mx-auto w-3/5 rounded-lg bg-[#F7C400] p-3 font-medium text-primary-900"><b>{dados.comercial.funil.vendas}</b> Vendas</div>
              <p className="text-xs text-slate-500">Conversão total: {dados.comercial.funil.taxaLeadVenda.toFixed(1)}%</p>
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold">Vendas por origem</h3>
            <TableWrapper><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-2">Origem</th><th className="p-2">Vendas</th><th className="p-2">Receita</th></tr></thead><tbody>
              {dados.comercial.vendasPorOrigem.map((r) => <tr key={r.origem} className="border-t"><td className="p-2 capitalize">{r.origem}</td><td className="p-2">{r.vendas}</td><td className="p-2">{formatCurrency(r.receita)}</td></tr>)}
            </tbody></table></TableWrapper>
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold">Marketing</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['Investimento', formatCurrency(dados.comercial.marketing.investimento)], ['Leads', dados.comercial.marketing.leads], ['CPL', dados.comercial.marketing.cpl == null ? '—' : formatCurrency(dados.comercial.marketing.cpl)], ['CAC', dados.comercial.marketing.cac == null ? '—' : formatCurrency(dados.comercial.marketing.cac)]].map(([l, v]) => <div key={String(l)} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{l}</p><p className="font-bold text-primary-700">{v}</p></div>)}
            </div>
          </Card>
        </div>

        <h2 className="mb-3 text-lg font-bold text-primary-700">Operação</h2>
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['OS hoje', dados.operacao.osHoje, '/ordens-servico?periodo=hoje'],
            ['Aguardando prestador', dados.operacao.aguardandoPrestador, '/ordens-servico?status=aguardando-prestador'],
            ['Agendadas', dados.operacao.agendadas, '/agenda?status=agendado'],
            ['Em execução', dados.operacao.emExecucao, '/ordens-servico?status=execucao'],
            ['Concluídas', dados.operacao.concluidas, '/ordens-servico?status=conclusao'],
            ['Atrasadas', dados.operacao.atrasadas, '/agenda?status=atrasado'],
            ['Com ocorrência', dados.operacao.comOcorrencia, '/ordens-servico?ocorrencia=1'],
          ].map(([label, value, link]) => <Link key={String(label)} to={String(link)}><Card className="h-full transition hover:border-[#0033B5] hover:shadow-md"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold text-primary-700">{value}</p></Card></Link>)}
        </div>

        <h2 className="mb-3 text-lg font-bold text-primary-700">Financeiro</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Saldo disponível', dados.financeiro.saldoDisponivel], ['A receber', dados.financeiro.aReceber], ['A pagar', dados.financeiro.aPagar], ['Vencidos', dados.financeiro.vencidos]].map(([l, v]) => <Card key={String(l)}><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold text-primary-700">{formatCurrency(Number(v))}</p></Card>)}
        </div>
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card><h3 className="mb-4 font-semibold">Receitas x despesas</h3><ResponsiveContainer width="100%" height={250}><LineChart data={dados.financeiro.receitasXDespesas}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dia" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => formatCurrency(Number(v))} /><Legend /><Line dataKey="receitas" stroke="#0033B5" strokeWidth={2} /><Line dataKey="despesas" stroke="#F7C400" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>
          <Card><h3 className="mb-4 font-semibold">Despesas por categoria</h3><ResponsiveContainer width="100%" height={250}><BarChart data={dados.financeiro.despesasPorCategoria} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis dataKey="categoria" type="category" width={100} tick={{ fontSize: 10 }} /><Tooltip formatter={(v) => formatCurrency(Number(v))} /><Bar dataKey="valor" fill="#0033B5" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></Card>
        </div>

        <div className="mb-8 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-primary-700">Serviços</h2><Select label="" value={sort} onChange={(e) => setSort(e.target.value as SortServico)}><option value="quantidade">Ordenar por quantidade</option><option value="receita">Ordenar por receita</option><option value="margemPct">Ordenar por margem</option></Select></div>
            <TableWrapper><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Serviço</th><th className="p-3">Qtd.</th><th className="p-3">Receita</th><th className="p-3">Ticket</th><th className="p-3">Margem</th></tr></thead><tbody>
              {servicos.map((s) => <tr key={s.servico} className="border-t"><td className="p-3 font-medium">{s.servico}</td><td className="p-3">{s.quantidade}</td><td className="p-3">{formatCurrency(s.receita)}</td><td className="p-3">{formatCurrency(s.ticketMedio)}</td><td className="p-3">{s.custoReal ? `${formatCurrency(s.margemContribuicao)} · ${s.margemPct.toFixed(1)}%` : <span className="text-amber-700">— Cadastre custos</span>}</td></tr>)}
            </tbody></table></TableWrapper>
          </Card>
          <Card><h2 className="mb-4 text-lg font-bold text-primary-700">Clientes</h2><div className="mb-4 grid grid-cols-3 gap-2 text-center"><div><b>{dados.clientes.novos}</b><p className="text-xs text-slate-500">Novos</p></div><div><b>{dados.clientes.recorrentes}</b><p className="text-xs text-slate-500">Recorrentes</p></div><div><b>{dados.clientes.taxaRecompra.toFixed(1)}%</b><p className="text-xs text-slate-500">Recompra</p></div></div>
            {dados.clientes.topClientes.map((c) => <Link key={c.clienteId} to={`/clientes/${c.clienteId}`} className="flex justify-between border-t py-2 text-sm hover:text-primary-600"><span>{c.nome}<small className="block text-slate-400">{c.compras} compras</small></span><b>{formatCurrency(c.faturamento)}</b></Link>)}
          </Card>
        </div>

        {!!dados.alertas.length && <Card><h2 className="mb-3 text-lg font-bold text-primary-700">Alertas</h2>{dados.alertas.map((a, i) => <Link key={`${a.tipo}-${i}`} to={a.link} className="flex items-start gap-3 border-t py-3 first:border-0 hover:bg-slate-50"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a.severidade === 'alta' ? 'bg-red-500' : a.severidade === 'media' ? 'bg-[#F7C400]' : 'bg-[#0033B5]'}`} /><span><b>{a.titulo}</b><small className="block text-slate-500">{a.descricao}</small></span></Link>)}</Card>}
      </>}
    </div>
  );
}
