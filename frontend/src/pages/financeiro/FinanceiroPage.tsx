import { useCallback, useEffect, useState } from 'react';
import { clientesApi, financeiroApi, pagamentosApi } from '../../services/modules.service';
import type { Cliente, FinBaixa, FinLancamento, Pagamento } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { Badge, Button, Card, Input, Loading, Modal, PageHeader, Select, TableWrapper, Tabs } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface FinConta { id: string; nome: string; tipo: string; saldoInicial: number; saldoAtual?: number; ativo: boolean }
interface FinSubcategoria { id: string; categoriaId: string; nome: string; ativo: boolean }
interface FinCategoria { id: string; tipo: string; nome: string; grupoDre?: string; ativo: boolean; subcategorias: FinSubcategoria[] }
type Resumo = { saldoDisponivel?: number; aReceber?: number; aPagar?: number; vencidos?: number; receitasRealizadas?: number; despesasRealizadas?: number };
type Fluxo = { periodo?: { label: string }; saldoInicial?: number; entradas?: number; saidas?: number; saldoAtual?: number; projecaoReceber?: number; projecaoPagar?: number; saldoProjetado?: number };
type Dre = Record<string, number | boolean | object>;
type Extrato = {
  conta?: { id: string; nome: string };
  saldoAbertura?: number;
  saldoAtual?: number;
  entradas?: number;
  saidas?: number;
  itens?: Array<{ id: string; data: string; tipo: string; descricao: string; valor: number; saldoApos: number; anexoUrl?: string | null }>;
};

