import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cpf } from 'cpf-cnpj-validator';
import { solicitacaoApi } from '../../services/modules.service';
import { authService } from '../../services/auth.service';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Button, ScarcityBadge, Modal, Input } from '../../components/ui';
import { CheckoutStepper } from '../../components/loja/store-ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { relatedForCart, type CategoriaLoja } from '../../storefront/catalog';
import { normalizeSearch } from '../../storefront/search';
import { useToast } from '../../components/Toast';
import { gtmConversaoCompra, gtmEtapaAgendar, funil, gtmPush } from '../../utils/gtm';
import { isClienteRole } from '../../utils/auth-routes';
import { normalizeUser } from '../../utils/normalize-user';
import {
  calcularParcelamento,
  PARCELAS_SEM_JUROS,
  TAXA_JUROS_MES_PERCENT_DEFAULT,
} from '../../utils/parcelamento';

type Step = 'catalogo' | 'carrinho' | 'dados' | 'pagamento' | 'aguardando' | 'horario' | 'concluido';

interface ServicoCatalogo {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  precoMinimo: number | null;
  precoTexto: string | null;
  tipoPreco: string;
  descricao: string | null;
  garantiaDias: number;
  imagemUrl: string | null;
  pontos: number;
}

interface CategoriaCatalogo {
  slug: string;
  nome: string;
  icone: string;
  cor: string;
  servicos: ServicoCatalogo[];
}

const CORES_CATEGORIA: Record<string, string> = {
  eletricista: 'from-blue-600 to-blue-800',
  hidraulica: 'from-sky-500 to-sky-700',
  montador: 'from-indigo-500 to-indigo-700',
  'ar-condicionado': 'from-cyan-500 to-cyan-700',
};

function ServicoCardMedia({ servico, icone }: { servico: ServicoCatalogo; icone: string }) {
  const [imgOk, setImgOk] = useState(true);
  const gradient = CORES_CATEGORIA[servico.categoria] || 'from-primary-500 to-primary-700';

  if (servico.imagemUrl && imgOk) {
    return (
      <img
        src={servico.imagemUrl}
        alt=""
        className="h-32 w-full object-cover object-center"
        loading="lazy"
        decoding="async"
        onError={() => setImgOk(false)}
      />
    );
  }

  return (
    <div className={`flex h-32 items-center justify-center bg-gradient-to-br text-5xl ${gradient}`}>
      {icone || '🔧'}
    </div>
  );
}

