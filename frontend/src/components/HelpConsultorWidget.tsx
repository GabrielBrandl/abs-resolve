import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { leadsApi, solicitacaoApi } from '../services/modules.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../types';
import { gtmPush } from '../utils/gtm';

const STORAGE_KEY = 'abs-guided-selling';

interface Servico {
  slug: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  precoMinimo: number | null;
  precoTexto: string | null;
  tipoPreco: string;
  imagemUrl: string | null;
}

interface Pergunta {
  id: string;
  titulo: string;
  opcoes: Array<{ id: string; label: string }>;
  showIf?: { perguntaId: string; opcaoIds: string[] };
}

interface Mensagem {
  id: string;
  autor: 'abs' | 'cliente';
  texto: string;
}

type Etapa =
  | 'nome'
  | 'email'
  | 'telefone'
  | 'problema'
  | 'servico'
  | 'perguntas'
  | 'orcamento';

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function perguntasVisiveis(perguntas: Pergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const valor = respostas[p.showIf.perguntaId];
    return !!valor && p.showIf.opcaoIds.includes(valor);
  });
}

function sugerirServicos(servicos: Servico[], problema: string) {
  const ignoradas = new Set([
    'uma', 'com', 'para', 'que', 'esta', 'meu', 'minha', 'nao', 'por', 'de', 'do', 'da', 'em',
  ]);
  const termos = normalizar(problema)
    .split(/\W+/)
    .filter((t) => t.length > 2 && !ignoradas.has(t));

  return servicos
    .map((servico) => {
      const texto = normalizar(`${servico.nome} ${servico.categoria} ${servico.descricao || ''}`);
      let pontos = termos.reduce((total, termo) => total + (texto.includes(termo) ? 3 : 0), 0);
      const atalhos: Array<[RegExp, string[]]> = [
        [/tomad|energia|eletric|esquent|faisc/, ['tomada', 'interruptor', 'disjuntor']],
        [/chuveir/, ['chuveiro']],
        [/vazament|torneir|registro|agua/, ['torneira', 'registro', 'vazamento']],
        [/entupid|pia|vaso/, ['desentupimento']],
        [/ar condicionado|ar-condicionado|split|refriger/, ['ar-split']],
        [/move|guarda roupa|guarda-roupa/, ['montagem']],
        [/tv|televis/, ['suporte-tv']],
        [/jardim|poda|arvore|grama/, ['jardim']],
        [/limpeza|obra|sujeira/, ['limpeza']],
      ];
      for (const [regex, slugs] of atalhos) {
        if (regex.test(normalizar(problema)) && slugs.some((parte) => servico.slug.includes(parte))) pontos += 8;
      }
      return { servico, pontos };
    })
    .sort((a, b) => b.pontos - a.pontos)
    .filter((item, index) => item.pontos > 0 || index < 4)
    .slice(0, 4)
    .map((item) => item.servico);
}