const hoje = new Date().toISOString().slice(0, 10);
const formLancVazio = {
  natureza: 'despesa',
  descricao: '',
  valor: '',
  dataCompetencia: hoje,
  dataVencimento: hoje,
  categoriaId: '',
  contaId: '',
  contaDestinoId: '',
  clienteId: '',
  fornecedorNome: '',
  formaPagamento: '',
  observacoes: '',
  parcelas: '1',
  anexoUrl: '',
};
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
  const [formLanc, setFormLanc] = useState(formLancVazio);
  const [modalBaixa, setModalBaixa] = useState(false);
  const [lancBaixa, setLancBaixa] = useState<FinLancamento | null>(null);
  const [formBaixa, setFormBaixa] = useState({
    dataMovimento: hoje,
    valorPrincipal: '',
    juros: '0',
    multa: '0',
    desconto: '0',
    taxa: '0',
    contaId: '',
    formaPagamento: '',
    observacoes: '',
    anexoUrl: '',
  });
  const [modalDetalhe, setModalDetalhe] = useState(false);
  const [lancDetalhe, setLancDetalhe] = useState<(FinLancamento & { baixas?: FinBaixa[]; historico?: Array<Record<string, unknown>> }) | null>(null);
  const [modalExtrato, setModalExtrato] = useState(false);
  const [extrato, setExtrato] = useState<Extrato | null>(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
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
    if (tab === 'contas') {
      financeiroApi.contas(true).then((c) => setContas(c as FinConta[]));
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
  const uploadAnexo = async (file: File, destino: 'lanc' | 'baixa') => {
    setUploadingAnexo(true);
    try {
      const r = await financeiroApi.uploadAnexo(file);
      if (destino === 'lanc') setFormLanc((f) => ({ ...f, anexoUrl: r.url }));
      else setFormBaixa((f) => ({ ...f, anexoUrl: r.url }));
      toast('Anexo enviado', 'success');
    } catch (e) { erro(e); }
    finally { setUploadingAnexo(false); }
  };
  const salvarLancamento = async () => {
    try {
      const criado = await financeiroApi.criarLancamento({
        ...formLanc,
        valor: Number(formLanc.valor),
        dataVencimento: formLanc.dataVencimento || null,
        categoriaId: formLanc.categoriaId || null,
        contaId: formLanc.contaId || null,
        contaDestinoId: formLanc.contaDestinoId || null,
        clienteId: formLanc.natureza === 'receita' ? formLanc.clienteId || null : null,
        fornecedorNome: formLanc.natureza === 'despesa' ? formLanc.fornecedorNome || null : null,
        formaPagamento: formLanc.formaPagamento || null,
        observacoes: formLanc.observacoes || null,
        anexoUrl: formLanc.anexoUrl || null,
        parcelas: Number(formLanc.parcelas) || 1,
      }) as { total?: number };
      setModalLancamento(false);
      setFormLanc(formLancVazio);
      toast(
        criado?.total && criado.total > 1
          ? `${criado.total} parcelas criadas`
          : 'Lançamento criado',
        'success'
      );
      setTab('lancamentos');
      setLoading(true);
      financeiroApi.lancamentos({ ...filtros, periodo }).then((r) => setLancamentos(r.items)).finally(() => setLoading(false));
      carregarBase();
    } catch (e) {
      erro(e);
    }
  };
  const abrirNovoLancamento = async (natureza: 'despesa' | 'receita' | 'transferencia' = 'despesa') => {
    setFormLanc({ ...formLancVazio, natureza });
    setModalLancamento(true);
    if (natureza === 'receita' || !clientes.length) {
      try {
        const r = await clientesApi.listar({ status: 'ativo', limit: '500' });
        setClientes(r.clientes);
      } catch {
        /* lista de clientes opcional no formulário */
      }
    }
  };
  const abrirBaixa = (l: FinLancamento) => {
    const saldo = Math.max(0, Number(l.valor) - Number((l as { valorPago?: number }).valorPago || 0));
    setLancBaixa(l);
    setFormBaixa({
      dataMovimento: hoje,
      valorPrincipal: String(saldo),
      juros: '0',
      multa: '0',
      desconto: '0',
      taxa: '0',
      contaId: l.contaId || '',
      formaPagamento: l.formaPagamento || '',
      observacoes: '',
      anexoUrl: '',
    });
    setModalBaixa(true);
  };
  const confirmarBaixa = async () => {
    if (!lancBaixa) return;
    const principal = Number(formBaixa.valorPrincipal) || 0;
    const juros = Number(formBaixa.juros) || 0;
    const multa = Number(formBaixa.multa) || 0;
    const desconto = Number(formBaixa.desconto) || 0;
    const taxa = Number(formBaixa.taxa) || 0;
    const liquido = principal + juros + multa - desconto - taxa;
    try {
      const lancId = lancBaixa.id;
      await financeiroApi.baixarLancamento(lancId, {
        dataMovimento: formBaixa.dataMovimento,
        valorPrincipal: principal,
        juros,
        multa,
        desconto,
        taxa,
        contaId: formBaixa.contaId || null,
        formaPagamento: formBaixa.formaPagamento || null,
        observacoes: formBaixa.observacoes || null,
        anexoUrl: formBaixa.anexoUrl || null,
      });
      setModalBaixa(false);
      setLancBaixa(null);
      toast(
        `Baixa registrada em ${formBaixa.dataMovimento} — líquido ${formatCurrency(liquido)}`,
        'success'
      );
      setLancamentos((await financeiroApi.lancamentos({ ...filtros, periodo })).items);
      carregarBase();
      if (modalDetalhe) {
        setLancDetalhe(await financeiroApi.obterLancamento(lancId));
      }
    } catch (e) {
      erro(e);
    }
  };
  const abrirDetalhe = async (id: string) => {
    try {
      setLancDetalhe(await financeiroApi.obterLancamento(id));
      setModalDetalhe(true);
    } catch (e) { erro(e); }
  };
  const estornar = async (baixaId: string) => {
    if (!confirm('Confirmar estorno desta baixa?')) return;
    try {
      const r = await financeiroApi.estornarBaixa(baixaId, { motivo: 'Estorno manual' });
      setLancDetalhe(r as typeof lancDetalhe);
      toast('Baixa estornada', 'success');
      setLancamentos((await financeiroApi.lancamentos({ ...filtros, periodo })).items);
      carregarBase();
    } catch (e) { erro(e); }
  };
  const abrirExtrato = async (contaId: string) => {
    try {
      setExtrato(await financeiroApi.extratoConta(contaId, { periodo }) as Extrato);
      setModalExtrato(true);
    } catch (e) { erro(e); }
  };
  const excluirLancamento = async (l: { id: string; descricao: string }) => {
    if (!confirm(`Apagar o lançamento "${l.descricao}"?\n\nEssa ação remove o lançamento e as baixas vinculadas. Não dá para desfazer.`)) {
      return;
    }
    try {
      await financeiroApi.excluirLancamento(l.id);
      toast('Lançamento apagado', 'success');
      setModalDetalhe(false);
      setLancDetalhe(null);
      setLancamentos((await financeiroApi.lancamentos({ ...filtros, periodo })).items);
      carregarBase();
    } catch (e) {
      erro(e);
    }
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
    {tab === 'lancamentos' && <><div className="mb-4 flex flex-wrap items-end gap-2">{filtroPeriodo}<Select label="Natureza" value={filtros.natureza} onChange={(e) => setFiltros({ ...filtros, natureza: e.target.value })}><option value="">Todas</option><option value="receita">A receber / Receitas</option><option value="despesa">A pagar / Despesas</option><option value="transferencia">Transferência</option></Select><Select label="Status" value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}><option value="">Todos</option><option value="a_receber">A receber</option><option value="a_pagar">A pagar</option><option value="parcial">Parcial</option><option value="recebida">Recebida</option><option value="paga">Paga</option><option value="vencida">Vencida</option></Select><Input label="Buscar" value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} /><Button variant="secondary" onClick={exportar}>Exportar CSV</Button><Button variant="secondary" onClick={() => abrirNovoLancamento('receita')}>Nova conta a receber</Button><Button onClick={() => abrirNovoLancamento('despesa')}>Nova conta a pagar</Button></div>
      {loading ? <Loading /> : <TableWrapper><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Descrição</th><th className="p-3">Fornecedor/Cliente</th><th className="p-3">Categoria</th><th className="p-3">Vencimento</th><th className="p-3">Valor</th><th className="p-3">Pago/Recebido</th><th className="p-3">Saldo</th><th className="p-3">Status</th><th className="p-3">Pagamento</th><th className="p-3">Conta</th><th className="p-3"></th></tr></thead><tbody>{lancamentos.map((l) => {
        const pago = Number((l as { valorPago?: number }).valorPago || (['recebida','paga'].includes(l.status) ? l.valor : 0));
        const saldo = Number((l as { saldo?: number }).saldo ?? Math.max(0, Number(l.valor) - pago));
        return <tr key={l.id} className="border-t"><td className="p-3 font-medium">{l.descricao}{l.parcelaTotal ? <span className="ml-1 text-xs text-slate-400">{l.parcelaNumero}/{l.parcelaTotal}</span> : null}</td><td className="p-3">{l.fornecedorNome || l.cliente?.nome || '—'}</td><td className="p-3">{l.categoria?.nome || '—'}</td><td className="p-3">{l.dataVencimento ? formatDate(l.dataVencimento) : '—'}</td><td className="p-3">{formatCurrency(l.valor)}</td><td className="p-3">{formatCurrency(pago)}</td><td className="p-3">{formatCurrency(saldo)}</td><td className="p-3"><Badge>{l.statusEfetivo || l.status}</Badge></td><td className="p-3">{l.dataMovimento ? formatDate(l.dataMovimento) : '—'}</td><td className="p-3">{l.conta?.nome || '—'}</td><td className="p-3"><div className="flex flex-wrap gap-1"><Button variant="secondary" onClick={() => abrirDetalhe(l.id)}>Detalhes</Button>{!['recebida', 'paga', 'cancelada', 'estornada'].includes(l.status) && <Button variant="secondary" onClick={() => abrirBaixa(l)}>Registrar pagamento</Button>}<Button variant="danger" onClick={() => excluirLancamento(l)}>Apagar</Button></div></td></tr>;
      })}</tbody></table></TableWrapper>}</>}
    {tab === 'contas' && <><div className="mb-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => abrirNovoLancamento('transferencia')}>Transferir</Button><Button onClick={() => setModalConta(true)}>Nova conta</Button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{contas.map((c) => <Card key={c.id}><div className="flex justify-between"><h3 className="font-semibold">{c.nome}</h3><Badge color={c.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge></div><p className="text-sm capitalize text-slate-500">{c.tipo}</p><p className="mt-1 text-xs text-slate-400">Saldo inicial {formatCurrency(c.saldoInicial)}</p><p className="mt-2 text-xl font-bold text-primary-700">{formatCurrency(c.saldoAtual ?? c.saldoInicial)}</p><Button className="mt-3" variant="secondary" onClick={() => abrirExtrato(c.id)}>Ver extrato</Button></Card>)}</div></>}
    {tab === 'categorias' && <><div className="mb-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalSubcategoria(true)}>Nova subcategoria</Button><Button onClick={() => { setCategoriaEditando(null); setFormCategoria({ nome: '', tipo: 'despesa_operacional', grupoDre: 'despesa_administrativa', ativo: true }); setModalCategoria(true); }}>Nova categoria</Button></div><div className="space-y-3">{categorias.map((c) => <Card key={c.id}><div className="flex items-center justify-between"><div><h3 className="font-semibold">{c.nome} <Badge>{c.tipo}</Badge></h3><p className="text-xs text-slate-500">{c.grupoDre || 'Sem grupo DRE'}</p></div><div className="flex gap-2"><Badge color={c.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge><Button variant="secondary" onClick={() => editarCategoria(c)}>Editar</Button></div></div>{c.subcategorias?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{c.subcategorias.map((s) => <Badge key={s.id}>{s.nome}</Badge>)}</div>}</Card>)}</div></>}
    {tab === 'recorrencias' && <><div className="mb-4 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={async () => { try { const r = await financeiroApi.processarRecorrencias(); toast(`${(r as { gerados?: number }).gerados || 0} lançamentos gerados`, 'success'); } catch (e) { erro(e); } }}>Gerar competências</Button><Button onClick={() => setModalRec(true)}>Nova recorrência</Button></div><TableWrapper><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Descrição</th><th className="p-3">Dia</th><th className="p-3">Valor</th><th className="p-3">Categoria</th><th className="p-3">Status</th></tr></thead><tbody>{recorrencias.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{r.descricao}</td><td className="p-3">Todo dia {r.diaDoMes}</td><td className="p-3">{formatCurrency(Number(r.valor))}</td><td className="p-3">{r.categoria?.nome || '—'}</td><td className="p-3"><Badge>{r.ativo ? 'Ativa' : 'Inativa'}</Badge></td></tr>)}</tbody></table></TableWrapper></>}
    {tab === 'fluxo' && <>{filtroPeriodo}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Saldo inicial', fluxo.saldoInicial], ['Entradas', fluxo.entradas], ['Saídas', fluxo.saidas], ['Saldo atual', fluxo.saldoAtual], ['A receber', fluxo.projecaoReceber], ['A pagar', fluxo.projecaoPagar], ['Saldo projetado', fluxo.saldoProjetado]].map(([l, v]) => <Card key={String(l)}><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold text-primary-700">{formatCurrency(Number(v || 0))}</p></Card>)}</div></>}
    {tab === 'dre' && <>{filtroPeriodo}<Card><h2 className="mb-4 text-lg font-bold text-primary-700">DRE gerencial</h2>{!dre.temDadosReais && <p className="mb-3 rounded bg-amber-50 p-3 text-sm text-amber-800">Cadastre receitas e despesas por categoria para compor a DRE.</p>}{[['Receita bruta', 'receitaBruta'], ['(-) Deduções', 'deducoes'], ['Receita líquida', 'receitaLiquida'], ['(-) Custos diretos', 'custosDiretos'], ['Margem de contribuição', 'margemContribuicao'], ['(-) Despesas comerciais', 'despesasComerciais'], ['(-) Despesas administrativas', 'despesasAdministrativas'], ['(-) Despesas financeiras', 'despesasFinanceiras'], ['Resultado operacional', 'resultadoOperacional']].map(([l, k]) => <div key={k} className={`flex justify-between border-t py-3 ${k === 'receitaLiquida' || k === 'margemContribuicao' || k === 'resultadoOperacional' ? 'font-bold text-primary-700' : ''}`}><span>{l}</span><span>{formatCurrency(Number(dre[k] || 0))}</span></div>)}</Card></>}
    {tab === 'cobrancas' && <><div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Receita do mês', dashboardAsaas.receitaMes], ['Pendente', dashboardAsaas.totalPendente], ['Vencido', dashboardAsaas.totalVencido], ['Inadimplência', `${(dashboardAsaas.inadimplencia || 0).toFixed(1)}%`]].map(([l, v]) => <Card key={String(l)}><p className="text-sm text-slate-500">{l}</p><p className="text-xl font-bold text-primary-700">{typeof v === 'string' ? v : formatCurrency(Number(v || 0))}</p></Card>)}</div><div className="mb-4 flex flex-wrap gap-2"><Select label="Status" value={statusCobranca} onChange={(e) => setStatusCobranca(e.target.value)}><option value="">Todos</option><option value="PENDING">Pendente</option><option value="RECEIVED">Recebido</option><option value="OVERDUE">Vencido</option></Select><Button variant="secondary" onClick={async () => { try { const r = await pagamentosApi.sincronizarAsaas(); toast(`${r.confirmados} pagamentos confirmados`, 'success'); carregarCobrancas(); } catch (e) { erro(e); } }}>Sincronizar Asaas</Button><Button onClick={abrirCobranca}>Nova cobrança</Button></div>{loading ? <Loading /> : <TableWrapper><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Cliente</th><th className="p-3">Valor</th><th className="p-3">Método</th><th className="p-3">Vencimento</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{pagamentos.map((p) => <tr key={p.id} className="border-t"><td className="p-3">{p.cliente?.nome}</td><td className="p-3">{formatCurrency(p.valor)}</td><td className="p-3">{p.metodo}</td><td className="p-3">{formatDate(p.dueDate)}</td><td className="p-3"><Badge>{p.status}</Badge></td><td className="p-3">{p.status !== 'RECEIVED' && <Button variant="secondary" onClick={() => segundaVia(p.id)}>2ª via</Button>}</td></tr>)}</tbody></table></TableWrapper>}</>}

    <Modal open={modalLancamento} onClose={() => setModalLancamento(false)} title="Novo lançamento">
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
        <Select
          label="Natureza"
          value={formLanc.natureza}
          onChange={async (e) => {
            const natureza = e.target.value;
            setFormLanc({
              ...formLanc,
              natureza,
              categoriaId: '',
              clienteId: natureza === 'receita' ? formLanc.clienteId : '',
              fornecedorNome: natureza === 'despesa' ? formLanc.fornecedorNome : '',
            });
            if (natureza === 'receita' && !clientes.length) {
              try {
                const r = await clientesApi.listar({ status: 'ativo', limit: '500' });
                setClientes(r.clientes);
              } catch { /* ignore */ }
            }
          }}
        >
          <option value="despesa">Conta a pagar (despesa)</option>
          <option value="receita">Conta a receber (receita)</option>
          <option value="transferencia">Transferência</option>
        </Select>
        <Input label="Descrição" value={formLanc.descricao} onChange={(e) => setFormLanc({ ...formLanc, descricao: e.target.value })} />
        {formLanc.natureza === 'receita' && (
          <Select
            label="Cliente"
            value={formLanc.clienteId}
            onChange={(e) => setFormLanc({ ...formLanc, clienteId: e.target.value })}
          >
            <option value="">Selecione o cliente (opcional)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.telefone ? ` — ${c.telefone}` : ''}
              </option>
            ))}
          </Select>
        )}
        {formLanc.natureza === 'despesa' && (
          <Input label="Fornecedor / beneficiário" value={formLanc.fornecedorNome} onChange={(e) => setFormLanc({ ...formLanc, fornecedorNome: e.target.value })} />
        )}
        <Input label="Valor original" type="number" min="0" step="0.01" value={formLanc.valor} onChange={(e) => setFormLanc({ ...formLanc, valor: e.target.value })} />
        {formLanc.natureza !== 'transferencia' && (
          <Input
            label="Parcelas"
            type="number"
            min="1"
            max="60"
            value={formLanc.parcelas}
            onChange={(e) => setFormLanc({ ...formLanc, parcelas: e.target.value })}
          />
        )}
        {Number(formLanc.parcelas) > 1 && formLanc.valor && (
          <p className="text-xs text-slate-500">
            {formLanc.parcelas}x de aproximadamente {formatCurrency(Number(formLanc.valor) / Number(formLanc.parcelas))} (vencimentos mensais a partir da data informada)
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Competência" type="date" value={formLanc.dataCompetencia} onChange={(e) => setFormLanc({ ...formLanc, dataCompetencia: e.target.value })} />
          <Input label="Vencimento" type="date" value={formLanc.dataVencimento} onChange={(e) => setFormLanc({ ...formLanc, dataVencimento: e.target.value })} />
        </div>
        {formLanc.natureza !== 'transferencia' && (
          <Select label="Categoria" value={formLanc.categoriaId} onChange={(e) => setFormLanc({ ...formLanc, categoriaId: e.target.value })}>
            <option value="">Sem categoria</option>
            {categorias.filter((c) => c.ativo && (formLanc.natureza === 'receita' ? c.tipo === 'receita' : c.tipo !== 'receita' && c.tipo !== 'transferencia')).map((c) => (
              <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>
            ))}
          </Select>
        )}
        <Select label={formLanc.natureza === 'transferencia' ? 'Conta de origem' : 'Conta prevista'} value={formLanc.contaId} onChange={(e) => setFormLanc({ ...formLanc, contaId: e.target.value })}>
          <option value="">Selecione</option>
          {contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        {formLanc.natureza === 'transferencia' && (
          <Select label="Conta de destino" value={formLanc.contaDestinoId} onChange={(e) => setFormLanc({ ...formLanc, contaDestinoId: e.target.value })}>
            <option value="">Selecione</option>
            {contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        )}
        <Select label="Forma de pagamento" value={formLanc.formaPagamento} onChange={(e) => setFormLanc({ ...formLanc, formaPagamento: e.target.value })}>
          <option value="">Não definida</option>
          <option value="PIX">PIX</option>
          <option value="BOLETO">Boleto</option>
          <option value="CARTAO">Cartão</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="TRANSFERENCIA">Transferência</option>
        </Select>
        <Input label="Observações" value={formLanc.observacoes} onChange={(e) => setFormLanc({ ...formLanc, observacoes: e.target.value })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Anexo (NF, comprovante)</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            disabled={uploadingAnexo}
            onChange={(e) => e.target.files?.[0] && uploadAnexo(e.target.files[0], 'lanc')}
            className="block w-full text-sm"
          />
          {formLanc.anexoUrl && (
            <a href={formLanc.anexoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary-600 underline">
              Ver anexo
            </a>
          )}
        </div>
        <p className="text-xs text-slate-500">Cadastrar a conta não movimenta o caixa. A saída/entrada só ocorre ao registrar o pagamento (exceto transferência).</p>
        <Button disabled={!formLanc.descricao || !formLanc.valor} onClick={salvarLancamento}>Salvar</Button>
      </div>
    </Modal>
    <Modal open={modalBaixa} onClose={() => setModalBaixa(false)} title="Registrar pagamento">
      {lancBaixa && (
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-800">{lancBaixa.descricao}</p>
            <p className="text-slate-600">
              Original {formatCurrency(lancBaixa.valor)}
              {lancBaixa.dataVencimento ? ` · Venc. ${formatDate(lancBaixa.dataVencimento)}` : ''}
            </p>
            <p className="text-slate-600">
              Já pago {formatCurrency(Number((lancBaixa as { valorPago?: number }).valorPago || 0))} · Saldo{' '}
              {formatCurrency(
                Number(
                  (lancBaixa as { saldo?: number }).saldo ??
                    Math.max(0, Number(lancBaixa.valor) - Number((lancBaixa as { valorPago?: number }).valorPago || 0))
                )
              )}
            </p>
          </div>
          <Input
            label="Data efetiva do pagamento *"
            type="date"
            value={formBaixa.dataMovimento}
            onChange={(e) => setFormBaixa({ ...formBaixa, dataMovimento: e.target.value })}
          />
          <Input
            label="Valor pago (principal)"
            type="number"
            min="0"
            step="0.01"
            value={formBaixa.valorPrincipal}
            onChange={(e) => setFormBaixa({ ...formBaixa, valorPrincipal: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Juros" type="number" min="0" step="0.01" value={formBaixa.juros} onChange={(e) => setFormBaixa({ ...formBaixa, juros: e.target.value })} />
            <Input label="Multa" type="number" min="0" step="0.01" value={formBaixa.multa} onChange={(e) => setFormBaixa({ ...formBaixa, multa: e.target.value })} />
            <Input label="Desconto" type="number" min="0" step="0.01" value={formBaixa.desconto} onChange={(e) => setFormBaixa({ ...formBaixa, desconto: e.target.value })} />
          </div>
          <Input label="Taxa (cartão/Asaas)" type="number" min="0" step="0.01" value={formBaixa.taxa} onChange={(e) => setFormBaixa({ ...formBaixa, taxa: e.target.value })} />
          <p className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-800">
            Valor líquido no caixa:{' '}
            {formatCurrency(
              (Number(formBaixa.valorPrincipal) || 0) +
                (Number(formBaixa.juros) || 0) +
                (Number(formBaixa.multa) || 0) -
                (Number(formBaixa.desconto) || 0) -
                (Number(formBaixa.taxa) || 0)
            )}
          </p>
          <Select label="Conta/caixa de onde saiu (ou entrou)" value={formBaixa.contaId} onChange={(e) => setFormBaixa({ ...formBaixa, contaId: e.target.value })}>
            <option value="">Selecione</option>
            {contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select label="Forma de pagamento" value={formBaixa.formaPagamento} onChange={(e) => setFormBaixa({ ...formBaixa, formaPagamento: e.target.value })}>
            <option value="">Selecione</option>
            <option value="PIX">PIX</option>
            <option value="BOLETO">Boleto</option>
            <option value="CARTAO">Cartão</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="TRANSFERENCIA">Transferência</option>
          </Select>
          <Input label="Observação" value={formBaixa.observacoes} onChange={(e) => setFormBaixa({ ...formBaixa, observacoes: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Comprovante</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              disabled={uploadingAnexo}
              onChange={(e) => e.target.files?.[0] && uploadAnexo(e.target.files[0], 'baixa')}
              className="block w-full text-sm"
            />
            {formBaixa.anexoUrl && (
              <a href={formBaixa.anexoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary-600 underline">
                Ver comprovante
              </a>
            )}
          </div>
          <Button disabled={!formBaixa.dataMovimento || !(Number(formBaixa.valorPrincipal) > 0)} onClick={confirmarBaixa}>
            Confirmar baixa
          </Button>
        </div>
      )}
    </Modal>
    <Modal open={modalConta} onClose={() => setModalConta(false)} title="Nova conta"><Input label="Nome" value={formConta.nome} onChange={(e) => setFormConta({ ...formConta, nome: e.target.value })} /><Select label="Tipo" value={formConta.tipo} onChange={(e) => setFormConta({ ...formConta, tipo: e.target.value })}><option value="bancaria">Bancária</option><option value="digital">Digital</option><option value="caixa">Caixa</option><option value="cartao">Cartão</option></Select><Input label="Saldo inicial" type="number" value={formConta.saldoInicial} onChange={(e) => setFormConta({ ...formConta, saldoInicial: e.target.value })} /><Button onClick={salvarConta}>Salvar</Button></Modal>
    <Modal open={modalCategoria} onClose={() => setModalCategoria(false)} title={categoriaEditando ? 'Editar categoria' : 'Nova categoria'}><Input label="Nome" value={formCategoria.nome} onChange={(e) => setFormCategoria({ ...formCategoria, nome: e.target.value })} /><Select label="Tipo" value={formCategoria.tipo} onChange={(e) => setFormCategoria({ ...formCategoria, tipo: e.target.value })}><option value="receita">Receita</option><option value="custo_direto">Custo direto</option><option value="despesa_operacional">Despesa operacional</option><option value="despesa_financeira">Despesa financeira</option><option value="investimento">Investimento</option><option value="transferencia">Transferência</option></Select><Select label="Grupo DRE" value={formCategoria.grupoDre} onChange={(e) => setFormCategoria({ ...formCategoria, grupoDre: e.target.value })}><option value="receita_bruta">Receita bruta</option><option value="deducoes">Deduções</option><option value="custo_direto">Custo direto</option><option value="despesa_comercial">Despesa comercial</option><option value="despesa_administrativa">Despesa administrativa</option><option value="despesa_financeira">Despesa financeira</option><option value="investimento">Investimento</option></Select><label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={formCategoria.ativo} onChange={(e) => setFormCategoria({ ...formCategoria, ativo: e.target.checked })} /> Categoria ativa</label><Button onClick={salvarCategoria}>Salvar</Button></Modal>
    <Modal open={modalRec} onClose={() => setModalRec(false)} title="Despesa recorrente"><Input label="Descrição" value={formRec.descricao} onChange={(e) => setFormRec({ ...formRec, descricao: e.target.value })} /><Input label="Valor" type="number" value={formRec.valor} onChange={(e) => setFormRec({ ...formRec, valor: e.target.value })} /><Input label="Dia do mês" type="number" min="1" max="28" value={formRec.diaDoMes} onChange={(e) => setFormRec({ ...formRec, diaDoMes: e.target.value })} /><Input label="Fornecedor" value={formRec.fornecedorNome} onChange={(e) => setFormRec({ ...formRec, fornecedorNome: e.target.value })} /><Select label="Categoria" value={formRec.categoriaId} onChange={(e) => setFormRec({ ...formRec, categoriaId: e.target.value })}><option value="">Selecione</option>{categorias.filter((c) => c.ativo && c.tipo !== 'receita').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Select label="Conta" value={formRec.contaId} onChange={(e) => setFormRec({ ...formRec, contaId: e.target.value })}><option value="">Selecione</option>{contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Button onClick={async () => { try { await financeiroApi.salvarRecorrencia({ ...formRec, valor: Number(formRec.valor), diaDoMes: Number(formRec.diaDoMes), natureza: 'despesa' }); setModalRec(false); toast('Recorrência salva', 'success'); setRecorrencias(await financeiroApi.recorrencias() as typeof recorrencias); } catch (e) { erro(e); } }}>Salvar</Button></Modal>
    <Modal open={modalSubcategoria} onClose={() => setModalSubcategoria(false)} title="Nova subcategoria"><Select label="Categoria" value={formSubcategoria.categoriaId} onChange={(e) => setFormSubcategoria({ ...formSubcategoria, categoriaId: e.target.value })}><option value="">Selecione</option>{categorias.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Input label="Nome" value={formSubcategoria.nome} onChange={(e) => setFormSubcategoria({ ...formSubcategoria, nome: e.target.value })} /><Button disabled={!formSubcategoria.categoriaId || !formSubcategoria.nome} onClick={salvarSubcategoria}>Salvar</Button></Modal>
    <Modal open={modalCobranca} onClose={() => setModalCobranca(false)} title="Nova cobrança"><Select label="Cliente" value={formCobranca.clienteId} onChange={(e) => setFormCobranca({ ...formCobranca, clienteId: e.target.value })}><option value="">Selecione</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select><Input label="Valor" type="number" value={formCobranca.valor} onChange={(e) => setFormCobranca({ ...formCobranca, valor: e.target.value })} /><Select label="Método" value={formCobranca.metodo} onChange={(e) => setFormCobranca({ ...formCobranca, metodo: e.target.value })}><option value="PIX">PIX</option><option value="BOLETO">Boleto</option><option value="CARTAO">Cartão</option></Select><Input label="Vencimento" type="date" value={formCobranca.dueDate} onChange={(e) => setFormCobranca({ ...formCobranca, dueDate: e.target.value })} /><Button onClick={cobrar}>Gerar cobrança</Button></Modal>
    <Modal open={modalVia} onClose={() => setModalVia(false)} title="2ª via">{viaData?.invoiceUrl && <a href={viaData.invoiceUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">Abrir fatura</a>}{viaData?.pixCode && <textarea readOnly value={viaData.pixCode} className="mt-3 w-full rounded border p-2 text-xs" rows={4} />}{!viaData?.invoiceUrl && !viaData?.pixCode && <p className="text-slate-500">Nenhum link disponível.</p>}</Modal>
    <Modal open={modalDetalhe} onClose={() => setModalDetalhe(false)} title="Detalhe do lançamento">
      {lancDetalhe && (
        <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold">{lancDetalhe.descricao}</p>
            <p className="text-slate-600">
              {formatCurrency(lancDetalhe.valor)} · {lancDetalhe.statusEfetivo || lancDetalhe.status}
              {lancDetalhe.parcelaTotal ? ` · Parcela ${lancDetalhe.parcelaNumero}/${lancDetalhe.parcelaTotal}` : ''}
            </p>
            <p className="text-slate-600">
              Pago {formatCurrency(Number(lancDetalhe.valorPago || 0))} · Saldo {formatCurrency(Number(lancDetalhe.saldo || 0))}
            </p>
            {lancDetalhe.anexoUrl && (
              <a href={lancDetalhe.anexoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 underline">Anexo do lançamento</a>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Baixas</h3>
            {!lancDetalhe.baixas?.length ? (
              <p className="text-sm text-slate-500">Nenhuma baixa registrada.</p>
            ) : (
              <div className="space-y-2">
                {lancDetalhe.baixas.map((b) => (
                  <div key={b.id} className={`rounded border p-3 text-sm ${b.estornado || b.tipo === 'estorno' ? 'bg-slate-50 opacity-70' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {b.tipo === 'estorno' ? 'Estorno' : 'Baixa'} · {formatDate(b.dataMovimento)} · {formatCurrency(Number(b.valorLiquido))}
                      </span>
                      <Badge>{b.estornado ? 'Estornada' : b.tipo}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Principal {formatCurrency(Number(b.valorPrincipal))}
                      {Number(b.juros) > 0 ? ` · Juros ${formatCurrency(Number(b.juros))}` : ''}
                      {Number(b.multa) > 0 ? ` · Multa ${formatCurrency(Number(b.multa))}` : ''}
                      {Number(b.desconto) > 0 ? ` · Desc. ${formatCurrency(Number(b.desconto))}` : ''}
                      {Number(b.taxa) > 0 ? ` · Taxa ${formatCurrency(Number(b.taxa))}` : ''}
                      {b.conta?.nome ? ` · ${b.conta.nome}` : ''}
                    </p>
                    {b.anexoUrl && <a href={b.anexoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-600 underline">Comprovante</a>}
                    {b.tipo === 'baixa' && !b.estornado && (
                      <Button className="mt-2" variant="secondary" onClick={() => estornar(b.id)}>Estornar</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Histórico / auditoria</h3>
            {!lancDetalhe.historico?.length ? (
              <p className="text-sm text-slate-500">Sem eventos.</p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-600">
                {[...lancDetalhe.historico].reverse().map((h, i) => (
                  <li key={i} className="rounded border border-slate-100 px-2 py-1">
                    <span className="font-medium">{String(h.acao || 'evento')}</span>
                    {h.em ? ` · ${new Date(String(h.em)).toLocaleString('pt-BR')}` : ''}
                    {h.valorPrincipal != null ? ` · principal ${formatCurrency(Number(h.valorPrincipal))}` : ''}
                    {h.motivo ? ` · ${String(h.motivo)}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!['recebida', 'paga', 'cancelada', 'estornada'].includes(lancDetalhe.status) && (
              <Button onClick={() => { setModalDetalhe(false); abrirBaixa(lancDetalhe); }}>Registrar pagamento</Button>
            )}
            <Button variant="danger" onClick={() => excluirLancamento(lancDetalhe)}>Apagar lançamento</Button>
          </div>
        </div>
      )}
    </Modal>
    <Modal open={modalExtrato} onClose={() => setModalExtrato(false)} title={`Extrato — ${extrato?.conta?.nome || ''}`}>
      {extrato && (
        <div className="grid max-h-[75vh] gap-3 overflow-y-auto pr-1">
          <div className="grid gap-2 sm:grid-cols-4">
            {[['Abertura', extrato.saldoAbertura], ['Entradas', extrato.entradas], ['Saídas', extrato.saidas], ['Saldo', extrato.saldoAtual]].map(([l, v]) => (
              <div key={String(l)} className="rounded bg-slate-50 p-2 text-sm">
                <p className="text-slate-500">{l}</p>
                <p className="font-semibold">{formatCurrency(Number(v || 0))}</p>
              </div>
            ))}
          </div>
          <TableWrapper>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2">Tipo</th><th className="p-2">Valor</th><th className="p-2">Saldo</th></tr>
              </thead>
              <tbody>
                {(extrato.itens || []).map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-2">{formatDate(m.data)}</td>
                    <td className="p-2">{m.descricao}{m.anexoUrl ? <> · <a href={m.anexoUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">anexo</a></> : null}</td>
                    <td className="p-2"><Badge>{m.tipo}</Badge></td>
                    <td className={`p-2 font-medium ${m.valor >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(m.valor)}</td>
                    <td className="p-2">{formatCurrency(m.saldoApos)}</td>
                  </tr>
                ))}
                {!extrato.itens?.length && (
                  <tr><td colSpan={5} className="p-3 text-slate-500">Sem movimentos no período.</td></tr>
                )}
              </tbody>
            </table>
          </TableWrapper>
        </div>
      )}
    </Modal>
  </div>;
}
