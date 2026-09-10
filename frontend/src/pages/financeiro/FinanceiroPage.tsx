import { useCallback, useEffect, useState } from 'react';
import { clientesApi, financeiroApi, pagamentosApi } from '../../services/modules.service';
import type { Cliente, FinLancamento, Pagamento } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { Badge, Button, Card, Input, Loading, Modal, PageHeader, Select, TableWrapper, Tabs } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface FinConta { id: string; nome: string; tipo: string; saldoInicial: number; ativo: boolean }
interface FinSubcategoria { id: string; categoriaId: string; nome: string; ativo: boolean }
interface FinCategoria { id: string; tipo: string; nome: string; grupoDre?: string; ativo: boolean; subcategorias: FinSubcategoria[] }
type Resumo = { saldoDisponivel?: number; aReceber?: number; aPagar?: number; vencidos?: number; receitasRealizadas?: number; despesasRealizadas?: number };
type Fluxo = { periodo?: { label: string }; saldoInicial?: number; entradas?: number; saidas?: number; saldoAtual?: number; projecaoReceber?: number; projecaoPagar?: number; saldoProjetado?: number };
type Dre = Record<string, number | boolean | object>;

const hoje = new Date().toISOString().slice(0, 10);
const TABS = [{ key: 'dashboard', label: 'Dashboard' }, { key: 'lancamentos', label: 'Lançamentos' }, { key: 'contas', label: 'Contas' }, { key: 'categorias', label: 'Categorias' }, { key: 'recorrencias', label: 'Recorrentes' }, { key: 'fluxo', label: 'Fluxo' }, { key: 'dre', label: 'DRE' }, { key: 'cobrancas', label: 'Cobranças' }];

