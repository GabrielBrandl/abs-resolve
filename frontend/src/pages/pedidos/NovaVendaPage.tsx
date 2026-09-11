import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  catalogoAdminApi,
  clientesApi,
  pedidosApi,
} from '../../services/modules.service';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast';
import {
  QuestionarioServico,
  type PrecoCalculado,
} from '../../components/cliente/QuestionarioServico';
import type { CatalogoServicoAdmin, Cliente } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Input, Select, Button, Card } from '../../components/ui';

const ETAPAS = [
  'Cliente',
  'Origem',
  'Serviço',
  'Questionário',
  'Resumo',
] as const;

const CANAIS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'site', label: 'Site' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'meta_ads', label: 'Facebook/Meta Ads' },
  { key: 'google', label: 'Google' },
  { key: 'indicacao', label: 'Indicação' },
  { key: 'recorrente', label: 'Cliente recorrente' },
  { key: 'parceiro', label: 'Parceiro' },
  { key: 'outros', label: 'Outro' },
] as const;

type ItemCarrinho = {
  localId: string;
  slug: string;
  nome: string;
  categoria: string;
  quantidade: number;
  respostas: Record<string, string>;
  preco: PrecoCalculado | null;
  imagemUrl?: string | null;
  tipoPreco?: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NovaVendaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Etapa 1 — Cliente
  const [telefoneBusca, setTelefoneBusca] = useState('');
  const [encontrados, setEncontrados] = useState<
    Array<{ id: string; nome: string; telefone: string; email: string; status: string }>
  >([]);
  const [buscandoTel, setBuscandoTel] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [novoCliente, setNovoCliente] = useState(false);
  const [cliForm, setCliForm] = useState({
    nome: '',
    whatsapp: '',
    cpf: '',
    cnpj: '',
    email: '',
    tipo: 'PF' as 'PF' | 'PJ',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
  });

  // Etapa 2 — Origem
  const [origem, setOrigem] = useState({
    canal: 'whatsapp',
    campanha: '',
    anuncio: '',
    responsavel: user?.nome || 'Comercial',
  });

  // Etapa 3/4 — Serviços
  const [catalogo, setCatalogo] = useState<CatalogoServicoAdmin[]>([]);
  const [buscaServico, setBuscaServico] = useState('');
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [itemAtivo, setItemAtivo] = useState<string | null>(null);

  // Etapa 5 — Ajuste admin
  const [descontoValor, setDescontoValor] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const leadId = searchParams.get('lead') || undefined;

  useEffect(() => {
    catalogoAdminApi.servicos().then(setCatalogo).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.nome) setOrigem((o) => ({ ...o, responsavel: o.responsavel || user.nome }));
  }, [user?.nome]);

  useEffect(() => {
    const telefone = telefoneBusca.replace(/\D/g, '');
    if (telefone.length < 4) {
      setEncontrados([]);
      return;
    }
    const t = window.setTimeout(() => {
      setBuscandoTel(true);
      clientesApi
        .buscarTelefone(telefone)
        .then(setEncontrados)
        .catch(() => setEncontrados([]))
        .finally(() => setBuscandoTel(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [telefoneBusca]);

  const servicosFiltrados = useMemo(() => {
    const q = buscaServico.trim().toLowerCase();
    return catalogo
      .filter((s) => s.ativo !== false)
      .filter(
        (s) =>
          !q ||
          s.nome.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          s.categoria.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [catalogo, buscaServico]);

  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + (i.preco?.preco || 0), 0),
    [itens]
  );
  const descontoNum = isAdmin && descontoValor ? Math.max(0, Number(descontoValor) || 0) : 0;
  const total = Math.max(0, Math.round((subtotal - descontoNum) * 100) / 100);

  const selecionarCliente = async (id: string) => {
    const full = await clientesApi.buscar(id);
    setCliente(full);
    setNovoCliente(false);
    setEncontrados([]);
    setTelefoneBusca(full.telefone || full.whatsapp || '');
  };

  const cadastrarCliente = async () => {
    if (!cliForm.nome.trim() || !(cliForm.whatsapp || telefoneBusca).replace(/\D/g, '')) {
      toast('Nome e WhatsApp são obrigatórios', 'error');
      return;
    }
    try {
      const tel = (cliForm.whatsapp || telefoneBusca).replace(/\D/g, '');
      const criado = await clientesApi.criar({
        tipo: cliForm.tipo,
        nome: cliForm.nome.trim(),
        telefone: tel,
        whatsapp: tel,
        email: cliForm.email || undefined,
        cpf: cliForm.tipo === 'PF' ? cliForm.cpf || undefined : undefined,
        cnpj: cliForm.tipo === 'PJ' ? cliForm.cnpj || undefined : undefined,
        cadastroSimplificado: true,
        origem: origem.canal,
        endereco: {
          rua: cliForm.rua,
          numero: cliForm.numero,
          bairro: cliForm.bairro,
          cidade: cliForm.cidade,
          uf: cliForm.uf,
          cep: cliForm.cep,
        },
        consentimentoLgpd: true,
      });
      setCliente(criado);
      setNovoCliente(false);
      toast('Cliente cadastrado', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao cadastrar', 'error');
    }
  };

  const adicionarServico = (s: CatalogoServicoAdmin) => {
    if (s.tipoPreco === 'sob_orcamento') {
      toast(
        'Este serviço é sob orçamento. Adicione e salve como orçamento; o preço poderá ser ajustado depois.',
        'info'
      );
    }
    const localId = uid();
    const item: ItemCarrinho = {
      localId,
      slug: s.slug,
      nome: s.nome,
      categoria: s.categoria,
      quantidade: 1,
      respostas: {},
      preco: s.precoMinimo != null && s.tipoPreco !== 'sob_orcamento'
        ? { preco: Number(s.precoMinimo), breakdown: [{ label: 'Preço catálogo', valor: Number(s.precoMinimo) }], requerValidacaoTecnica: false }
        : null,
      imagemUrl: s.imagemUrl,
      tipoPreco: s.tipoPreco,
    };
    setItens((prev) => [...prev, item]);
    setItemAtivo(localId);
    setBuscaServico('');
  };

  const removerItem = (localId: string) => {
    setItens((prev) => prev.filter((i) => i.localId !== localId));
    if (itemAtivo === localId) setItemAtivo(null);
  };

  const podeAvancar = () => {
    if (step === 0) return Boolean(cliente?.id);
    if (step === 1) return Boolean(origem.canal && origem.responsavel.trim());
    if (step === 2) return itens.length > 0;
    if (step === 3) {
      return itens.every(
        (i) =>
          i.tipoPreco === 'sob_orcamento' ||
          (i.preco != null && i.preco.preco > 0 && !i.preco.requerValidacaoTecnica)
      );
    }
    return true;
  };

  const finalizar = async (modo: 'orcamento' | 'pedido') => {
    if (!cliente) return;
    if (itens.some((i) => i.preco?.requerValidacaoTecnica)) {
      toast('Há serviço com validação técnica pendente', 'error');
      return;
    }
    const sobOrc = itens.some((i) => i.tipoPreco === 'sob_orcamento');
    if (modo === 'pedido' && sobOrc) {
      toast('Serviço sob orçamento: salve como orçamento primeiro', 'error');
      return;
    }
    if (modo === 'pedido' && total <= 0) {
      toast('Total inválido — complete o questionário', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await pedidosApi.novaVenda({
        clienteId: cliente.id,
        canal: origem.canal,
        campanha: origem.campanha || null,
        anuncio: origem.anuncio || null,
        responsavel: origem.responsavel,
        modo,
        leadId: leadId || null,
        descontoValor: descontoNum > 0 ? descontoNum : null,
        motivoAjuste: motivoAjuste || null,
        observacoes: observacoes || null,
        itens: itens.map((i) => ({
          slug: i.slug,
          quantidade: i.quantidade,
          respostas: i.respostas,
        })),
      });
      if (result.tipo === 'orcamento') {
        toast('Orçamento salvo!', 'success');
        navigate('/admin/orcamentos');
      } else {
        toast(`Pedido ${result.pedido?.numero} criado!`, 'success');
        navigate(`/pedidos/${result.pedido?.id}`);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao finalizar venda', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ativo = itens.find((i) => i.localId === itemAtivo) || itens[0];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Nova Venda"
        subtitle="Venda assistida (WhatsApp) — mesmo catálogo, questionário e preço do site"
        action={
          <Link to="/pedidos">
            <Button variant="secondary">Voltar aos pedidos</Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {ETAPAS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => idx < step && setStep(idx)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              idx === step
                ? 'bg-[#0033B5] text-white'
                : idx < step
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        {step === 0 && (
          <div>
            <h3 className="mb-3 font-semibold text-primary-700">Cliente</h3>
            <Input
              label="Telefone / WhatsApp"
              type="tel"
              placeholder="Digite para buscar cliente existente"
              value={telefoneBusca}
              onChange={(e) => setTelefoneBusca(e.target.value)}
            />
            {buscandoTel && <p className="mb-2 text-xs text-slate-500">Buscando...</p>}
            {!!encontrados.length && (
              <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                {encontrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarCliente(c.id)}
                    className="flex w-full justify-between rounded px-2 py-2 text-left text-sm hover:bg-white"
                  >
                    <span>
                      <b>{c.nome}</b>
                      <small className="block text-slate-500">{c.telefone}</small>
                    </span>
                    <span className="text-primary-600">Selecionar</span>
                  </button>
                ))}
              </div>
            )}

            {cliente && !novoCliente && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                <p className="font-semibold text-green-900">{cliente.nome}</p>
                <p className="text-green-800">
                  {cliente.telefone}
                  {cliente.email ? ` · ${cliente.email}` : ''}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-primary-600 underline"
                  onClick={() => {
                    setCliente(null);
                    setNovoCliente(true);
                  }}
                >
                  Trocar / cadastrar outro
                </button>
              </div>
            )}

            {(!cliente || novoCliente) && (
              <div className="mt-4 border-t pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-medium">+ Cadastrar novo cliente</h4>
                  {!novoCliente && (
                    <Button variant="secondary" onClick={() => setNovoCliente(true)}>
                      Abrir cadastro
                    </Button>
                  )}
                </div>
                {novoCliente && (
                  <div className="grid gap-x-3 sm:grid-cols-2">
                    <Select
                      label="Tipo"
                      value={cliForm.tipo}
                      onChange={(e) => setCliForm({ ...cliForm, tipo: e.target.value as 'PF' | 'PJ' })}
                    >
                      <option value="PF">PF</option>
                      <option value="PJ">PJ</option>
                    </Select>
                    <Input
                      label="Nome"
                      value={cliForm.nome}
                      onChange={(e) => setCliForm({ ...cliForm, nome: e.target.value })}
                    />
                    <Input
                      label="WhatsApp"
                      value={cliForm.whatsapp || telefoneBusca}
                      onChange={(e) => setCliForm({ ...cliForm, whatsapp: e.target.value })}
                    />
                    {cliForm.tipo === 'PF' ? (
                      <Input
                        label="CPF (opcional)"
                        value={cliForm.cpf}
                        onChange={(e) => setCliForm({ ...cliForm, cpf: e.target.value })}
                      />
                    ) : (
                      <Input
                        label="CNPJ"
                        value={cliForm.cnpj}
                        onChange={(e) => setCliForm({ ...cliForm, cnpj: e.target.value })}
                      />
                    )}
                    <Input
                      label="E-mail (opcional)"
                      value={cliForm.email}
                      onChange={(e) => setCliForm({ ...cliForm, email: e.target.value })}
                    />
                    <Input
                      label="CEP"
                      value={cliForm.cep}
                      onChange={(e) => setCliForm({ ...cliForm, cep: e.target.value })}
                    />
                    <Input
                      label="Rua"
                      value={cliForm.rua}
                      onChange={(e) => setCliForm({ ...cliForm, rua: e.target.value })}
                    />
                    <Input
                      label="Número"
                      value={cliForm.numero}
                      onChange={(e) => setCliForm({ ...cliForm, numero: e.target.value })}
                    />
                    <Input
                      label="Bairro"
                      value={cliForm.bairro}
                      onChange={(e) => setCliForm({ ...cliForm, bairro: e.target.value })}
                    />
                    <Input
                      label="Cidade"
                      value={cliForm.cidade}
                      onChange={(e) => setCliForm({ ...cliForm, cidade: e.target.value })}
                    />
                    <Input
                      label="UF"
                      value={cliForm.uf}
                      onChange={(e) => setCliForm({ ...cliForm, uf: e.target.value })}
                    />
                    <div className="sm:col-span-2">
                      <Button onClick={cadastrarCliente}>Salvar cliente e continuar</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-x-3 sm:grid-cols-2">
            <h3 className="mb-1 font-semibold text-primary-700 sm:col-span-2">Origem da venda</h3>
            <Select
              label="Canal da venda *"
              value={origem.canal}
              onChange={(e) => setOrigem({ ...origem, canal: e.target.value })}
            >
              {CANAIS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Input
              label="Responsável pela venda"
              value={origem.responsavel}
              onChange={(e) => setOrigem({ ...origem, responsavel: e.target.value })}
            />
            <Input
              label="Campanha (opcional)"
              value={origem.campanha}
              onChange={(e) => setOrigem({ ...origem, campanha: e.target.value })}
            />
            <Input
              label="Anúncio/Criativo (opcional)"
              value={origem.anuncio}
              onChange={(e) => setOrigem({ ...origem, anuncio: e.target.value })}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="mb-3 font-semibold text-primary-700">Serviços do catálogo</h3>
            <Input
              label="Buscar serviço"
              placeholder="Ex.: tomada, chuveiro, ar-condicionado..."
              value={buscaServico}
              onChange={(e) => setBuscaServico(e.target.value)}
            />
            <div className="mb-4 max-h-56 overflow-y-auto rounded-lg border">
              {servicosFiltrados.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => adicionarServico(s)}
                  className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span>
                    <b>{s.nome}</b>
                    <small className="block text-slate-500">
                      {s.categoria} · {s.precoTexto || s.tipoPreco}
                    </small>
                  </span>
                  <span className="text-primary-600">+ Adicionar</span>
                </button>
              ))}
              {!servicosFiltrados.length && <p className="p-3 text-sm text-slate-400">Nenhum serviço encontrado</p>}
            </div>

            <h4 className="mb-2 text-sm font-semibold">No pedido ({itens.length})</h4>
            {itens.map((i) => (
              <div key={i.localId} className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>
                  {i.nome}
                  {i.preco ? ` · ${formatCurrency(i.preco.preco)}` : ''}
                </span>
                <button type="button" className="text-red-600" onClick={() => removerItem(i.localId)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="mb-3 font-semibold text-primary-700">Questionário e preço</h3>
            {!itens.length ? (
              <p className="text-sm text-slate-500">Adicione serviços na etapa anterior.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {itens.map((i) => (
                    <button
                      key={i.localId}
                      type="button"
                      onClick={() => setItemAtivo(i.localId)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        (itemAtivo || itens[0]?.localId) === i.localId
                          ? 'bg-[#0033B5] text-white'
                          : 'bg-slate-100'
                      }`}
                    >
                      {i.nome}
                      {i.preco ? ` · ${formatCurrency(i.preco.preco)}` : ''}
                    </button>
                  ))}
                </div>
                {ativo && ativo.tipoPreco === 'sob_orcamento' ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <b>{ativo.nome}</b> é sob orçamento. Salve como orçamento; o comercial define o preço depois
                    (módulo Orçamentos).
                  </p>
                ) : ativo ? (
                  <QuestionarioServico
                    slug={ativo.slug}
                    nome={ativo.nome}
                    quantidade={ativo.quantidade}
                    imagemCatalogo={ativo.imagemUrl}
                    respostas={ativo.respostas}
                    onResposta={(perguntaId, valor) => {
                      setItens((prev) =>
                        prev.map((i) =>
                          i.localId === ativo.localId
                            ? { ...i, respostas: { ...i.respostas, [perguntaId]: valor } }
                            : i
                        )
                      );
                    }}
                    onPrecoChange={(preco) => {
                      setItens((prev) =>
                        prev.map((i) => (i.localId === ativo.localId ? { ...i, preco } : i))
                      );
                    }}
                    onResetRespostas={() => {
                      setItens((prev) =>
                        prev.map((i) =>
                          i.localId === ativo.localId ? { ...i, respostas: {}, preco: null } : i
                        )
                      );
                    }}
                  />
                ) : (
                  <Loading />
                )}
                <p className="mt-4 text-right text-lg font-bold text-primary-800">
                  Subtotal estimado: {formatCurrency(subtotal)}
                </p>
                <p className="text-right text-xs text-slate-500">
                  Valor calculado automaticamente — sem digitação manual do preço principal
                </p>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-primary-700">Resumo da venda</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Cliente</p>
                <p className="font-medium">{cliente?.nome}</p>
                <p>{cliente?.telefone}</p>
                <p className="text-slate-600">
                  {cliente?.endereco &&
                    [cliente.endereco.rua, cliente.endereco.numero, cliente.endereco.bairro, cliente.endereco.cidade]
                      .filter(Boolean)
                      .join(', ')}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Origem</p>
                <p className="font-medium capitalize">{origem.canal.replace('_', ' ')}</p>
                {origem.campanha && <p>Campanha: {origem.campanha}</p>}
                {origem.anuncio && <p>Anúncio: {origem.anuncio}</p>}
                <p>Resp.: {origem.responsavel}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase text-slate-500">Serviços</p>
              {itens.map((i) => (
                <div key={i.localId} className="mb-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>{i.nome}</span>
                    <span>{i.preco ? formatCurrency(i.preco.preco) : 'Sob orçamento'}</span>
                  </div>
                  {i.preco?.breakdown?.map((b) => (
                    <p key={b.label} className="text-xs text-slate-500">
                      {b.label}: {formatCurrency(b.valor)}
                    </p>
                  ))}
                  {Object.keys(i.respostas).length > 0 && (
                    <details className="mt-1 text-xs text-slate-600">
                      <summary>Respostas do questionário</summary>
                      <ul className="mt-1 list-inside list-disc">
                        {Object.entries(i.respostas).map(([k, v]) => (
                          <li key={k}>
                            {k}: {v}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
              Estrutura preparada para custos reais por venda (material, prestador, taxas, impostos e margem
              de contribuição). Preenchimento automático virá do Financeiro/Estoque — não usa o “Lucro %”
              global do catálogo.
            </div>

            {isAdmin && (
              <div className="grid gap-x-3 sm:grid-cols-2">
                <Input
                  label="Desconto manual (R$) — admin"
                  type="number"
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                />
                <Input
                  label="Motivo do ajuste (auditoria)"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                />
              </div>
            )}
            <Input
              label="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <div className="rounded-xl bg-[#0033B5] p-4 text-white">
              <div className="flex justify-between text-sm opacity-90">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {descontoNum > 0 && (
                <div className="flex justify-between text-sm opacity-90">
                  <span>Desconto</span>
                  <span>-{formatCurrency(descontoNum)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between text-xl font-bold">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={saving} onClick={() => finalizar('orcamento')}>
                Salvar como orçamento
              </Button>
              <Button disabled={saving} onClick={() => finalizar('pedido')}>
                Criar pedido / Fechar venda
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Voltar
        </Button>
        {step < ETAPAS.length - 1 && (
          <Button
            disabled={!podeAvancar()}
            onClick={() => {
              if (!podeAvancar()) {
                toast('Complete os dados desta etapa', 'error');
                return;
              }
              setStep((s) => Math.min(ETAPAS.length - 1, s + 1));
            }}
          >
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
}
