import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitacaoApi } from '../../services/modules.service';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency } from '../../types';
import { PageHeader, Card, Button, Loading } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { gtmPush } from '../../utils/gtm';

const STORAGE_KEY = 'abs-guided-selling';

interface ServicoCatalogo {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  precoMinimo: number | null;
  precoTexto: string | null;
  tipoPreco: string;
  imagemUrl: string | null;
}

interface FluxoPergunta {
  id: string;
  titulo: string;
  opcoes: Array<{ id: string; label: string }>;
  showIf?: { perguntaId: string; opcaoIds: string[] };
}

interface ChatMsg {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

function perguntasVisiveis(perguntas: FluxoPergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    return val != null && p.showIf.opcaoIds.includes(val);
  });
}

function frasePergunta(titulo: string, indice: number) {
  if (indice === 0) return `Perfeito. Para montar o orçamento: ${titulo}`;
  if (indice === 1) return `Entendi. ${titulo}`;
  return titulo.endsWith('?') ? titulo : `${titulo}?`;
}

export function DiagnosticoIAPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useCartStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [loadingCatalogo, setLoadingCatalogo] = useState(true);
  const [servicos, setServicos] = useState<ServicoCatalogo[]>([]);
  const [fase, setFase] = useState<'inicio' | 'conversa' | 'orcamento'>('inicio');
  const [servico, setServico] = useState<ServicoCatalogo | null>(null);
  const [fluxo, setFluxo] = useState<{ slug: string; nome: string; perguntas: FluxoPergunta[] } | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mensagens, setMensagens] = useState<ChatMsg[]>([]);
  const [carregandoFluxo, setCarregandoFluxo] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [preco, setPreco] = useState<{
    preco: number;
    breakdown: Array<{ label: string; valor: number }>;
    requerValidacaoTecnica: boolean;
    mensagemValidacao?: string;
  } | null>(null);
  const [descontoElegivel, setDescontoElegivel] = useState(false);

  useEffect(() => {
    Promise.all([
      solicitacaoApi.catalogo(),
      solicitacaoApi.descontoPrimeiroServico().catch(() => ({ elegivel: false, percentual: 10 })),
    ])
      .then(([cat, desc]) => {
        const lista = (cat.categorias || []).flatMap((c) => c.servicos || []);
        setServicos(lista.filter((s) => s.tipoPreco !== 'sob_orcamento'));
        setDescontoElegivel(Boolean(desc.elegivel));
      })
      .catch(() => toast('Erro ao carregar serviços', 'error'))
      .finally(() => setLoadingCatalogo(false));
  }, [toast]);

  const visiveis = useMemo(
    () => (fluxo ? perguntasVisiveis(fluxo.perguntas, respostas) : []),
    [fluxo, respostas]
  );

  const perguntaAtual = useMemo(() => {
    if (!fluxo) return null;
    return visiveis.find((p) => !respostas[p.id]) ?? null;
  }, [fluxo, visiveis, respostas]);

  const todasRespondidas =
    !!fluxo && (fluxo.perguntas.length === 0 || (visiveis.length > 0 && visiveis.every((p) => respostas[p.id])));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, perguntaAtual, preco]);

  useEffect(() => {
    if (fase !== 'conversa' || !fluxo || !todasRespondidas || !servico) return;
    let cancelled = false;
    setCalculando(true);
    solicitacaoApi
      .calcularPreco({ slug: servico.slug, respostas, quantidade: 1 })
      .then((r) => {
        if (cancelled) return;
        setPreco(r);
        setFase('orcamento');
        const valorTxt = formatCurrency(r.preco);
        setMensagens((prev) => [
          ...prev,
          {
            id: `orc-${Date.now()}`,
            role: 'assistant',
            text: r.requerValidacaoTecnica
              ? `Analisei suas respostas. Este caso precisa de validação técnica da ABS antes do pagamento${
                  r.mensagemValidacao ? `: ${r.mensagemValidacao}` : '.'
                }`
              : `Pronto. O valor estimado do atendimento é ${valorTxt}.${
                  descontoElegivel
                    ? ' Como é seu primeiro serviço, você ganha 10% de desconto no pagamento (PIX, crédito ou débito).'
                    : ''
                } Posso te levar para finalizar e agendar?`,
          },
        ]);
        gtmPush('assistente_orcamento_calculado', {
          servico_slug: servico.slug,
          valor: r.preco,
          validacao_tecnica: r.requerValidacaoTecnica,
        });
      })
      .catch((e) => {
        if (!cancelled) toast(e instanceof Error ? e.message : 'Erro ao calcular preço', 'error');
      })
      .finally(() => {
        if (!cancelled) setCalculando(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fase, fluxo, todasRespondidas, servico, respostas, descontoElegivel, toast]);

  const iniciarServico = async (s: ServicoCatalogo) => {
    setCarregandoFluxo(true);
    setServico(s);
    setRespostas({});
    setPreco(null);
    try {
      const f = await solicitacaoApi.fluxo(s.slug);
      setFluxo(f);
      setFase('conversa');
      setMensagens([
        {
          id: 'hello',
          role: 'assistant',
          text: `Olá! Sou o consultor da ABS Resolve. Vamos resolver: ${s.nome}. Me faça algumas perguntas rápidas — uma de cada vez.`,
        },
        {
          id: 'q0',
          role: 'assistant',
          text:
            f.perguntas.length === 0
              ? 'Este serviço tem preço fixo. Posso calcular o valor agora.'
              : frasePergunta(f.perguntas[0].titulo, 0),
        },
      ]);
      gtmPush('assistente_servico_iniciado', { servico_slug: s.slug });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Questionário indisponível para este serviço', 'error');
      setServico(null);
    } finally {
      setCarregandoFluxo(false);
    }
  };

  const responder = (opcaoId: string, opcaoLabel: string) => {
    if (!perguntaAtual || !fluxo) return;
    const idx = visiveis.findIndex((p) => p.id === perguntaAtual.id);
    setMensagens((prev) => [
      ...prev,
      { id: `u-${perguntaAtual.id}`, role: 'user', text: opcaoLabel },
    ]);
    const nextRespostas = { ...respostas, [perguntaAtual.id]: opcaoId };
    setRespostas(nextRespostas);

    const nextVisiveis = perguntasVisiveis(fluxo.perguntas, nextRespostas);
    const proxima = nextVisiveis.find((p) => !nextRespostas[p.id]);
    if (proxima) {
      setTimeout(() => {
        setMensagens((prev) => [
          ...prev,
          {
            id: `a-${proxima.id}`,
            role: 'assistant',
            text: frasePergunta(proxima.titulo, idx + 1),
          },
        ]);
      }, 280);
    }
    gtmPush('assistente_resposta', {
      servico_slug: servico?.slug,
      pergunta_id: perguntaAtual.id,
      opcao_id: opcaoId,
    });
  };

  const irParaAgendar = () => {
    if (!servico) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        slug: servico.slug,
        nome: servico.nome,
        categoria: servico.categoria,
        precoMinimo: servico.precoMinimo,
        precoTexto: servico.precoTexto || '',
        tipoPreco: servico.tipoPreco,
        imagemUrl: servico.imagemUrl,
        respostas,
      })
    );
    cart.clear();
    cart.add({
      slug: servico.slug,
      nome: servico.nome,
      categoria: servico.categoria,
      precoMinimo: servico.precoMinimo,
      precoTexto: servico.precoTexto || '',
      tipoPreco: servico.tipoPreco,
      imagemUrl: servico.imagemUrl,
    });
    gtmPush('assistente_ir_agendar', { servico_slug: servico.slug, valor: preco?.preco });
    navigate('/cliente/agendar?assistente=1');
  };

  const reiniciar = () => {
    setFase('inicio');
    setServico(null);
    setFluxo(null);
    setRespostas({});
    setMensagens([]);
    setPreco(null);
  };

  if (loadingCatalogo) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Consultor ABS"
        subtitle="Conversa guiada: entendemos o problema, calculamos o preço e ajudamos a agendar"
      />

      {descontoElegivel && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>Novo cliente:</strong> 10% de desconto no primeiro serviço — válido no PIX, crédito ou débito.
        </div>
      )}

      {fase === 'inicio' && (
        <Card>
          <p className="mb-4 text-sm text-slate-600">
            Em vez de adivinhar por foto, eu faço as perguntas do serviço — uma de cada vez — e monto o orçamento
            com a mesma lógica do catálogo.
          </p>
          <h3 className="mb-3 font-semibold text-primary-800">O que você precisa resolver?</h3>
          {carregandoFluxo ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <div className="grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2">
              {servicos.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => iniciarServico(s)}
                  className="rounded-xl border border-abs-gray bg-white p-3 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                  <span className="font-semibold text-primary-900">{s.nome}</span>
                  <span className="mt-1 block text-xs text-slate-500">{s.precoTexto || 'Consulte'}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {(fase === 'conversa' || fase === 'orcamento') && (
        <Card className="flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary-800">{servico?.nome}</p>
            <button type="button" className="text-xs text-slate-500 underline" onClick={reiniciar}>
              Trocar serviço
            </button>
          </div>

          <div className="mb-4 max-h-[22rem] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {calculando && (
              <p className="text-xs text-slate-500">Calculando orçamento...</p>
            )}
            <div ref={bottomRef} />
          </div>

          {fase === 'conversa' && perguntaAtual && (
            <div className="flex flex-wrap gap-2">
              {perguntaAtual.opcoes.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => responder(op.id, op.label)}
                  className="rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-800 transition hover:bg-primary-50"
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}

          {fase === 'orcamento' && preco && (
            <div className="space-y-3">
              {!preco.requerValidacaoTecnica && (
                <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
                  <p className="text-2xl font-bold text-primary-800">{formatCurrency(preco.preco)}</p>
                  {descontoElegivel && (
                    <p className="mt-1 text-sm text-emerald-700">
                      10% de desconto de novo cliente será aplicado no pagamento
                    </p>
                  )}
                  {preco.breakdown.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {preco.breakdown.map((b, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>{b.label}</span>
                          <span>{formatCurrency(b.valor)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {!preco.requerValidacaoTecnica && (
                  <Button variant="cta" onClick={irParaAgendar}>
                    Finalizar e agendar
                  </Button>
                )}
                <Button onClick={reiniciar}>Nova conversa</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
