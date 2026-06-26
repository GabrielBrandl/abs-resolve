import { useEffect, useMemo, useState } from 'react';
import { solicitacaoApi } from '../../services/modules.service';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Button, ScarcityBadge } from '../../components/ui';
import { useToast } from '../../components/Toast';

type Step = 'catalogo' | 'carrinho' | 'pagamento' | 'horario' | 'concluido';

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

export function AgendarServicoPage() {
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
  const [slots, setSlots] = useState<Array<{ data: string; horarioInicio: string; horarioFim: string; label: string; escassez: string }>>([]);
  const [proxima, setProxima] = useState<string | null>(null);
  const [slotSel, setSlotSel] = useState<{ data: string; horarioInicio: string; horarioFim: string } | null>(null);
  const [pagamento, setPagamento] = useState<{ invoiceUrl?: string; pixCode?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    solicitacaoApi
      .catalogo()
      .then((data) => {
        setCategorias(data.categorias || []);
        if (data.categorias?.[0]) setCatAtiva(data.categorias[0].slug);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const irCarrinho = () => {
    if (!cart.count()) {
      toast('Adicione serviços ao carrinho', 'error');
      return;
    }
    setStep('carrinho');
  };

  const confirmarPedido = async () => {
    setSubmitting(true);
    try {
      const itens = cart.items.map((i) => ({ slug: i.slug, quantidade: i.quantidade }));
      const sol = await solicitacaoApi.criarCarrinho({ itens, express }) as { id: string; precoFinal: number };
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
        pagamento: { invoiceUrl?: string; pixCode?: string };
      };
      setPagamento(res.pagamento);
      const h = await solicitacaoApi.horarios(solicitacaoId);
      setSlots(h.slots);
      setProxima(h.proximaDisponibilidade);
      cart.clear();
      toast('Pagamento gerado! Escolha o horário.', 'success');
      setStep('horario');
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

  if (loading) return <Loading />;

  return (
    <div className="pb-24">
      <PageHeader
        title="Solicitar Serviço"
        subtitle="Escolha os serviços, finalize o pagamento e agende o atendimento"
      />

      {/* Steps indicator */}
      <div className="mb-6 flex flex-wrap gap-2 text-xs font-medium">
        {(['catalogo', 'carrinho', 'pagamento', 'horario', 'concluido'] as Step[]).map((s, i) => {
          const labels = ['Catálogo', 'Carrinho', 'Pagamento', 'Horário', 'Pronto'];
          const active = step === s;
          const done = ['catalogo', 'carrinho', 'pagamento', 'horario', 'concluido'].indexOf(step) > i;
          return (
            <span
              key={s}
              className={`rounded-full px-3 py-1 ${
                active ? 'bg-accent-500 text-primary-900' : done ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i + 1}. {labels[i]}
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
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">Sob orçamento</span>
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
            <span className="font-medium">Atendimento Express (+ R$ 29)</span>
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xl font-bold text-primary-800">
              Total: {formatCurrency(cart.total() + (express ? 29 : 0))}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setStep('catalogo')}>Continuar comprando</Button>
              <Button variant="cta" onClick={confirmarPedido} disabled={submitting || !cart.count()}>
                {submitting ? 'Processando...' : 'Ir para pagamento'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 'pagamento' && (
        <Card>
          <h3 className="mb-2 text-lg font-bold text-primary-800">Pagamento</h3>
          <p className="mb-4 text-2xl font-bold text-primary-700">{formatCurrency(preco)}</p>
          <label className="mb-4 flex items-center gap-2 rounded-lg border p-3">
            <input type="checkbox" checked={express} onChange={(e) => toggleExpress(e.target.checked)} />
            <span>Express (+ R$ 29)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="cta" disabled={submitting} onClick={() => pagar('PIX')}>PIX</Button>
            <Button disabled={submitting} onClick={() => pagar('BOLETO')}>Boleto</Button>
            <Button disabled={submitting} onClick={() => pagar('CARTAO')}>Cartão</Button>
          </div>
        </Card>
      )}

      {step === 'horario' && (
        <Card>
          <h3 className="mb-2 font-bold text-primary-800">Escolha o horário de atendimento</h3>
          {pagamento?.pixCode && (
            <div className="mb-4 rounded-lg bg-green-50 p-3">
              <p className="mb-1 text-xs font-medium text-green-800">PIX copia e cola:</p>
              <textarea readOnly value={pagamento.pixCode} className="w-full rounded border p-2 text-xs" rows={2} />
            </div>
          )}
          {pagamento?.invoiceUrl && (
            <a href={pagamento.invoiceUrl} target="_blank" rel="noreferrer" className="mb-4 block text-primary-600 underline">
              Abrir link de pagamento
            </a>
          )}
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
        <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
          <Button variant="cta" className="shadow-xl" onClick={irCarrinho}>
            Ver carrinho ({cart.count()}) — {formatCurrency(cart.total())}
          </Button>
        </div>
      )}
    </div>
  );
}
