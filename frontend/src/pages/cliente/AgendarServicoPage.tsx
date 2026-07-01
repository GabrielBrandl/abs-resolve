import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitacaoApi } from '../../services/modules.service';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../types';
import { imagemServicoComRespostas, MARGEM_ERRO_IA_PERCENT } from '../../config/imagens-opcoes';
import { PageHeader, Loading, Card, Button, ScarcityBadge, Modal, Logo } from '../../components/ui';
import { QuestionarioServico, FotosServicoStep, QuestionarioNav, type PrecoCalculado } from '../../components/cliente/QuestionarioServico';
import { useToast } from '../../components/Toast';

type Step = 'catalogo' | 'carrinho' | 'questionario' | 'resumo' | 'fotos' | 'pagamento' | 'aguardando' | 'horario' | 'concluido';

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
        className="h-28 w-full object-cover"
        onError={() => setImgOk(false)}
      />
    );
  }

  return (
    <div className={`flex h-28 items-center justify-center bg-gradient-to-br text-5xl ${gradient}`}>
      {icone || '🔧'}
    </div>
  );
}

function PixQrArea({ pixCode, invoiceUrl }: { pixCode?: string; invoiceUrl?: string }) {
  if (!pixCode && !invoiceUrl) return null;

  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <p className="mb-2 text-sm font-semibold text-green-800">Pagamento PIX</p>
      {pixCode && (
        <>
          <div className="mb-3 flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixCode)}`}
              alt="QR Code PIX"
              className="rounded-lg border bg-white p-2"
            />
          </div>
          <p className="mb-1 text-xs font-medium text-green-800">PIX copia e cola:</p>
          <textarea readOnly value={pixCode} className="w-full rounded border p-2 text-xs" rows={3} />
        </>
      )}
      {invoiceUrl && (
        <a href={invoiceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-center text-sm text-primary-600 underline">
          Abrir link de pagamento
        </a>
      )}
    </div>
  );
}

