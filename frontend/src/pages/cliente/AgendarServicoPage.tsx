import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { solicitacaoApi } from '../../services/modules.service';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../types';
import { imagemServicoComRespostas } from '../../config/imagens-opcoes';
import { PageHeader, Loading, Card, Button, ScarcityBadge, Modal, Logo } from '../../components/ui';
import { CheckoutStepper } from '../../components/loja/store-ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { relatedForCart, type CategoriaLoja } from '../../storefront/catalog';
import { normalizeSearch } from '../../storefront/search';
import { isPecaSlug } from '../../storefront/pecas';
import { QuestionarioServico, FotosServicoStep, QuestionarioNav, type PrecoCalculado } from '../../components/cliente/QuestionarioServico';
import { useToast } from '../../components/Toast';
import { gtmEtapaAgendar, gtmPush } from '../../utils/gtm';
import {
  calcularParcelamento,
  PARCELAS_SEM_JUROS,
  TAXA_JUROS_MES_PERCENT_DEFAULT,
} from '../../utils/parcelamento';

type Step = 'catalogo' | 'carrinho' | 'questionario' | 'resumo' | 'fotos' | 'pagamento' | 'aguardando' | 'horario' | 'concluido';

function isPecaItem(item: { slug: string; tipo?: string }) {
  return item.tipo === 'peca' || isPecaSlug(item.slug);
}

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
  jardinagem: 'from-green-500 to-green-700',
  'limpeza-pos-obra': 'from-slate-500 to-slate-700',
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
  invoiceUrl,
}: {
  metodo: 'PIX' | 'CARTAO' | null;
  pixCode?: string;
  invoiceUrl?: string;
}) {
  if (!pixCode && !invoiceUrl) return null;

  const isPix = metodo === 'PIX' || Boolean(pixCode);
  const titulo = isPix ? 'Pagamento PIX' : 'Pagamento no cartão de crédito';

  return (
    <div className={`mb-4 rounded-xl border-2 p-4 ${isPix ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      <p className={`mb-2 text-sm font-semibold ${isPix ? 'text-green-800' : 'text-blue-900'}`}>{titulo}</p>
      {isPix && pixCode && (
        <>
          <div className="mb-3 flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`}
              alt="QR Code PIX"
              className="rounded-lg border bg-white p-2"
            />
          </div>
          <p className="mb-1 text-xs font-medium text-green-800">PIX copia e cola:</p>
          <textarea
            readOnly
            value={pixCode}
            className="w-full rounded border p-2 text-xs"
            rows={3}
            onFocus={() => gtmPush('agendar_pix_copia_cola_focado')}
          />
        </>
      )}
      {!isPix && invoiceUrl && (
        <div className="overflow-hidden rounded-lg border border-blue-200 bg-white">
          <iframe
            title="Checkout Asaas — cartão"
            src={invoiceUrl}
            className="h-[520px] w-full"
            allow="payment *"
          />
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="block border-t px-3 py-2 text-center text-sm text-primary-600 underline"
            onClick={() => gtmPush('agendar_pagamento_link_externo', { url: invoiceUrl })}
          >
            Abrir em nova aba se o formulário não carregar
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
  const [step, setStep] = useState<Step>('catalogo');
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
  const [pagamento, setPagamento] = useState<{ id?: string; invoiceUrl?: string; pixCode?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);
  const [orcamentoModal, setOrcamentoModal] = useState<ServicoCatalogo | null>(null);
  const [orcamentoDesc, setOrcamentoDesc] = useState('');
  const [itemQuestionarioIdx, setItemQuestionarioIdx] = useState(0);
  const [respostasPorSlug, setRespostasPorSlug] = useState<Record<string, Record<string, string>>>({});
  const [precosPorSlug, setPrecosPorSlug] = useState<Record<string, PrecoCalculado | null>>({});

  useEffect(() => {
    setPrecosPorSlug((prev) => {
      const next = { ...prev };
      for (const item of cart.items) {
        if (!isPecaItem(item) || next[item.slug]) continue;
        const valor = (item.precoMinimo || 0) * item.quantidade;
        next[item.slug] = {
          preco: valor,
          breakdown: [{ label: 'Peça avulsa', valor }],
          requerValidacaoTecnica: false,
        };
      }
      return next;
    });
  }, [cart.items]);
  const [fotosPorSlug, setFotosPorSlug] = useState<Record<string, File[]>>({});
  const [fluxosFotos, setFluxosFotos] = useState<Record<string, string[]>>({});
  const [descontoPixPercent, setDescontoPixPercent] = useState(5);
  const [valorDescontoAplicado, setValorDescontoAplicado] = useState(0);
  const [pctDescontoAplicado, setPctDescontoAplicado] = useState(0);
  const [metodoPagamento, setMetodoPagamento] = useState<'PIX' | 'CARTAO' | null>(null);
  const [parcelas, setParcelas] = useState(1);
  const [parcelasSemJuros, setParcelasSemJuros] = useState(PARCELAS_SEM_JUROS);
  const [taxaJurosMes, setTaxaJurosMes] = useState(TAXA_JUROS_MES_PERCENT_DEFAULT);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retomouAgendamento = useRef(false);
  const assistenteImportado = useRef(false);

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
    setStep('questionario');
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

  // Importar respostas do Consultor ABS (conversa guiada)
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
        respostas: Record<string, string>;
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
      setRespostasPorSlug({ [data.slug]: data.respostas || {} });
      setItemQuestionarioIdx(0);
      setStep('questionario');
      setSearchParams({}, { replace: true });
      toast('Orçamento do consultor carregado. Confira e continue.', 'success');
    } catch {
      sessionStorage.removeItem('abs-guided-selling');
    }
  }, [loading, searchParams, setSearchParams, toast, cart]);

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
          }));
        }
        if (status.podeAgendar) {
          if (pollRef.current) clearInterval(pollRef.current);
          setAguardandoPagamento(false);
          cart.clear();
          gtmPush('agendar_pagamento_confirmado', {
            solicitacao_id: solId,
            pedido_id: status.pedidoId,
            pedido_numero: status.pedidoNumero,
          });
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

  const servicoItems = cart.items.filter((i) => !isPecaItem(i));

  const irQuestionario = () => {
    if (!cart.count()) {
      toast('Adicione serviços ou peças ao carrinho', 'error');
      return;
    }
    if (!servicoItems.length) {
      void confirmarPedido();
      return;
    }
    setItemQuestionarioIdx(0);
    setStep('questionario');
  };

  const itemAtual = servicoItems[itemQuestionarioIdx];
  const respostasAtual = itemAtual ? respostasPorSlug[itemAtual.slug] || {} : {};
  const precoAtual = itemAtual ? precosPorSlug[itemAtual.slug] : null;

  const totalCalculado = useMemo(() => {
    return cart.items.reduce((sum, item) => {
      const p = precosPorSlug[item.slug];
      return sum + (p?.preco ?? (item.precoMinimo || 0) * item.quantidade);
    }, 0);
  }, [cart.items, precosPorSlug]);

  const descontoPixEstimado =
    metodoPagamento === 'PIX'
      ? Math.round(preco * (descontoPixPercent / 100) * 100) / 100
      : 0;
  const totalComPix =
    metodoPagamento === 'PIX' ? Math.max(0, preco - descontoPixEstimado) : preco;

  const temValidacaoTecnica = cart.items.some((i) => precosPorSlug[i.slug]?.requerValidacaoTecnica);

  const questionarioCompleto = cart.items.every((item) => {
    if (isPecaItem(item)) return true;
    const p = precosPorSlug[item.slug];
    return p && !p.requerValidacaoTecnica;
  });

  const setRespostaAtual = (perguntaId: string, valor: string) => {
    if (!itemAtual) return;
    setRespostasPorSlug((prev) => ({
      ...prev,
      [itemAtual.slug]: { ...(prev[itemAtual.slug] || {}), [perguntaId]: valor },
    }));
  };

  const resetRespostasAtual = () => {
    if (!itemAtual) return;
    setRespostasPorSlug((prev) => ({ ...prev, [itemAtual.slug]: {} }));
    setPrecosPorSlug((prev) => ({ ...prev, [itemAtual.slug]: null }));
  };

  const setPrecoAtual = (preco: PrecoCalculado | null) => {
    if (!itemAtual) return;
    setPrecosPorSlug((prev) => ({ ...prev, [itemAtual.slug]: preco }));
  };

  const avancarQuestionario = () => {
    if (!precoAtual || precoAtual.requerValidacaoTecnica) {
      toast('Responda as perguntas ou aguarde a validação técnica', 'error');
      return;
    }
    if (itemQuestionarioIdx < servicoItems.length - 1) {
      setItemQuestionarioIdx((i) => i + 1);
    } else {
      void confirmarPedido();
    }
  };

  const irFotos = async () => {
    if (!questionarioCompleto) {
      toast('Conclua a conversa de todos os serviços', 'error');
      return;
    }
    const cache: Record<string, string[]> = { ...fluxosFotos };
    for (const item of cart.items) {
      if (!cache[item.slug]) {
        try {
          const fluxo = await solicitacaoApi.fluxo(item.slug);
          cache[item.slug] = fluxo.fotosObrigatorias || [];
        } catch {
          cache[item.slug] = [];
        }
      }
    }
    setFluxosFotos(cache);
    setStep('fotos');
  };

  const confirmarPedido = async () => {
    setSubmitting(true);
    try {
      const itens = cart.items.map((i) => ({
        slug: i.slug,
        quantidade: i.quantidade,
        respostas: respostasPorSlug[i.slug] || {},
      }));
      const sol = await solicitacaoApi.criarCarrinho({
        itens,
        express,
      });

      for (const item of cart.items) {
        const files = fotosPorSlug[item.slug];
        if (files?.length) {
          await solicitacaoApi.uploadFotos(sol.id, files, item.slug);
        }
      }

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
      const res = (await solicitacaoApi.pagar(solicitacaoId, metodo, installmentCount)) as {
        pagamento: { id?: string; invoiceUrl?: string; pixCode?: string };
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
          ? 'PIX gerado! Pague nesta tela e aguarde a confirmação.'
          : 'Preencha o cartão abaixo para finalizar o pagamento.',
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
    step === 'catalogo' || step === 'carrinho'
      ? 1
      : step === 'questionario' || step === 'resumo' || step === 'fotos'
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
                    src={imagemServicoComRespostas(item.slug, respostasPorSlug[item.slug] || {}, item.imagemUrl)}
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
              A partir de: {formatCurrency(cart.total())}
            </p>
            <p className="text-xs text-slate-500">O valor final é calculado nas perguntas do serviço</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setStep('catalogo')}>Continuar comprando</Button>
              <Button variant="cta" onClick={irQuestionario} disabled={!cart.count()}>
                Informar detalhes e calcular valor
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

      {step === 'questionario' && itemAtual && (
        <Card>
          <p className="mb-4 text-sm text-slate-500">
            Serviço {itemQuestionarioIdx + 1} de {servicoItems.length}
          </p>
          <QuestionarioServico
            slug={itemAtual.slug}
            nome={itemAtual.nome}
            quantidade={itemAtual.quantidade}
            imagemCatalogo={itemAtual.imagemUrl}
            respostas={respostasAtual}
            onResposta={setRespostaAtual}
            onPrecoChange={setPrecoAtual}
            onResetRespostas={resetRespostasAtual}
          />
          <QuestionarioNav
            onVoltar={() => {
              if (itemQuestionarioIdx > 0) setItemQuestionarioIdx((i) => i - 1);
              else setStep('carrinho');
            }}
            onAvancar={avancarQuestionario}
            disabled={!precoAtual || precoAtual.requerValidacaoTecnica}
            avancarLabel={
              submitting
                ? 'Processando...'
                : itemQuestionarioIdx < cart.items.length - 1
                  ? 'Próximo serviço'
                  : 'Ir para pagamento'
            }
          />
        </Card>
      )}

      {false && step === 'resumo' && (
        <>
        <Card>
          <h3 className="mb-4 text-lg font-bold text-primary-800">Resumo do pedido</h3>
          {temValidacaoTecnica && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <span className="inline-flex flex-wrap items-center gap-1">
                Um ou mais serviços requerem validação técnica da <Logo variant="inline" className="h-4" />.
                Entre em contato pelo WhatsApp antes de pagar.
              </span>
            </div>
          )}
          <ul className="divide-y divide-abs-gray">
            {cart.items.map((item) => {
              const p = precosPorSlug[item.slug];
              return (
                <li key={item.slug} className="flex gap-3 py-3">
                  <img
                    src={imagemServicoComRespostas(item.slug, respostasPorSlug[item.slug] || {}, item.imagemUrl)}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                  <div className="flex justify-between font-semibold text-primary-800">
                    <span>{item.nome}</span>
                    <span>{formatCurrency(p?.preco ?? 0)}</span>
                  </div>
                  {p?.breakdown?.map((b, i) => (
                    <p key={i} className="flex justify-between text-xs text-slate-500">
                      <span>{b.label}</span>
                      <span>{formatCurrency(b.valor)}</span>
                    </p>
                  ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xl font-bold text-primary-800">
            Total: {formatCurrency(totalCalculado)}
          </p>
          <QuestionarioNav
            onVoltar={() => {
              setItemQuestionarioIdx(cart.items.length - 1);
              setStep('questionario');
            }}
            onAvancar={irFotos}
            disabled={!questionarioCompleto}
            avancarLabel="Enviar fotos"
          />
        </Card>
          <RelatedRail
            title="Leve mais nesta visita"
            subtitle="O profissional já vai até você. Vale incluir agora."
            servicos={relatedCheckout}
          />
        </>
      )}

      {false && step === 'fotos' && (
        <Card>
          <h3 className="mb-2 text-lg font-bold text-primary-800">Fotos do local</h3>
          <p className="mb-4 text-sm text-slate-500">
            Envie fotos conforme indicado para cada serviço. Isso ajuda na validação antes do atendimento.
          </p>
          {cart.items.map((item) => (
            <FotosServicoStep
              key={item.slug}
              slug={item.slug}
              nome={item.nome}
              labels={fluxosFotos[item.slug] || []}
              arquivos={fotosPorSlug[item.slug] || []}
              onChange={(files) => setFotosPorSlug((prev) => ({ ...prev, [item.slug]: files }))}
            />
          ))}
          <QuestionarioNav
            onVoltar={() => setStep('resumo')}
            onAvancar={confirmarPedido}
            disabled={submitting || cart.items.some((i) => !(fotosPorSlug[i.slug]?.length))}
            avancarLabel={submitting ? 'Processando...' : 'Ir para pagamento'}
          />
        </Card>
      )}

      {step === 'pagamento' && (
        <Card>
          <h3 className="mb-2 text-lg font-bold text-primary-800">Pagamento</h3>
          <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {cart.items.map((item) => (
              <li key={item.slug} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium text-primary-800">{item.nome}</span>
                <span className="font-bold">{formatCurrency(precosPorSlug[item.slug]?.preco ?? 0)}</span>
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
                  ? `Pagar em ${parcelas}x nesta página`
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