function PagamentoArea({
  metodo,
  pixCode,
  pixQrImage,
  invoiceUrl,
}: {
  metodo: 'PIX' | 'CARTAO' | null;
  pixCode?: string;
  pixQrImage?: string;
  invoiceUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!pixCode && !invoiceUrl) return null;

  const isPix = metodo === 'PIX' || Boolean(pixCode);
  const titulo = isPix ? 'Pagamento PIX' : 'Pagamento no cartão de crédito';
  const qrSrc =
    pixQrImage ||
    (pixCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}`
      : null);

  const copiarPix = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      gtmPush('agendar_pix_copiado');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: textarea já permite seleção manual */
    }
  };

  return (
    <div className={`mb-4 rounded-xl border-2 p-4 ${isPix ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      <p className={`mb-2 text-sm font-semibold ${isPix ? 'text-green-800' : 'text-blue-900'}`}>{titulo}</p>
      {isPix && qrSrc && (
        <>
          <div className="mb-3 flex justify-center">
            <img
              src={qrSrc}
              alt="QR Code PIX"
              className="h-[220px] w-[220px] rounded-lg border bg-white p-2"
            />
          </div>
          <p className="mb-1 text-xs font-medium text-green-800">
            Escaneie o QR Code ou copie o código abaixo:
          </p>
        </>
      )}
      {isPix && pixCode && (
        <>
          <textarea
            readOnly
            value={pixCode}
            className="w-full rounded border p-2 text-xs"
            rows={3}
            onFocus={() => gtmPush('agendar_pix_copia_cola_focado')}
          />
          <button
            type="button"
            onClick={() => void copiarPix()}
            className="mt-2 w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800"
          >
            {copied ? 'Código copiado!' : 'Copiar código PIX'}
          </button>
        </>
      )}
      {!isPix && invoiceUrl && (
        <div className="rounded-lg border border-blue-200 bg-white p-6 text-center">
          <p className="mb-1 text-sm font-semibold text-blue-900">Checkout seguro Asaas</p>
          <p className="mb-4 text-sm text-slate-600">
            Por segurança, o pagamento com cartão abre em uma nova aba. Clique no botão abaixo
            para informar os dados do cartão.
          </p>
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-lg bg-[#002d62] px-6 py-3 text-sm font-bold text-white hover:bg-[#003a7a]"
            onClick={() => gtmPush('agendar_pagamento_link_externo', { url: invoiceUrl })}
          >
            Abrir checkout seguro
          </a>
        </div>
      )}
      {isPix && invoiceUrl && !pixCode && (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-center text-sm text-primary-600 underline"
        >
          Ver código de pagamento
        </a>
      )}
    </div>
  );
}

export function AgendarServicoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const cart = useCartStore();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logadoCliente = Boolean(user && isClienteRole(user.role));
  const [step, setStep] = useState<Step>(() => (cart.count() > 0 ? 'carrinho' : 'catalogo'));
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const relatedCheckout = relatedForCart(
    categorias as unknown as CategoriaLoja[],
    cart.items.map((i) => i.slug),
    4
  );
  const [catAtiva, setCatAtiva] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [preco, setPreco] = useState(0);
  const [express] = useState(false);
  const [slots, setSlots] = useState<Array<{ data: string; horarioInicio: string; horarioFim: string; label: string; escassez: string }>>([]);
  const [proxima, setProxima] = useState<string | null>(null);
  const [slotSel, setSlotSel] = useState<{ data: string; horarioInicio: string; horarioFim: string } | null>(null);
  const [pagamento, setPagamento] = useState<{ id?: string; invoiceUrl?: string; pixCode?: string; pixQrImage?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);
  const [orcamentoModal, setOrcamentoModal] = useState<ServicoCatalogo | null>(null);
  const [orcamentoDesc, setOrcamentoDesc] = useState('');
  const [descontoPixPercent, setDescontoPixPercent] = useState(5);
  const [valorDescontoAplicado, setValorDescontoAplicado] = useState(0);
  const [pctDescontoAplicado, setPctDescontoAplicado] = useState(0);
  const [metodoPagamento, setMetodoPagamento] = useState<'PIX' | 'CARTAO' | null>(null);
  const [parcelas, setParcelas] = useState(1);
  const [parcelasSemJuros, setParcelasSemJuros] = useState(PARCELAS_SEM_JUROS);
  const [taxaJurosMes, setTaxaJurosMes] = useState(TAXA_JUROS_MES_PERCENT_DEFAULT);
  const [guestForm, setGuestForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    complemento: '',
    consentimentoLgpd: false,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retomouAgendamento = useRef(false);
  const assistenteImportado = useRef(false);
  const checkoutIniciado = useRef(false);

  useEffect(() => {
    Promise.all([
      solicitacaoApi.catalogo(),
      solicitacaoApi.config(),
      solicitacaoApi.descontoPrimeiroServico().catch(() => ({ elegivel: false, percentual: 10 })),
    ])
      .then(([data, config, desc]) => {
        setCategorias(data.categorias || []);
        if (data.categorias?.[0]) setCatAtiva(data.categorias[0].slug);
        if (config.parcelamento) {
          setParcelasSemJuros(config.parcelamento.parcelasSemJuros);
          setTaxaJurosMes(config.parcelamento.taxaJurosMesPercent);
        }
        if (Number(desc.percentual) > 0) setDescontoPixPercent(Number(desc.percentual));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const slug = searchParams.get('slug');
    if (!slug || loading || categorias.length === 0) return;
    const servico = categorias.flatMap((c) => c.servicos).find((s) => s.slug === slug);
    if (!servico) return;
    if (!cart.items.some((i) => i.slug === slug)) {
      cart.add({
        slug: servico.slug,
        nome: servico.nome,
        categoria: servico.categoria,
        precoMinimo: servico.precoMinimo,
        precoTexto: servico.precoTexto || '',
        tipoPreco: servico.tipoPreco,
        imagemUrl: servico.imagemUrl,
      });
    }
    setStep('carrinho');
  }, [loading, categorias, searchParams, cart]);

  // Retomar agendamento de pedido já pago (ex.: veio de Meus Pedidos)
  useEffect(() => {
    const solId = searchParams.get('agendar');
    if (!solId || retomouAgendamento.current || loading) return;
    retomouAgendamento.current = true;
    (async () => {
      try {
        const status = await solicitacaoApi.status(solId);
        if (status.agendamento) {
          toast('Este pedido já possui agendamento.', 'success');
          navigate('/cliente/agendamentos');
          return;
        }
        if (!status.podeAgendar) {
          toast('Pagamento ainda não confirmado para este pedido.', 'error');
          return;
        }
        setSolicitacaoId(solId);
        setStep('horario');
        setSearchParams({}, { replace: true });
        toast('Escolha o dia e horário do atendimento.', 'success');
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Não foi possível abrir o agendamento', 'error');
      }
    })();
  }, [searchParams, loading, navigate, setSearchParams, toast]);

  // Importar serviço do Consultor ABS (preço fixo — sem questionário)
  useEffect(() => {
    if (loading || assistenteImportado.current) return;
    if (searchParams.get('assistente') !== '1') return;
    const raw = sessionStorage.getItem('abs-guided-selling');
    if (!raw) return;
    assistenteImportado.current = true;
    try {
      const data = JSON.parse(raw) as {
        slug: string;
        nome: string;
        categoria: string;
        precoMinimo: number | null;
        precoTexto: string;
        tipoPreco: string;
        imagemUrl?: string | null;
      };
      sessionStorage.removeItem('abs-guided-selling');
      if (!cart.items.some((i) => i.slug === data.slug)) {
        cart.add({
          slug: data.slug,
          nome: data.nome,
          categoria: data.categoria,
          precoMinimo: data.precoMinimo,
          precoTexto: data.precoTexto,
          tipoPreco: data.tipoPreco,
          imagemUrl: data.imagemUrl,
        });
      }
      setStep('carrinho');
      setSearchParams({}, { replace: true });
      toast('Serviço do consultor adicionado ao carrinho.', 'success');
    } catch {
      sessionStorage.removeItem('abs-guided-selling');
    }
  }, [loading, searchParams, setSearchParams, toast, cart]);

  useEffect(() => {
    if (loading || checkoutIniciado.current || cart.count() === 0) return;
    checkoutIniciado.current = true;
    const total = cart.items.reduce((sum, i) => sum + (Number(i.precoMinimo) || 0) * i.quantidade, 0);
    funil.iniciouCheckout({
      origem: 'agendar',
      qtd_itens: cart.count(),
      valor: total,
    });
  }, [loading, cart]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    gtmEtapaAgendar(step, {
      solicitacao_id: solicitacaoId || undefined,
      itens_carrinho: cart.count(),
    });
  }, [step, loading]);

  useEffect(() => {
    if (step !== 'horario' || !solicitacaoId) return;
    solicitacaoApi.horarios(solicitacaoId).then((h) => {
      setSlots(h.slots);
      setProxima(h.proximaDisponibilidade);
    });
  }, [step, solicitacaoId]);

  const servicosFiltrados = useMemo(() => {
    const lista =
      catAtiva === 'all'
        ? categorias.flatMap((c) => c.servicos)
        : categorias.find((c) => c.slug === catAtiva)?.servicos || [];
    if (!busca.trim()) return lista;
    const q = normalizeSearch(busca);
    return lista.filter((s) => {
      const hay = normalizeSearch([s.nome, s.slug, s.descricao || '', s.categoria].join(' '));
      return hay.includes(q) || hay.split(' ').some((w) => w.startsWith(q));
    });
  }, [categorias, catAtiva, busca]);

  const iniciarPolling = (solId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setAguardandoPagamento(true);

    const verificar = async () => {
      try {
        const status = await solicitacaoApi.status(solId);
        if (status.pagamento) {
          setPagamento((prev) => ({
            ...prev,
            id: status.pagamento!.id,
            invoiceUrl: status.pagamento!.invoiceUrl,
            pixCode: status.pagamento!.pixCode,
            pixQrImage: status.pagamento!.pixQrImage ?? prev?.pixQrImage,
          }));
        }
        if (status.podeAgendar) {
          if (pollRef.current) clearInterval(pollRef.current);
          setAguardandoPagamento(false);
          cart.clear();
          if (status.pedidoNumero) {
            gtmConversaoCompra({
              transaction_id: status.pedidoNumero,
              value: Number(status.pagamento?.valor ?? preco),
              solicitacao_id: solId,
              pedido_id: status.pedidoId,
              metodo: status.pagamento?.metodo || metodoPagamento || undefined,
            });
          }
          toast('Pagamento confirmado! Escolha o horário de atendimento.', 'success');
          setStep('horario');
        }
      } catch {
        /* retry on next interval */
      }
    };

    verificar();
    pollRef.current = setInterval(verificar, 2000);
  };

  const irCarrinho = () => {
    if (!cart.count()) {
      toast('Adicione serviços ao carrinho', 'error');
      return;
    }
    setStep('carrinho');
  };

  const irPagamento = () => {
    if (!cart.count()) {
      toast('Adicione serviços ou peças ao carrinho', 'error');
      return;
    }
    if (!logadoCliente) {
      setStep('dados');
      return;
    }
    void confirmarPedido();
  };

  const enviarDadosConvidado = async (e: FormEvent) => {
    e.preventDefault();
    if (!cpf.isValid(guestForm.cpf.replace(/\D/g, ''))) {
      toast('CPF inválido', 'error');
      return;
    }
    if (!guestForm.consentimentoLgpd) {
      toast('Aceite os termos LGPD para continuar', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const ref = searchParams.get('ref')?.trim() || sessionStorage.getItem('abs-ref') || '';
      const result = await authService.checkoutConvidado({
        nome: guestForm.nome,
        cpf: guestForm.cpf,
        email: guestForm.email,
        telefone: guestForm.telefone,
        consentimentoLgpd: true,
        ...(ref ? { ref } : {}),
        endereco: {
          rua: guestForm.rua,
          numero: guestForm.numero,
          bairro: guestForm.bairro,
          cidade: guestForm.cidade,
          uf: guestForm.uf,
          cep: guestForm.cep,
          complemento: guestForm.complemento,
        },
      });
      const authUser = normalizeUser(result.user);
      if (!authUser || !isClienteRole(authUser.role)) {
        throw new Error('Não foi possível iniciar o checkout. Tente novamente.');
      }
      setAuth(authUser, result.accessToken);
      gtmPush('agendar_checkout_convidado', { email: guestForm.email });
      setSubmitting(false);
      await confirmarPedido();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao continuar', 'error');
      setSubmitting(false);
    }
  };

  const descontoPixEstimado =
    metodoPagamento === 'PIX'
      ? Math.round(preco * (descontoPixPercent / 100) * 100) / 100
      : 0;
  const totalComPix =
    metodoPagamento === 'PIX' ? Math.max(0, preco - descontoPixEstimado) : preco;

  const confirmarPedido = async () => {
    setSubmitting(true);
    try {
      const itens = cart.items.map((i) => ({
        slug: i.slug,
        quantidade: i.quantidade,
      }));
      const sol = await solicitacaoApi.criarCarrinho({
        itens,
        express,
      });

      setSolicitacaoId(sol.id);
      setPreco(Number(sol.precoFinal));
      setValorDescontoAplicado(Number(sol.opcoes?.valorDesconto || 0));
      setPctDescontoAplicado(Number(sol.opcoes?.descontoPix || sol.opcoes?.descontoPrimeiroServico || 0));
      gtmPush('agendar_pedido_criado', {
        solicitacao_id: sol.id,
        valor: Number(sol.precoFinal),
        qtd_itens: cart.items.length,
        desconto_pix: Number(sol.opcoes?.valorDesconto || 0),
      });
      setStep('pagamento');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar pedido', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const opcoesParcelas = useMemo(() => {
    const max = preco >= 100 ? 12 : preco >= 50 ? 6 : 3;
    return Array.from({ length: max }, (_, i) => i + 1).map((n) =>
      calcularParcelamento(preco, n, {
        parcelasSemJuros,
        taxaJurosMesPercent: taxaJurosMes,
      })
    );
  }, [preco, parcelasSemJuros, taxaJurosMes]);

  const parcelaSelecionada = useMemo(
    () =>
      calcularParcelamento(preco, parcelas, {
        parcelasSemJuros,
        taxaJurosMesPercent: taxaJurosMes,
      }),
    [preco, parcelas, parcelasSemJuros, taxaJurosMes]
  );

  const pagar = async (metodo: string) => {
    setSubmitting(true);
    try {
      const installmentCount = metodo === 'CARTAO' ? parcelas : undefined;
      gtmPush('agendar_pagamento_iniciado', {
        solicitacao_id: solicitacaoId,
        metodo,
        valor: preco,
        parcelas: installmentCount || 1,
      });
      funil.iniciouPagamento({
        solicitacao_id: solicitacaoId,
        metodo,
        valor: metodo === 'PIX' ? totalComPix : preco,
        parcelas: installmentCount || 1,
      });
      const res = (await solicitacaoApi.pagar(solicitacaoId, metodo, installmentCount)) as {
        pagamento: { id?: string; invoiceUrl?: string; pixCode?: string; pixQrImage?: string };
        solicitacao?: { precoFinal?: number; opcoes?: { valorDesconto?: number; descontoPix?: number } };
      };
      setPagamento(res.pagamento);
      if (res.solicitacao?.precoFinal != null) setPreco(Number(res.solicitacao.precoFinal));
      if (res.solicitacao?.opcoes?.valorDesconto != null) {
        setValorDescontoAplicado(Number(res.solicitacao.opcoes.valorDesconto));
      }
      if (res.solicitacao?.opcoes?.descontoPix != null) {
        setPctDescontoAplicado(Number(res.solicitacao.opcoes.descontoPix));
      }
      cart.clear();
      gtmPush(metodo === 'PIX' ? 'agendar_pagamento_pix_gerado' : 'agendar_pagamento_cartao_gerado', {
        solicitacao_id: solicitacaoId,
        metodo,
        valor: Number(res.solicitacao?.precoFinal ?? preco),
        parcelas: installmentCount || 1,
        tem_invoice: Boolean(res.pagamento?.invoiceUrl),
        tem_pix: Boolean(res.pagamento?.pixCode),
      });
      setStep('aguardando');
      iniciarPolling(solicitacaoId);
      toast(
        metodo === 'PIX'
          ? 'PIX gerado! Escaneie o QR Code ou copie o código abaixo.'
          : 'Clique em "Abrir checkout seguro" para pagar com cartão.',
        'success'
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro no pagamento', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmarHorario = async () => {
    if (!slotSel) return;
    setSubmitting(true);
    try {
      await solicitacaoApi.agendar(solicitacaoId, slotSel);
      if (pollRef.current) clearInterval(pollRef.current);
      gtmPush('agendar_horario_confirmado', {
        solicitacao_id: solicitacaoId,
        data: slotSel.data,
        horario_inicio: slotSel.horarioInicio,
        horario_fim: slotSel.horarioFim,
      });
      setStep('concluido');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao agendar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const enviarOrcamento = async () => {
    if (!orcamentoModal || !orcamentoDesc.trim()) {
      toast('Descreva o que você precisa', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await solicitacaoApi.solicitarOrcamento({ slug: orcamentoModal.slug, descricao: orcamentoDesc });
      toast('Orçamento solicitado! Entraremos em contato.', 'success');
      setOrcamentoModal(null);
      setOrcamentoDesc('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao solicitar orçamento', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  const checkoutStep: 1 | 2 | 3 | 4 =
    step === 'catalogo'
      ? 1
      : step === 'carrinho' || step === 'dados'
        ? 2
        : step === 'pagamento' || step === 'aguardando'
          ? 3
          : 4;

  return (
    <div>
      <PageHeader
        title="Finalize seu serviço"
        subtitle="Preço visível, pagamento seguro e horário na hora"
      />
      <CheckoutStepper current={checkoutStep} />

      {step === 'catalogo' && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              placeholder="Buscar serviço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full max-w-md rounded-lg border border-abs-gray px-4 py-2 text-sm sm:flex-1"
            />
            <Button variant="cta" onClick={irCarrinho} className="relative shrink-0">
              Carrinho ({cart.count()}) — {formatCurrency(cart.total())}
            </Button>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCatAtiva('all')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                catAtiva === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-abs-gray'
              }`}
            >
              Todos
            </button>
            {categorias.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCatAtiva(c.slug)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  catAtiva === c.slug ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-abs-gray'
                }`}
              >
                {c.icone} {c.nome}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {servicosFiltrados.map((s) => (
              <Card key={s.id} className="flex flex-col overflow-hidden p-0 transition hover:shadow-lg">
                <ServicoCardMedia
                  servico={s}
                  icone={categorias.find((c) => c.slug === s.categoria)?.icone || '🔧'}
                />
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">
                    {categorias.find((c) => c.slug === s.categoria)?.nome}
                  </p>
                  <h3 className="mt-1 font-bold text-primary-900">{s.nome}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-xs text-slate-500">{s.descricao}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-lg font-bold text-primary-700">{s.precoTexto || 'Consulte'}</p>
                      {s.garantiaDias > 0 && (
                        <p className="text-[10px] text-slate-400">Garantia {s.garantiaDias} dias</p>
                      )}
                    </div>
                    {s.tipoPreco === 'sob_orcamento' ? (
                      <Button
                        variant="cta"
                        className="w-full shrink-0 text-sm sm:w-auto"
                        onClick={() => { setOrcamentoModal(s); setOrcamentoDesc(''); }}
                      >
                        Solicitar orçamento
                      </Button>
                    ) : (
                      <Button
                        variant="cta"
                        className="w-full shrink-0 text-sm sm:w-auto"
                        onClick={() => {
                          cart.add({
                            slug: s.slug,
                            nome: s.nome,
                            categoria: s.categoria,
                            precoMinimo: s.precoMinimo ? Number(s.precoMinimo) : 0,
                            precoTexto: s.precoTexto || '',
                            tipoPreco: s.tipoPreco,
                            imagemUrl: s.imagemUrl,
                          });
                          gtmPush('agendar_servico_adicionado_carrinho', {
                            servico_slug: s.slug,
                            servico_nome: s.nome,
                            categoria: s.categoria,
                            valor: s.precoMinimo ? Number(s.precoMinimo) : 0,
                          });
                          toast(`${s.nome} adicionado`, 'success');
                        }}
                      >
                        + Carrinho
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 'carrinho' && (
        <>
        <Card>
          <h3 className="mb-4 text-lg font-bold text-primary-800">Seu carrinho</h3>
          {cart.items.length === 0 ? (
            <p className="text-slate-500">Carrinho vazio.</p>
          ) : (
            <ul className="divide-y divide-abs-gray">
              {cart.items.map((item) => (
                <li key={item.slug} className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <img
                    src={item.imagemUrl || '/favicon.svg'}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary-800">{item.nome}</p>
                    <p className="text-sm text-slate-500">{item.precoTexto}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:contents">
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-8 w-8 rounded border" onClick={() => cart.setQty(item.slug, item.quantidade - 1)}>−</button>
                    <span className="w-6 text-center">{item.quantidade}</span>
                    <button type="button" className="h-8 w-8 rounded border" onClick={() => cart.setQty(item.slug, item.quantidade + 1)}>+</button>
                  </div>
                  <p className="font-bold text-primary-700 sm:ml-auto sm:w-24 sm:text-right">
                    {formatCurrency((item.precoMinimo || 0) * item.quantidade)}
                  </p>
                  <button type="button" className="text-sm text-red-500 sm:order-last" onClick={() => cart.remove(item.slug)}>Remover</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
            <p className="text-xl font-bold text-primary-800">
              Total: {formatCurrency(cart.total())}
            </p>
            <p className="text-xs text-slate-500">Preço fixo · pagamento na próxima etapa</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setStep('catalogo')}>Continuar comprando</Button>
              <Button variant="cta" onClick={irPagamento} disabled={!cart.count() || submitting}>
                {submitting ? 'Preparando pagamento...' : 'Comprar e agendar'}
              </Button>
            </div>
          </div>
        </Card>
          <RelatedRail
            title="Aproveite a mesma visita"
            subtitle="Quem leva este serviço também adiciona estes. Um clique e entra no pedido."
            servicos={relatedCheckout}
          />
        </>
      )}

      {step === 'dados' && (
        <Card>
          <h3 className="mb-1 text-lg font-bold text-primary-800">Seus dados para o atendimento</h3>
          <p className="mb-4 text-sm text-slate-600">
            Não é obrigatório criar conta. Informe só o necessário para agendar e pagar.
            Os dados do cartão são pedidos na etapa de pagamento.
          </p>
          <p className="mb-4 text-sm text-slate-500">
            Já tem conta?{' '}
            <Link
              to={`/login?next=${encodeURIComponent('/agendar')}`}
              className="font-semibold text-primary-700 underline"
            >
              Entrar
            </Link>
          </p>
          <form onSubmit={enviarDadosConvidado} className="space-y-1">
            <Input
              label="Nome completo"
              value={guestForm.nome}
              onChange={(e) => setGuestForm({ ...guestForm, nome: e.target.value })}
              required
            />
            <Input
              label="CPF"
              value={guestForm.cpf}
              onChange={(e) => setGuestForm({ ...guestForm, cpf: e.target.value })}
              required
            />
            <p className="-mt-2 mb-3 text-xs text-slate-500">Necessário para pagamento e nota fiscal.</p>
            <Input
              label="E-mail"
              type="email"
              value={guestForm.email}
              onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
              required
            />
            <Input
              label="Telefone / WhatsApp"
              value={guestForm.telefone}
              onChange={(e) => setGuestForm({ ...guestForm, telefone: e.target.value })}
              required
            />
            <p className="mb-2 mt-3 text-sm font-medium text-primary-700">Endereço de atendimento</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label="CEP"
                value={guestForm.cep}
                onChange={(e) => setGuestForm({ ...guestForm, cep: e.target.value })}
                required
              />
              <Input
                label="UF"
                value={guestForm.uf}
                onChange={(e) => setGuestForm({ ...guestForm, uf: e.target.value.toUpperCase().slice(0, 2) })}
                required
              />
            </div>
            <Input
              label="Rua"
              value={guestForm.rua}
              onChange={(e) => setGuestForm({ ...guestForm, rua: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label="Número"
                value={guestForm.numero}
                onChange={(e) => setGuestForm({ ...guestForm, numero: e.target.value })}
                required
              />
              <Input
                label="Complemento"
                value={guestForm.complemento}
                onChange={(e) => setGuestForm({ ...guestForm, complemento: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label="Bairro"
                value={guestForm.bairro}
                onChange={(e) => setGuestForm({ ...guestForm, bairro: e.target.value })}
                required
              />
              <Input
                label="Cidade"
                value={guestForm.cidade}
                onChange={(e) => setGuestForm({ ...guestForm, cidade: e.target.value })}
                required
              />
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={guestForm.consentimentoLgpd}
                onChange={(e) => setGuestForm({ ...guestForm, consentimentoLgpd: e.target.checked })}
              />
              <span>Li e aceito o tratamento dos meus dados conforme a LGPD para realização do serviço.</span>
            </label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button type="button" onClick={() => setStep('carrinho')}>
                Voltar ao carrinho
              </Button>
              <Button type="submit" variant="cta" disabled={submitting}>
                {submitting ? 'Continuando...' : 'Continuar para pagamento'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'pagamento' && (
        <Card>
          <h3 className="mb-2 text-lg font-bold text-primary-800">Pagamento</h3>
          <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {cart.items.map((item) => (
              <li key={item.slug} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium text-primary-800">{item.nome}</span>
                <span className="font-bold">
                  {formatCurrency((item.precoMinimo || 0) * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          {metodoPagamento === 'PIX' && descontoPixEstimado > 0 && (
            <p className="mb-2 text-sm text-emerald-700">
              Desconto PIX ({descontoPixPercent}%): −{formatCurrency(descontoPixEstimado)}
            </p>
          )}
          {valorDescontoAplicado > 0 && metodoPagamento !== 'PIX' && (
            <p className="mb-2 text-sm text-emerald-700">
              Desconto PIX ({pctDescontoAplicado}%): −{formatCurrency(valorDescontoAplicado)}
            </p>
          )}
          <p className="mb-1 text-2xl font-bold text-primary-700">{formatCurrency(totalComPix)}</p>
          {metodoPagamento === 'PIX' && descontoPixEstimado > 0 && (
            <p className="mb-4 text-xs text-slate-500">De {formatCurrency(preco)} por {formatCurrency(totalComPix)} no PIX</p>
          )}
          {metodoPagamento !== 'PIX' && <div className="mb-4" />}

          <p className="mb-2 text-sm font-medium text-primary-800">Forma de pagamento</p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setMetodoPagamento('PIX');
                setParcelas(1);
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                metodoPagamento === 'PIX'
                  ? 'border-primary-600 bg-primary-50 text-primary-800'
                  : 'border-abs-gray bg-white text-slate-700'
              }`}
            >
              PIX
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setMetodoPagamento('CARTAO')}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                metodoPagamento === 'CARTAO'
                  ? 'border-primary-600 bg-primary-50 text-primary-800'
                  : 'border-abs-gray bg-white text-slate-700'
              }`}
            >
              Cartão de crédito
            </button>
          </div>

          {metodoPagamento === 'CARTAO' && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="mb-2 block text-sm font-medium text-primary-800">Parcelamento</label>
              <p className="mb-2 text-xs text-emerald-700">
                Até {parcelasSemJuros}x sem juros. A partir de {parcelasSemJuros + 1}x há acréscimo de{' '}
                {taxaJurosMes.toLocaleString('pt-BR')}% a.m.
              </p>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="w-full rounded-lg border border-abs-gray bg-white px-3 py-2 text-sm"
              >
                {opcoesParcelas.map((op) => (
                  <option key={op.parcelas} value={op.parcelas}>
                    {op.parcelas === 1
                      ? `1x de ${formatCurrency(op.valorParcela)} (à vista)`
                      : op.semJuros
                        ? `${op.parcelas}x de ${formatCurrency(op.valorParcela)} sem juros`
                        : `${op.parcelas}x de ${formatCurrency(op.valorParcela)} (total ${formatCurrency(op.total)} c/ juros)`}
                  </option>
                ))}
              </select>
              {!parcelaSelecionada.semJuros && (
                <p className="mt-2 text-xs text-amber-800">
                  Total com juros: {formatCurrency(parcelaSelecionada.total)} (+{' '}
                  {formatCurrency(parcelaSelecionada.valorJuros)})
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                O cartão é preenchido nesta mesma página, no checkout seguro do Asaas.
              </p>
            </div>
          )}

          {metodoPagamento === 'PIX' && (
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Pagando com PIX você ganha {descontoPixPercent}% de desconto automático.
            </p>
          )}

          <Button
            variant="cta"
            disabled={submitting || !metodoPagamento}
            onClick={() => metodoPagamento && pagar(metodoPagamento)}
          >
            {submitting
              ? 'Gerando pagamento...'
              : metodoPagamento === 'CARTAO'
                ? parcelaSelecionada.semJuros
                  ? `Pagar em ${parcelas}x — abrir checkout`
                  : `Pagar em ${parcelas}x (${formatCurrency(parcelaSelecionada.total)})`
                : metodoPagamento === 'PIX'
                  ? `Gerar PIX com ${descontoPixPercent}% off`
                  : 'Escolha a forma de pagamento'}
          </Button>
        </Card>
      )}

      {step === 'aguardando' && (
        <Card>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-700">Pedido solicitado</p>
          <h3 className="mt-1 text-xl font-bold text-primary-800">Recebemos o seu pedido</h3>
          <p className="mt-2 text-sm text-slate-600">
            Enviamos um e-mail confirmando a solicitação. Quando o Asaas confirmar o pagamento, você recebe
            outro e-mail de pagamento confirmado.
          </p>
          <PagamentoArea
            metodo={metodoPagamento}
            pixCode={pagamento?.pixCode}
            pixQrImage={pagamento?.pixQrImage}
            invoiceUrl={pagamento?.invoiceUrl}
          />
          {aguardandoPagamento && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              Aguardando confirmação do pagamento...
            </div>
          )}
        </Card>
      )}

      {step === 'horario' && (
        <Card>
          <h3 className="mb-2 font-bold text-primary-800">Escolha o horário de atendimento</h3>
          <p className="mb-4 text-sm text-green-600">✓ Pagamento confirmado</p>
          {slots.length === 0 ? (
            <p className="text-slate-500">Próxima disponibilidade: {proxima || 'Em breve'}</p>
          ) : (
            <div className="space-y-2">
              {slots.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSlotSel({ data: s.data, horarioInicio: s.horarioInicio, horarioFim: s.horarioFim });
                    funil.selecionouHorario({
                      solicitacao_id: solicitacaoId,
                      data: s.data,
                      horario_inicio: s.horarioInicio,
                    });
                    gtmPush('agendar_horario_selecionado', {
                      solicitacao_id: solicitacaoId,
                      data: s.data,
                      horario_inicio: s.horarioInicio,
                      label: s.label,
                    });
                  }}
                  className={`flex w-full flex-col items-start gap-2 rounded-lg border p-3 text-left sm:flex-row sm:items-center sm:justify-between ${
                    slotSel?.data === s.data && slotSel?.horarioInicio === s.horarioInicio
                      ? 'border-primary-600 bg-primary-50' : 'border-abs-gray'
                  }`}
                >
                  <span>{s.label}</span>
                  <ScarcityBadge nivel={s.escassez as 'disponivel' | 'poucos' | 'ultimo'} />
                </button>
              ))}
            </div>
          )}
          <Button variant="cta" className="mt-4" disabled={!slotSel || submitting} onClick={confirmarHorario}>
            Confirmar agendamento
          </Button>
        </Card>
      )}

      {step === 'concluido' && (
        <Card className="text-center">
          <p className="text-4xl">✅</p>
          <h3 className="mt-3 text-xl font-bold text-primary-800">Pedido confirmado!</h3>
          <p className="mt-2 text-slate-600">Pagamento registrado e técnico agendado. Acompanhe em Meus Pedidos.</p>
          <Button className="mt-4" onClick={() => navigate('/conta/servicos')}>Ver meus pedidos</Button>
          <RelatedRail
            title="Quer resolver mais alguma coisa?"
            subtitle="Agende outro serviço da mesma categoria para a próxima visita."
            servicos={relatedCheckout}
            cta="Quero este também"
          />
        </Card>
      )}

      {step === 'catalogo' && cart.count() > 0 && (
        <div className="fixed bottom-[4.75rem] left-4 right-4 z-30 md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2">
          <Button variant="cta" className="w-full shadow-xl md:w-auto" onClick={irCarrinho}>
            Ver carrinho ({cart.count()}) — {formatCurrency(cart.total())}
          </Button>
        </div>
      )}

      <Modal
        open={!!orcamentoModal}
        onClose={() => setOrcamentoModal(null)}
        title={`Solicitar orçamento — ${orcamentoModal?.nome || ''}`}
      >
        <p className="mb-3 text-sm text-slate-500">
          Descreva o que você precisa. Nossa equipe entrará em contato com o valor.
        </p>
        <textarea
          value={orcamentoDesc}
          onChange={(e) => setOrcamentoDesc(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          rows={4}
          placeholder="Ex: preciso instalar 3 tomadas na sala..."
        />
        <Button variant="cta" className="mt-4 w-full" disabled={submitting} onClick={enviarOrcamento}>
          {submitting ? 'Enviando...' : 'Enviar solicitação'}
        </Button>
      </Modal>
    </div>
  );
}