export function HelpConsultorWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('nome');
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [contato, setContato] = useState({ nome: '', email: '', telefone: '' });
  const [consentimento, setConsentimento] = useState(false);
  const [problema, setProblema] = useState('');
  const [catalogo, setCatalogo] = useState<Servico[]>([]);
  const [servico, setServico] = useState<Servico | null>(null);
  const [fluxo, setFluxo] = useState<{ perguntas: Pergunta[] } | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [preco, setPreco] = useState<{
    preco: number;
    breakdown: Array<{ label: string; valor: number }>;
    requerValidacaoTecnica: boolean;
    mensagemValidacao?: string;
  } | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: 'boas-vindas',
      autor: 'abs',
      texto: 'Olá! Sou o consultor virtual da ABS Resolve. Para começar, qual é o seu nome?',
    },
  ]);

  useEffect(() => {
    solicitacaoApi
      .catalogo()
      .then((data) => {
        setCatalogo(
          data.categorias
            .flatMap((categoria) => categoria.servicos)
            .filter((item) => item.tipoPreco !== 'sob_orcamento')
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener('abs:abrir-consultor', abrir);
    return () => window.removeEventListener('abs:abrir-consultor', abrir);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, aberto, etapa]);

  const visiveis = useMemo(
    () => (fluxo ? perguntasVisiveis(fluxo.perguntas, respostas) : []),
    [fluxo, respostas]
  );
  const perguntaAtual = visiveis.find((p) => !respostas[p.id]) || null;
  const sugestoes = useMemo(() => sugerirServicos(catalogo, problema), [catalogo, problema]);

  const adicionarMensagem = (autor: Mensagem['autor'], texto: string) => {
    setMensagens((atuais) => [
      ...atuais,
      { id: `${autor}-${Date.now()}-${Math.random()}`, autor, texto },
    ]);
  };

  const avancarContato = async (event: FormEvent) => {
    event.preventDefault();
    const valor = entrada.trim();
    if (!valor) return;

    if (etapa === 'nome') {
      if (valor.length < 2) return;
      setContato((atual) => ({ ...atual, nome: valor }));
      adicionarMensagem('cliente', valor);
      setEntrada('');
      setEtapa('email');
      setTimeout(() => adicionarMensagem('abs', `Prazer, ${valor}! Qual é o seu e-mail?`), 200);
      return;
    }

    if (etapa === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
        adicionarMensagem('abs', 'Digite um e-mail válido, por exemplo: nome@gmail.com.');
        return;
      }
      setContato((atual) => ({ ...atual, email: valor.toLowerCase() }));
      adicionarMensagem('cliente', valor);
      setEntrada('');
      setEtapa('telefone');
      setTimeout(() => adicionarMensagem('abs', 'Qual é o seu telefone ou WhatsApp com DDD?'), 200);
      return;
    }

    if (etapa === 'telefone') {
      const telefone = valor.replace(/\D/g, '');
      if (telefone.length < 10 || telefone.length > 13) {
        adicionarMensagem('abs', 'Informe um telefone válido com DDD.');
        return;
      }
      setContato((atual) => ({ ...atual, telefone }));
      adicionarMensagem('cliente', valor);
      setEntrada('');
      setEtapa('problema');
      setTimeout(
        () => adicionarMensagem('abs', 'Agora me conte: o que aconteceu e onde está o problema?'),
        200
      );
      return;
    }

    if (etapa === 'problema') {
      if (valor.length < 5) {
        adicionarMensagem('abs', 'Conte um pouco mais para eu indicar o serviço correto.');
        return;
      }
      setProblema(valor);
      adicionarMensagem('cliente', valor);
      setEntrada('');
      setEnviando(true);
      try {
        await leadsApi.capturarConsultor({
          ...contato,
          problema: valor,
          consentimento,
        });
        setEtapa('servico');
        setTimeout(
          () => adicionarMensagem('abs', 'Entendi. Estes são os serviços mais indicados. Qual combina com o seu caso?'),
          200
        );
        gtmPush('consultor_contato_capturado', { origem: 'botao_flutuante' });
      } catch (erro) {
        adicionarMensagem(
          'abs',
          erro instanceof Error ? erro.message : 'Não consegui salvar seus dados. Tente novamente.'
        );
      } finally {
        setEnviando(false);
      }
    }
  };

  const escolherServico = async (item: Servico) => {
    setServico(item);
    setRespostas({});
    setPreco(null);
    adicionarMensagem('cliente', item.nome);
    setEnviando(true);
    try {
      const resultado = await solicitacaoApi.fluxo(item.slug);
      setFluxo(resultado);
      setEtapa('perguntas');
      void leadsApi.capturarConsultor({
        ...contato,
        problema,
        servico: item.nome,
        consentimento,
      }).catch(() => undefined);

      if (resultado.perguntas.length) {
        setTimeout(() => adicionarMensagem('abs', `Perfeito. ${resultado.perguntas[0].titulo}`), 200);
      }
      gtmPush('consultor_servico_selecionado', {
        servico_slug: item.slug,
        servico_nome: item.nome,
        valor: item.precoMinimo || 0,
        currency: 'BRL',
      });
    } catch (erro) {
      adicionarMensagem('abs', erro instanceof Error ? erro.message : 'Não consegui abrir este serviço.');
      setEtapa('servico');
    } finally {
      setEnviando(false);
    }
  };

  const calcularOrcamento = async (respostasFinais: Record<string, string>) => {
    if (!servico) return;
    setEnviando(true);
    try {
      const resultado = await solicitacaoApi.calcularPreco({
        slug: servico.slug,
        respostas: respostasFinais,
        quantidade: 1,
      });
      setPreco(resultado);
      setEtapa('orcamento');
      adicionarMensagem(
        'abs',
        resultado.requerValidacaoTecnica
          ? resultado.mensagemValidacao ||
              'Este caso precisa de validação técnica da ABS antes de fechar o orçamento.'
          : `Pronto! O valor estimado é ${formatCurrency(resultado.preco)}. Posso te levar para finalizar o pagamento e escolher o horário?`
      );
      gtmPush('consultor_orcamento_calculado', {
        servico_slug: servico.slug,
        servico_nome: servico.nome,
        value: resultado.preco,
        valor: resultado.preco,
        currency: 'BRL',
      });
    } catch (erro) {
      adicionarMensagem('abs', erro instanceof Error ? erro.message : 'Não consegui calcular o orçamento.');
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    if (etapa === 'perguntas' && fluxo && fluxo.perguntas.length === 0 && !preco && !enviando) {
      void calcularOrcamento({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, fluxo, enviando, preco]);

  const responder = (opcao: { id: string; label: string }) => {
    if (!perguntaAtual || !fluxo) return;
    adicionarMensagem('cliente', opcao.label);
    const novas = { ...respostas, [perguntaAtual.id]: opcao.id };
    setRespostas(novas);
    const proxima = perguntasVisiveis(fluxo.perguntas, novas).find((p) => !novas[p.id]);
    if (proxima) {
      setTimeout(() => adicionarMensagem('abs', proxima.titulo), 200);
    } else {
      void calcularOrcamento(novas);
    }
  };

  const continuar = (destino: 'login' | 'cadastro') => {
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
    setAberto(false);
    gtmPush('consultor_finalizar_agendamento', {
      servico_slug: servico.slug,
      servico_nome: servico.nome,
      value: preco?.preco || 0,
      valor: preco?.preco || 0,
      currency: 'BRL',
    });
    if (user?.role === 'cliente') {
      navigate('/cliente/agendar?assistente=1');
    } else {
      navigate(destino === 'login' ? '/login?assistente=1' : '/cadastro?assistente=1');
    }
  };

  const reiniciar = () => {
    setEtapa('nome');
    setEntrada('');
    setContato({ nome: '', email: '', telefone: '' });
    setConsentimento(false);
    setProblema('');
    setServico(null);
    setFluxo(null);
    setRespostas({});
    setPreco(null);
    setMensagens([
      {
        id: `reinicio-${Date.now()}`,
        autor: 'abs',
        texto: 'Vamos começar de novo. Qual é o seu nome?',
      },
    ]);
  };

  const etapaComTexto = ['nome', 'email', 'telefone', 'problema'].includes(etapa);
  const placeholder: Record<string, string> = {
    nome: 'Digite seu nome',
    email: 'Digite seu e-mail',
    telefone: '(11) 99999-9999',
    problema: 'Ex.: Minha tomada está esquentando...',
  };

  if (authLoading || (user && user.role !== 'cliente')) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[70] md:bottom-6 md:right-6">
      {aberto && (
        <section
          className="mb-3 flex h-[min(620px,75vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          aria-label="Consultor virtual ABS Resolve"
        >
          <header className="flex items-center justify-between bg-primary-700 px-4 py-3 text-white">
            <div>
              <p className="font-bold">Consultor ABS</p>
              <p className="text-xs text-white/75">Orçamento guiado em poucos minutos</p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-lg px-2 py-1 text-xl hover:bg-white/10"
              aria-label="Fechar consultor"
            >
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`flex ${mensagem.autor === 'cliente' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm ${
                    mensagem.autor === 'cliente'
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {mensagem.texto}
                </p>
              </div>
            ))}

            {etapa === 'servico' && (
              <div className="space-y-2">
                {sugestoes.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    disabled={enviando}
                    onClick={() => escolherServico(item)}
                    className="block w-full rounded-xl border border-primary-200 bg-white p-3 text-left text-sm hover:bg-primary-50"
                  >
                    <strong className="block text-primary-800">{item.nome}</strong>
                    <span className="text-xs text-slate-500">{item.precoTexto || 'Preço calculado pelas respostas'}</span>
                  </button>
                ))}
              </div>
            )}

            {etapa === 'perguntas' && perguntaAtual && (
              <div className="flex flex-wrap gap-2">
                {perguntaAtual.opcoes.map((opcao) => (
                  <button
                    key={opcao.id}
                    type="button"
                    disabled={enviando}
                    onClick={() => responder(opcao)}
                    className="rounded-full border border-primary-300 bg-white px-3 py-2 text-sm font-medium text-primary-800 hover:bg-primary-50"
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>
            )}

            {etapa === 'orcamento' && preco && (
              <div className="space-y-2 rounded-xl border border-primary-100 bg-white p-3">
                {!preco.requerValidacaoTecnica && (
                  <>
                    <p className="text-xl font-bold text-primary-800">{formatCurrency(preco.preco)}</p>
                    {preco.breakdown.map((item, index) => (
                      <p key={index} className="flex justify-between text-xs text-slate-500">
                        <span>{item.label}</span>
                        <span>{formatCurrency(item.valor)}</span>
                      </p>
                    ))}
                    {user?.role === 'cliente' ? (
                      <button
                        type="button"
                        onClick={() => continuar('cadastro')}
                        className="w-full rounded-lg bg-accent-500 px-3 py-2 font-semibold text-primary-900"
                      >
                        Finalizar e agendar
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => continuar('login')}
                          className="rounded-lg border border-primary-300 px-3 py-2 text-sm font-semibold text-primary-700"
                        >
                          Já sou cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => continuar('cadastro')}
                          className="rounded-lg bg-accent-500 px-3 py-2 text-sm font-semibold text-primary-900"
                        >
                          Criar conta
                        </button>
                      </div>
                    )}
                  </>
                )}
                <button type="button" onClick={reiniciar} className="w-full text-xs text-slate-500 underline">
                  Iniciar nova conversa
                </button>
              </div>
            )}

            {enviando && <p className="text-xs text-slate-500">Consultando...</p>}
            <div ref={bottomRef} />
          </div>

          {etapaComTexto && (
            <form onSubmit={avancarContato} className="border-t bg-white p-3">
              {etapa === 'problema' && (
                <label className="mb-2 flex items-start gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={consentimento}
                    onChange={(event) => setConsentimento(event.target.checked)}
                    className="mt-0.5"
                  />
                  Autorizo a ABS Resolve a usar estes dados para entrar em contato sobre este atendimento.
                </label>
              )}
              <div className="flex gap-2">
                <input
                  value={entrada}
                  onChange={(event) => setEntrada(event.target.value)}
                  type={etapa === 'email' ? 'email' : etapa === 'telefone' ? 'tel' : 'text'}
                  placeholder={placeholder[etapa]}
                  maxLength={etapa === 'problema' ? 500 : 120}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={enviando || !entrada.trim() || (etapa === 'problema' && !consentimento)}
                  className="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                  aria-label="Enviar resposta"
                >
                  ➤
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setAberto((atual) => !atual);
          gtmPush('consultor_flutuante_aberto', { pagina: location.pathname });
        }}
        className="ml-auto flex h-14 items-center gap-2 rounded-full bg-accent-500 px-4 font-bold text-primary-900 shadow-xl ring-4 ring-white/70 transition hover:scale-105"
        aria-label={aberto ? 'Fechar ajuda' : 'Abrir ajuda e orçamento'}
      >
        <span className="text-xl">{aberto ? '×' : '💬'}</span>
        {!aberto && <span className="hidden sm:inline">Precisa de ajuda?</span>}
      </button>
    </div>
  );
}