export function AgendarServicoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useCartStore();
  const [step, setStep] = useState<Step>('catalogo');
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const [catAtiva, setCatAtiva] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [preco, setPreco] = useState(0);
  const [express, setExpress] = useState(false);
  const [expressValor, setExpressValor] = useState(29);
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
  const [fotosPorSlug, setFotosPorSlug] = useState<Record<string, File[]>>({});
  const [fluxosFotos, setFluxosFotos] = useState<Record<string, string[]>>({});
  const [aceiteIa, setAceiteIa] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([solicitacaoApi.catalogo(), solicitacaoApi.config()])
      .then(([data, config]) => {
        setCategorias(data.categorias || []);
        if (data.categorias?.[0]) setCatAtiva(data.categorias[0].slug);
        setExpressValor(config.expressValor);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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
    const q = busca.toLowerCase();
    return lista.filter(
      (s) => s.nome.toLowerCase().includes(q) || s.descricao?.toLowerCase().includes(q)
    );
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
          toast('Pagamento confirmado! Acompanhe sua ordem de serviço.', 'success');
          const destino = status.pedidoId ? `/cliente?pedido=${status.pedidoId}` : '/cliente';
          navigate(destino);
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

  const irQuestionario = () => {
    if (!cart.count()) {
      toast('Adicione serviços ao carrinho', 'error');
      return;
    }
    setItemQuestionarioIdx(0);
    setStep('questionario');
  };

  const itemAtual = cart.items[itemQuestionarioIdx];
  const respostasAtual = itemAtual ? respostasPorSlug[itemAtual.slug] || {} : {};
  const precoAtual = itemAtual ? precosPorSlug[itemAtual.slug] : null;

  const totalCalculado = useMemo(() => {
    return cart.items.reduce((sum, item) => {
      const p = precosPorSlug[item.slug];
      return sum + (p?.preco ?? (item.precoMinimo || 0) * item.quantidade);
    }, 0);
  }, [cart.items, precosPorSlug]);

  const temValidacaoTecnica = cart.items.some((i) => precosPorSlug[i.slug]?.requerValidacaoTecnica);

  const questionarioCompleto = cart.items.every((item) => {
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

  const setRespostasBulkAtual = (patch: Record<string, string>) => {
    if (!itemAtual) return;
    setRespostasPorSlug((prev) => ({
      ...prev,
      [itemAtual.slug]: { ...(prev[itemAtual.slug] || {}), ...patch },
    }));
  };

  const setPrecoAtual = (preco: PrecoCalculado | null) => {
    if (!itemAtual) return;
    setPrecosPorSlug((prev) => ({ ...prev, [itemAtual.slug]: preco }));
  };

  const avancarQuestionario = () => {
    if (!precoAtual || precoAtual.requerValidacaoTecnica) {
      toast('Responda todas as perguntas ou aguarde validação técnica', 'error');
      return;
    }
    if (itemQuestionarioIdx < cart.items.length - 1) {
      setItemQuestionarioIdx((i) => i + 1);
    } else {
      setStep('resumo');
    }
  };

  const irFotos = async () => {
    if (!questionarioCompleto) {
      toast('Complete o questionário de todos os serviços', 'error');
      return;
    }
    if (!aceiteIa) {
      toast('Aceite o termo sobre diagnóstico por IA para continuar', 'error');
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
    const semFoto = cart.items.find((i) => !(fotosPorSlug[i.slug]?.length));
    if (semFoto) {
      toast(`Envie pelo menos uma foto para "${semFoto.nome}"`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const itens = cart.items.map((i) => ({
        slug: i.slug,
        quantidade: i.quantidade,
        respostas: respostasPorSlug[i.slug] || {},
      }));
      const sol = (await solicitacaoApi.criarCarrinho({
        itens,
        express,
        aceiteIaDiagnostico: aceiteIa,
      })) as { id: string; precoFinal: number };

      for (const item of cart.items) {
        const files = fotosPorSlug[item.slug];
        if (files?.length) {
          await solicitacaoApi.uploadFotos(sol.id, files, item.slug);
        }
      }

      setSolicitacaoId(sol.id);
      setPreco(Number(sol.precoFinal));
      setStep('pagamento');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar pedido', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pagar = async (metodo: string) => {
    setSubmitting(true);
    try {
      const res = await solicitacaoApi.pagar(solicitacaoId, metodo) as {
        pagamento: { id?: string; invoiceUrl?: string; pixCode?: string };
      };
      setPagamento(res.pagamento);
      cart.clear();
      setStep('aguardando');
      iniciarPolling(solicitacaoId);
      toast('Pagamento gerado! Aguardando confirmação...', 'success');
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
      setStep('concluido');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao agendar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpress = async (checked: boolean) => {
    setExpress(checked);
    if (solicitacaoId) {
      const res = await solicitacaoApi.checkout(solicitacaoId, checked) as { precoFinal: number };
      setPreco(Number(res.precoFinal));
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

  const stepLabels: Record<Step, string> = {
    catalogo: 'Catálogo',
    carrinho: 'Carrinho',
    questionario: 'Perguntas',
    resumo: 'Resumo',
    fotos: 'Fotos',
    pagamento: 'Pagamento',
    aguardando: 'Confirmação',
    horario: 'Horário',
    concluido: 'Pronto',
  };
  const stepOrder: Step[] = [
    'catalogo',
    'carrinho',
    'questionario',
    'resumo',
    'fotos',
    'pagamento',
    'aguardando',
    'horario',
    'concluido',
  ];

  return (
    <div className="pb-24">
      <PageHeader
        title="Solicitar Serviço"
        subtitle="Escolha os serviços, finalize o pagamento e agende o atendimento"
      />

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium">
        {stepOrder.map((s, i) => {
          const active = step === s;
          const done = stepOrder.indexOf(step) > i;
          return (
            <span
              key={s}
              className={`rounded-full px-3 py-1 ${
                active ? 'bg-accent-500 text-primary-900' : done ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i + 1}. {stepLabels[s]}
            </span>
          );
        })}
      </div>

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
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-primary-700">{s.precoTexto || 'Consulte'}</p>
                      {s.garantiaDias > 0 && (
                        <p className="text-[10px] text-slate-400">Garantia {s.garantiaDias} dias</p>
                      )}
                    </div>
                    {s.tipoPreco === 'sob_orcamento' ? (
                      <Button
                        variant="cta"
                        className="shrink-0 text-sm"
                        onClick={() => { setOrcamentoModal(s); setOrcamentoDesc(''); }}
                      >
                        Solicitar orçamento
                      </Button>
                    ) : (
                      <Button
                        variant="cta"
                        className="shrink-0 text-sm"
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
        <Card>
          <h3 className="mb-4 text-lg font-bold text-primary-800">Seu carrinho</h3>
          {cart.items.length === 0 ? (
            <p className="text-slate-500">Carrinho vazio.</p>
          ) : (
            <ul className="divide-y divide-abs-gray">
              {cart.items.map((item) => (
                <li key={item.slug} className="flex flex-wrap items-center gap-3 py-4">
                  <img
                    src={imagemServicoComRespostas(item.slug, respostasPorSlug[item.slug] || {}, item.imagemUrl)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-primary-800">{item.nome}</p>
                    <p className="text-sm text-slate-500">{item.precoTexto}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-8 w-8 rounded border" onClick={() => cart.setQty(item.slug, item.quantidade - 1)}>−</button>
                    <span className="w-6 text-center">{item.quantidade}</span>
                    <button type="button" className="h-8 w-8 rounded border" onClick={() => cart.setQty(item.slug, item.quantidade + 1)}>+</button>
                  </div>
                  <p className="w-24 text-right font-bold text-primary-700">
                    {formatCurrency((item.precoMinimo || 0) * item.quantidade)}
                  </p>
                  <button type="button" className="text-sm text-red-500" onClick={() => cart.remove(item.slug)}>Remover</button>
                </li>
              ))}
            </ul>
          )}

          <label className="mt-4 flex items-center gap-2 rounded-lg border-2 border-accent-400 bg-accent-50 p-3">
            <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} />
            <span className="font-medium">Atendimento Express (+ {formatCurrency(expressValor)})</span>
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xl font-bold text-primary-800">
              A partir de: {formatCurrency(cart.total() + (express ? expressValor : 0))}
            </p>
            <p className="text-xs text-slate-500">O valor final será calculado após o questionário</p>
            <div className="flex gap-2">
              <Button onClick={() => setStep('catalogo')}>Continuar comprando</Button>
              <Button variant="cta" onClick={irQuestionario} disabled={!cart.count()}>
                Responder perguntas
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 'questionario' && itemAtual && (
        <Card>
          <p className="mb-4 text-sm text-slate-500">
            Serviço {itemQuestionarioIdx + 1} de {cart.items.length}
          </p>
          <QuestionarioServico
            slug={itemAtual.slug}
            nome={itemAtual.nome}
            quantidade={itemAtual.quantidade}
            imagemCatalogo={itemAtual.imagemUrl}
            respostas={respostasAtual}
            onResposta={setRespostaAtual}
            onPrecoChange={setPrecoAtual}
            onRespostasBulk={setRespostasBulkAtual}
          />
          <QuestionarioNav
            onVoltar={() => {
              if (itemQuestionarioIdx > 0) setItemQuestionarioIdx((i) => i - 1);
              else setStep('carrinho');
            }}
            onAvancar={avancarQuestionario}
            disabled={!precoAtual || precoAtual.requerValidacaoTecnica}
            avancarLabel={itemQuestionarioIdx < cart.items.length - 1 ? 'Próximo serviço' : 'Ver resumo'}
          />
        </Card>
      )}

      {step === 'resumo' && (
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
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={aceiteIa}
              onChange={(e) => setAceiteIa(e.target.checked)}
            />
            <span>
              Estou ciente de que o diagnóstico por inteligência artificial pode conter imprecisões (margem estimada de até{' '}
              {MARGEM_ERRO_IA_PERCENT}%) e concordo em prosseguir com o serviço com base nas informações fornecidas.
            </span>
          </label>
          <label className="mt-4 flex items-center gap-2 rounded-lg border-2 border-accent-400 bg-accent-50 p-3">
            <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} />
            <span className="font-medium">Atendimento Express (+ {formatCurrency(expressValor)})</span>
          </label>
          <p className="mt-4 text-xl font-bold text-primary-800">
            Total: {formatCurrency(totalCalculado + (express ? expressValor : 0))}
          </p>
          <QuestionarioNav
            onVoltar={() => {
              setItemQuestionarioIdx(cart.items.length - 1);
              setStep('questionario');
            }}
            onAvancar={irFotos}
            disabled={!questionarioCompleto || !aceiteIa}
            avancarLabel="Enviar fotos"
          />
        </Card>
      )}

      {step === 'fotos' && (
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
          <p className="mb-4 text-2xl font-bold text-primary-700">{formatCurrency(preco)}</p>
          <label className="mb-4 flex items-center gap-2 rounded-lg border p-3">
            <input type="checkbox" checked={express} onChange={(e) => toggleExpress(e.target.checked)} />
            <span>Express (+ {formatCurrency(expressValor)})</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="cta" disabled={submitting} onClick={() => pagar('PIX')}>PIX</Button>
            <Button disabled={submitting} onClick={() => pagar('CARTAO')}>Cartão</Button>
          </div>
        </Card>
      )}

      {step === 'aguardando' && (
        <Card>
          <h3 className="mb-2 font-bold text-primary-800">Aguardando confirmação do pagamento</h3>
          <PixQrArea pixCode={pagamento?.pixCode} invoiceUrl={pagamento?.invoiceUrl} />
          {aguardandoPagamento && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              Verificando pagamento a cada 2 segundos...
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
                  onClick={() => setSlotSel({ data: s.data, horarioInicio: s.horarioInicio, horarioFim: s.horarioFim })}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
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
        </Card>
      )}

      {step === 'catalogo' && cart.count() > 0 && (
        <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 md:bottom-6">
          <Button variant="cta" className="shadow-xl" onClick={irCarrinho}>
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