export function FinanceiroPage() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [resumo, setResumo] = useState<Resumo>({});
  const [fluxo, setFluxo] = useState<Fluxo>({});
  const [dre, setDre] = useState<Dre>({});
  const [lancamentos, setLancamentos] = useState<FinLancamento[]>([]);
  const [filtros, setFiltros] = useState({ natureza: '', status: '', busca: '' });
  const [contas, setContas] = useState<FinConta[]>([]);
  const [categorias, setCategorias] = useState<FinCategoria[]>([]);
  const [modalLancamento, setModalLancamento] = useState(false);
  const [modalConta, setModalConta] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalSubcategoria, setModalSubcategoria] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<FinCategoria | null>(null);
  const [formLanc, setFormLanc] = useState({ natureza: 'receita', descricao: '', valor: '', dataCompetencia: hoje, dataVencimento: '', categoriaId: '', contaId: '', contaDestinoId: '', fornecedorNome: '' });
  const [formConta, setFormConta] = useState({ nome: '', tipo: 'bancaria', saldoInicial: '' });
  const [formCategoria, setFormCategoria] = useState({ nome: '', tipo: 'despesa', grupoDre: 'despesa_administrativa', ativo: true });
  const [formSubcategoria, setFormSubcategoria] = useState({ categoriaId: '', nome: '' });
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [statusCobranca, setStatusCobranca] = useState('');
  const [dashboardAsaas, setDashboardAsaas] = useState<Record<string, number>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalCobranca, setModalCobranca] = useState(false);
  const [modalVia, setModalVia] = useState(false);
  const [viaData, setViaData] = useState<{ invoiceUrl?: string; pixCode?: string } | null>(null);
  const [formCobranca, setFormCobranca] = useState({ clienteId: '', valor: '', metodo: 'PIX', dueDate: '' });
  const [recorrencias, setRecorrencias] = useState<Array<{ id: string; descricao: string; valor: number | string; diaDoMes: number; ativo: boolean; categoria?: { nome: string } | null }>>([]);
  const [modalRec, setModalRec] = useState(false);
  const [formRec, setFormRec] = useState({ descricao: '', valor: '', diaDoMes: '10', categoriaId: '', contaId: '', fornecedorNome: '' });
  const { toast } = useToast();

  const carregarBase = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, cats] = await Promise.all([financeiroApi.resumo({ periodo }), financeiroApi.contas(true), financeiroApi.categorias(true)]);
      setResumo(r as Resumo); setContas(c as FinConta[]); setCategorias(cats as FinCategoria[]);
    } catch (e) { toast(e instanceof Error ? e.message : 'Erro ao carregar financeiro', 'error'); }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => {
    financeiroApi.seed()
      .then(() => financeiroApi.backfillReceitas().catch(() => null))
      .then(carregarBase)
      .catch((e) => toast(e instanceof Error ? e.message : 'Erro ao preparar Financeiro', 'error'));
  }, []);

  useEffect(() => {
    if (tab === 'dashboard') carregarBase();
    if (tab === 'lancamentos') {
      setLoading(true);
      financeiroApi.lancamentos({ ...filtros, periodo }).then((r) => setLancamentos(r.items)).finally(() => setLoading(false));
    }
    if (tab === 'fluxo') financeiroApi.fluxo({ periodo }).then((r) => setFluxo(r as Fluxo));
    if (tab === 'dre') financeiroApi.dre({ periodo }).then((r) => setDre(r as Dre));
    if (tab === 'recorrencias') financeiroApi.recorrencias().then((r) => setRecorrencias(r as typeof recorrencias));
    if (tab === 'cobrancas') carregarCobrancas();
  }, [tab, periodo, filtros.natureza, filtros.status, filtros.busca, statusCobranca]);

  const recarregarCadastros = async () => {
    const [c, cats] = await Promise.all([financeiroApi.contas(true), financeiroApi.categorias(true)]);
    setContas(c as FinConta[]); setCategorias(cats as FinCategoria[]);
  };
  const erro = (e: unknown) => toast(e instanceof Error ? e.message : 'Não foi possível concluir', 'error');
  const salvarLancamento = async () => {
    try {
      await financeiroApi.criarLancamento({ ...formLanc, valor: Number(formLanc.valor), dataVencimento: formLanc.dataVencimento || null, categoriaId: formLanc.categoriaId || null, contaId: formLanc.contaId || null, contaDestinoId: formLanc.contaDestinoId || null });
      setModalLancamento(false); toast('Lançamento criado', 'success'); setTab('dashboard'); carregarBase();
    } catch (e) { erro(e); }
  };
  const baixar = async (id: string) => {
    try { await financeiroApi.baixarLancamento(id, { dataMovimento: hoje }); toast('Lançamento baixado', 'success'); setLancamentos((await financeiroApi.lancamentos({ ...filtros, periodo })).items); } catch (e) { erro(e); }
  };
  const exportar = async () => {
    try {
      const r = await financeiroApi.exportar({ ...filtros, periodo });
      const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'lancamentos.csv'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { erro(e); }
  };
  const salvarConta = async () => {
    try { await financeiroApi.salvarConta({ ...formConta, saldoInicial: Number(formConta.saldoInicial) }); setModalConta(false); setFormConta({ nome: '', tipo: 'bancaria', saldoInicial: '' }); await recarregarCadastros(); toast('Conta salva', 'success'); } catch (e) { erro(e); }
  };
  const salvarCategoria = async () => {
    try {
      await financeiroApi.salvarCategoria({ ...(categoriaEditando ? { id: categoriaEditando.id } : {}), ...formCategoria });
      setModalCategoria(false); setCategoriaEditando(null); await recarregarCadastros(); toast('Categoria salva', 'success');
    } catch (e) { erro(e); }
  };
  const editarCategoria = (c: FinCategoria) => { setCategoriaEditando(c); setFormCategoria({ nome: c.nome, tipo: c.tipo, grupoDre: c.grupoDre || '', ativo: c.ativo }); setModalCategoria(true); };
  const salvarSubcategoria = async () => {
    try { await financeiroApi.salvarSubcategoria(formSubcategoria); setModalSubcategoria(false); setFormSubcategoria({ categoriaId: '', nome: '' }); await recarregarCadastros(); toast('Subcategoria salva', 'success'); } catch (e) { erro(e); }
  };

  const carregarCobrancas = async () => {
    setLoading(true);
    try { const [p, d] = await Promise.all([pagamentosApi.listar(statusCobranca ? { status: statusCobranca } : undefined), pagamentosApi.dashboard()]); setPagamentos(p); setDashboardAsaas(d); }
    catch (e) { erro(e); } finally { setLoading(false); }
  };
  const abrirCobranca = async () => { const r = await clientesApi.listar({ status: 'ativo' }); setClientes(r.clientes); setModalCobranca(true); };
  const cobrar = async () => { try { await pagamentosApi.cobrar({ ...formCobranca, valor: Number(formCobranca.valor) }); setModalCobranca(false); toast('Cobrança gerada', 'success'); carregarCobrancas(); } catch (e) { erro(e); } };
  const segundaVia = async (id: string) => { try { const d = await pagamentosApi.segundaVia(id); setViaData({ invoiceUrl: d.invoiceUrl, pixCode: d.pixCode }); setModalVia(true); } catch (e) { erro(e); } };

  const filtroPeriodo = <Select label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)}><option value="hoje">Hoje</option><option value="7d">7 dias</option><option value="mes">Este mês</option><option value="mes_passado">Mês passado</option><option value="ano">Este ano</option></Select>;

  return <div>
    <PageHeader title="Financeiro" subtitle="Controle financeiro e cobranças" />
    <Tabs tabs={TABS} active={tab} onChange={setTab} />
    {tab === 'dashboard' && <>{filtroPeriodo}{loading ? <Loading /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Saldo disponível', resumo.saldoDisponivel], ['A receber', resumo.aReceber], ['A pagar', resumo.aPagar], ['Vencidos', resumo.vencidos], ['Receitas realizadas', resumo.receitasRealizadas], ['Despesas realizadas', resumo.despesasRealizadas]].map(([l, v]) => <Card key={String(l)}><p className="text-sm text-slate-500">{l}</p><p className="text-2xl font-bold text-primary-700">{formatCurrency(Number(v || 0))}</p></Card>)}</div>}</>}
    {tab === 'lancamentos' && <><div className="mb-4 flex flex-wrap items-end gap-2">{filtroPeriodo}<Select label="Natureza" value={filtros.natureza} onChange={(e) => setFiltros({ ...filtros, natureza: e.target.value })}><option value="">Todas</option><option value="receita">Receita</option><option value="despesa">Despesa</option><option value="transferencia">Transferência</option></Select><Select label="Status" value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}><option value="">Todos</option><option value="a_receber">A receber</option><option value="recebida">Recebida</option><option value="a_pagar">A pagar</option><option value="paga">Paga</option><option value="vencida">Vencida</option></Select><Input label="Buscar" value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} /><Button variant="secondary" onClick={exportar}>Exportar CSV</Button><Button onClick={() => setModalLancamento(true)}>Novo lançamento</Button></div>
      {loading ? <Loading /> : <TableWrapper><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Descrição</th><th className="p-3">Natureza</th><th className="p-3">Categoria</th><th className="p-3">Competência</th><th className="p-3">Valor</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{lancamentos.map((l) => <tr key={l.id} className="border-t"><td className="p-3 font-medium">{l.descricao}</td><td className="p-3 capitalize">{l.natureza}</td><td className="p-3">{l.categoria?.nome || '—'}</td><td className="p-3">{formatDate(l.dataCompetencia)}</td><td className="p-3">{formatCurrency(l.valor)}</td><td className="p-3"><Badge>{l.statusEfetivo || l.status}</Badge></td><td className="p-3">{!['recebida', 'paga', 'cancelada'].includes(l.status) && <Button variant="secondary" onClick={() => baixar(l.id)}>Baixar</Button>}</td></tr>)}</tbody></table></TableWrapper>}</>}
    {tab === 'contas' && <><div className="mb-4 flex justify-end"><Button onClick={() => setModalConta(true)}>Nova conta</Button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{contas.map((c) => <Card key={c.id}><div className="flex justify-between"><h3 className="font-semibold">{c.nome}</h3><Badge color={c.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge></div><p className="text-sm capitalize text-slate-500">{c.tipo}</p><p className="mt-2 text-xl font-bold text-primary-700">{formatCurrency(c.saldoInicial)}</p></Card>)}</div></>}
    {tab === 'categorias' && <><div className="mb-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalSubcategoria(true)}>Nova subcategoria</Button><Button onClick={() => { setCategoriaEditando(null); setFormCategoria({ nome: '', tipo: 'despesa_operacional', grupoDre: 'despesa_administrativa', ativo: true }); setModalCategoria(true); }}>Nova categoria</Button></div><div className="space-y-3">{categorias.map((c) => <Card key={c.id}><div className="flex items-center justify-between"><div><h3 className="font-semibold">{c.nome} <Badge>{c.tipo}</Badge></h3><p className="text-xs text-slate-500">{c.grupoDre || 'Sem grupo DRE'}</p></div><div className="flex gap-2"><Badge color={c.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge><Button variant="secondary" onClick={() => editarCategoria(c)}>Editar</Button></div></div>{c.subcategorias?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{c.subcategorias.map((s) => <Badge key={s.id}>{s.nome}</Badge>)}</div>}</Card>)}</div></>}
    {tab === 'recorrencias' && <><div className="mb-4 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={async () => { try { const r = await financeiroApi.processarRecorrencias(); toast(`${(r as { gerados?: number }).gerados || 0} lançamentos gerados`, 'success'); } catch (e) { erro(e); } }}>Gerar competências</Button><Button onClick={() => setModalRec(true)}>Nova recorrência</Button></div><TableWrapper><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Descrição</th><th className="p-3">Dia</th><th className="p-3">Valor</th><th className="p-3">Categoria</th><th className="p-3">Status</th></tr></thead><tbody>{recorrencias.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{r.descricao}</td><td className="p-3">Todo dia {r.diaDoMes}</td><td className="p-3">{formatCurrency(Number(r.valor))}</td><td className="p-3">{r.categoria?.nome || '—'}</td><td className="p-3"><Badge>{r.ativo ? 'Ativa' : 'Inativa'}</Badge></td></tr>)}</tbody></table></TableWrapper></>}
    {tab === 'fluxo' && <>{filtroPeriodo}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Saldo inicial', fluxo.saldoInicial], ['Entradas', fluxo.entradas], ['Saídas', fluxo.saidas], ['Saldo atual', fluxo.saldoAtual], ['A receber', fluxo.projecaoReceber], ['A pagar', fluxo.projecaoPagar], ['Saldo projetado', fluxo.saldoProjetado]].map(([l, v]) => <Card key={String(l)}><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold text-primary-700">{formatCurrency(Number(v || 0))}</p></Card>)}</div></>}
    {tab === 'dre' && <>{filtroPeriodo}<Card><h2 className="mb-4 text-lg font-bold text-primary-700">DRE gerencial</h2>{!dre.temDadosReais && <p className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">Cadastre receitas e despesas por categoria para compor a DRE.</p>}{[['Receita bruta', 'receitaBruta'], ['(-) Deduções', 'deducoes'], ['Receita líquida', 'receitaLiquida'], ['(-) Custos diretos', 'custosDiretos'], ['Margem de contribuição', 'margemContribuicao'], ['(-) Despesas comerciais', 'despesasComerciais'], ['(-) Despesas administrativas', 'despesasAdministrativas'], ['(-) Despesas financeiras', 'despesasFinanceiras'], ['Resultado operacional', 'resultadoOperacional']].map(([l, k]) => <div key={k} className={`flex justify-between border-t py-3 ${k === 'receitaLiquida' || k === 'margemContribuicao' || k === 'resultadoOperacional' ? 'font-bold text-primary-700' : ''}`}><span>{l}</span><span>{formatCurrency(Number(dre[k] || 0))}</span></div>)}</Card></>}
    {tab === 'cobrancas' && <><div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Receita do mês', dashboardAsaas.receitaMes], ['Pendente', dashboardAsaas.totalPendente], ['Vencido', dashboardAsaas.totalVencido], ['Inadimplência', `${(dashboardAsaas.inadimplencia || 0).toFixed(1)}%`]].map(([l, v]) => <Card key={String(l)}><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold text-primary-700">{typeof v === 'string' ? v : formatCurrency(Number(v || 0))}</p></Card>)}</div><div className="mb-4 flex flex-wrap gap-2"><Select label="Status" value={statusCobranca} onChange={(e) => setStatusCobranca(e.target.value)}><option value="">Todos</option><option value="PENDING">Pendente</option><option value="RECEIVED">Recebido</option><option value="OVERDUE">Vencido</option></Select><Button variant="secondary" onClick={async () => { try { const r = await pagamentosApi.sincronizarAsaas(); toast(`${r.confirmados} pagamentos confirmados`, 'success'); carregarCobrancas(); } catch (e) { erro(e); } }}>Sincronizar Asaas</Button><Button onClick={abrirCobranca}>Nova cobrança</Button></div>{loading ? <Loading /> : <TableWrapper><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Cliente</th><th className="p-3">Valor</th><th className="p-3">Método</th><th className="p-3">Vencimento</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{pagamentos.map((p) => <tr key={p.id} className="border-t"><td className="p-3">{p.cliente?.nome}</td><td className="p-3">{formatCurrency(p.valor)}</td><td className="p-3">{p.metodo}</td><td className="p-3">{formatDate(p.dueDate)}</td><td className="p-3"><Badge>{p.status}</Badge></td><td className="p-3">{p.status !== 'RECEIVED' && <Button variant="secondary" onClick={() => segundaVia(p.id)}>2ª via</Button>}</td></tr>)}</tbody></table></TableWrapper>}</>}

    <Modal open={modalLancamento} onClose={() => setModalLancamento(false)} title="Novo lançamento"><Select label="Natureza" value={formLanc.natureza} onChange={(e) => setFormLanc({ ...formLanc, natureza: e.target.value, categoriaId: '' })}><option value="receita">Receita</option><option value="despesa">Despesa</option><option value="transferencia">Transferência</option></Select><Input label="Descrição" value={formLanc.descricao} onChange={(e) => setFormLanc({ ...formLanc, descricao: e.target.value })} /><Input label="Valor" type="number" min="0" step="0.01" value={formLanc.valor} onChange={(e) => setFormLanc({ ...formLanc, valor: e.target.value })} /><Input label="Competência" type="date" value={formLanc.dataCompetencia} onChange={(e) => setFormLanc({ ...formLanc, dataCompetencia: e.target.value })} /><Input label="Vencimento" type="date" value={formLanc.dataVencimento} onChange={(e) => setFormLanc({ ...formLanc, dataVencimento: e.target.value })} />{formLanc.natureza !== 'transferencia' && <Select label="Categoria" value={formLanc.categoriaId} onChange={(e) => setFormLanc({ ...formLanc, categoriaId: e.target.value })}><option value="">Sem categoria</option>{categorias.filter((c) => c.ativo && (formLanc.natureza === 'receita' ? c.tipo === 'receita' : c.tipo !== 'receita' && c.tipo !== 'transferencia')).map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}</Select>}<Select label={formLanc.natureza === 'transferencia' ? 'Conta de origem' : 'Conta'} value={formLanc.contaId} onChange={(e) => setFormLanc({ ...formLanc, contaId: e.target.value })}><option value="">Selecione</option>{contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>{formLanc.natureza === 'transferencia' && <Select label="Conta de destino" value={formLanc.contaDestinoId} onChange={(e) => setFormLanc({ ...formLanc, contaDestinoId: e.target.value })}><option value="">Selecione</option>{contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>}<Button disabled={!formLanc.descricao || !formLanc.valor} onClick={salvarLancamento}>Salvar</Button></Modal>
    <Modal open={modalConta} onClose={() => setModalConta(false)} title="Nova conta"><Input label="Nome" value={formConta.nome} onChange={(e) => setFormConta({ ...formConta, nome: e.target.value })} /><Select label="Tipo" value={formConta.tipo} onChange={(e) => setFormConta({ ...formConta, tipo: e.target.value })}><option value="bancaria">Bancária</option><option value="digital">Digital</option><option value="caixa">Caixa</option><option value="cartao">Cartão</option></Select><Input label="Saldo inicial" type="number" value={formConta.saldoInicial} onChange={(e) => setFormConta({ ...formConta, saldoInicial: e.target.value })} /><Button onClick={salvarConta}>Salvar</Button></Modal>
    <Modal open={modalCategoria} onClose={() => setModalCategoria(false)} title={categoriaEditando ? 'Editar categoria' : 'Nova categoria'}><Input label="Nome" value={formCategoria.nome} onChange={(e) => setFormCategoria({ ...formCategoria, nome: e.target.value })} /><Select label="Tipo" value={formCategoria.tipo} onChange={(e) => setFormCategoria({ ...formCategoria, tipo: e.target.value })}><option value="receita">Receita</option><option value="custo_direto">Custo direto</option><option value="despesa_operacional">Despesa operacional</option><option value="despesa_financeira">Despesa financeira</option><option value="investimento">Investimento</option><option value="transferencia">Transferência</option></Select><Select label="Grupo DRE" value={formCategoria.grupoDre} onChange={(e) => setFormCategoria({ ...formCategoria, grupoDre: e.target.value })}><option value="receita_bruta">Receita bruta</option><option value="deducoes">Deduções</option><option value="custo_direto">Custo direto</option><option value="despesa_comercial">Despesa comercial</option><option value="despesa_administrativa">Despesa administrativa</option><option value="despesa_financeira">Despesa financeira</option><option value="investimento">Investimento</option></Select><label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={formCategoria.ativo} onChange={(e) => setFormCategoria({ ...formCategoria, ativo: e.target.checked })} /> Categoria ativa</label><Button onClick={salvarCategoria}>Salvar</Button></Modal>
    <Modal open={modalRec} onClose={() => setModalRec(false)} title="Despesa recorrente"><Input label="Descrição" value={formRec.descricao} onChange={(e) => setFormRec({ ...formRec, descricao: e.target.value })} /><Input label="Valor" type="number" value={formRec.valor} onChange={(e) => setFormRec({ ...formRec, valor: e.target.value })} /><Input label="Dia do mês" type="number" min="1" max="28" value={formRec.diaDoMes} onChange={(e) => setFormRec({ ...formRec, diaDoMes: e.target.value })} /><Input label="Fornecedor" value={formRec.fornecedorNome} onChange={(e) => setFormRec({ ...formRec, fornecedorNome: e.target.value })} /><Select label="Categoria" value={formRec.categoriaId} onChange={(e) => setFormRec({ ...formRec, categoriaId: e.target.value })}><option value="">Selecione</option>{categorias.filter((c) => c.ativo && c.tipo !== 'receita').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Select label="Conta" value={formRec.contaId} onChange={(e) => setFormRec({ ...formRec, contaId: e.target.value })}><option value="">Selecione</option>{contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Button onClick={async () => { try { await financeiroApi.salvarRecorrencia({ ...formRec, valor: Number(formRec.valor), diaDoMes: Number(formRec.diaDoMes), natureza: 'despesa' }); setModalRec(false); toast('Recorrência salva', 'success'); setRecorrencias(await financeiroApi.recorrencias() as typeof recorrencias); } catch (e) { erro(e); } }}>Salvar</Button></Modal>
    <Modal open={modalSubcategoria} onClose={() => setModalSubcategoria(false)} title="Nova subcategoria"><Select label="Categoria" value={formSubcategoria.categoriaId} onChange={(e) => setFormSubcategoria({ ...formSubcategoria, categoriaId: e.target.value })}><option value="">Selecione</option>{categorias.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Input label="Nome" value={formSubcategoria.nome} onChange={(e) => setFormSubcategoria({ ...formSubcategoria, nome: e.target.value })} /><Button disabled={!formSubcategoria.categoriaId || !formSubcategoria.nome} onClick={salvarSubcategoria}>Salvar</Button></Modal>
    <Modal open={modalCobranca} onClose={() => setModalCobranca(false)} title="Nova cobrança"><Select label="Cliente" value={formCobranca.clienteId} onChange={(e) => setFormCobranca({ ...formCobranca, clienteId: e.target.value })}><option value="">Selecione</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Input label="Valor" type="number" value={formCobranca.valor} onChange={(e) => setFormCobranca({ ...formCobranca, valor: e.target.value })} /><Select label="Método" value={formCobranca.metodo} onChange={(e) => setFormCobranca({ ...formCobranca, metodo: e.target.value })}><option value="PIX">PIX</option><option value="BOLETO">Boleto</option><option value="CARTAO">Cartão</option></Select><Input label="Vencimento" type="date" value={formCobranca.dueDate} onChange={(e) => setFormCobranca({ ...formCobranca, dueDate: e.target.value })} /><Button onClick={cobrar}>Gerar cobrança</Button></Modal>
    <Modal open={modalVia} onClose={() => setModalVia(false)} title="2ª via">{viaData?.invoiceUrl && <a href={viaData.invoiceUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">Abrir fatura</a>}{viaData?.pixCode && <textarea readOnly value={viaData.pixCode} className="mt-3 w-full rounded border p-2 text-xs" rows={4} />}{!viaData?.invoiceUrl && !viaData?.pixCode && <p className="text-slate-500">Nenhum link disponível.</p>}</Modal>
  </div>;
}
