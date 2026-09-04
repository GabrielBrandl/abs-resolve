import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { Breadcrumb, Stars, TrustStrip, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { addToCart } from '../../store/cartStore';
import { solicitacaoApi } from '../../services/modules.service';
import { funil } from '../../utils/gtm';
import {
  findService,
  frequentlyTogether,
  fotoServico,
  money,
  toMoneyNumber,
  relatedSameCategory,
  type ServicoLoja,
} from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { findPeca, isPecaSlug, itemPath, pecasDoServico } from '../../storefront/pecas';
import { totalComDescontoAPartirDaSegunda, DESCONTO_SEGUNDA_UNIDADE_PERCENT } from '../../utils/desconto-quantidade';

type FluxoPergunta = {
  id: string;
  titulo: string;
  opcoes: Array<{ id: string; label: string }>;
  showIf?: { perguntaId: string; opcaoIds: string[] };
};

type Fluxo = { perguntas?: FluxoPergunta[] };

type MaterialVariante = {
  sku: string;
  cor: string;
  labelCor: string;
  preco: number;
  imagemUrl: string;
  disponivel: number;
  ativo: boolean;
  disponivelParaCompra: boolean;
};

type MaterialModelo = {
  id: string;
  tipo: string;
  nome: string;
  detalhe: string | null;
  variantes: MaterialVariante[];
  disponivelParaCompra: boolean;
};

type MateriaisVitrine = {
  servicoSlug: string;
  perguntaPossuiId: string;
  opcoesComprarAbs: string[];
  perguntaTipoId: string | null;
  labelProduto: string;
  tipos: Array<{ id: string; label: string }>;
  modelos: MaterialModelo[];
};

type PrecoCalc = {
  preco: number;
  breakdown: Array<{ label: string; valor: number }>;
  valorServico?: number;
  valorPeca?: number;
  descontoQuantidade?: number;
  pecaSlug?: string;
  pecaNome?: string;
  quantidade?: number;
};

const INCLUSOS_PADRAO = [
  'Remoção do item antigo',
  'Instalação',
  'Teste de funcionamento',
  'Profissional identificado',
  'Garantia de 90 dias',
];

function perguntasVisiveis(perguntas: FluxoPergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    return val != null && p.showIf.opcaoIds.includes(val);
  });
}

function isPerguntaQuantidade(p: FluxoPergunta) {
  return p.id === 'quantidade' || /quantidad/i.test(p.titulo);
}

function isFornecimento(p: FluxoPergunta) {
  return /fornecimento|fornecer|já possui|já comprou|comprado/i.test(p.id + p.titulo);
}

function pecaPreviewParaOpcao(slug: string, respostas: Record<string, string>, opcaoId: string) {
  if (opcaoId === 'cliente' || opcaoId === 'sim') return null;
  if (!['abs', 'abs-padrao', 'abs-premium', 'nao', 'nao-abs'].includes(opcaoId)) return null;

  const tipo =
    respostas.tipoTomada ||
    respostas.tipoInterruptor ||
    respostas.tipoTorneira ||
    '';

  const mapa: Record<string, Record<string, string>> = {
    'troca-tomada': {
      simples: 'peca-tomada-simples',
      dupla: 'peca-tomada-dupla',
      'tomada-20a': 'peca-tomada-20a',
      'dupla-20a': 'peca-tomada-20a',
    },
    'troca-interruptor': {
      simples: 'peca-interruptor-simples',
      duplo: 'peca-interruptor-duplo',
      paralelo: 'peca-interruptor-paralelo',
    },
  };
  const pecaSlug = mapa[slug]?.[tipo];
  return pecaSlug ? findPeca(pecaSlug) : null;
}

function VisitUpsellCompact({ servicos }: { servicos: ServicoLoja[] }) {
  const navigate = useNavigate();
  if (!servicos.length) return null;
  return (
    <div className="rounded-[12px] border border-[#e6e8ee] bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-[#002d62]">Aproveite a visita e resolva mais!</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Adicione outros serviços no mesmo atendimento.</p>
      <ul className="mt-3 space-y-2">
        {servicos.slice(0, 4).map((s) => (
          <li key={s.slug} className="flex items-center gap-2">
            <img src={fotoServico(s)} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#111827]">{s.nome}</p>
              <p className="text-[11px] font-semibold text-[#002d62]">
                {s.precoMinimo ? `A partir de ${money(s.precoMinimo)}` : s.precoTexto}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Adicionar ${s.nome}`}
              onClick={() => {
                if (s.tipoPreco === 'sob_orcamento') {
                  navigate(itemPath(s));
                  return;
                }
                addToCart({
                  slug: s.slug,
                  nome: s.nome,
                  categoria: s.categoria,
                  precoMinimo: s.precoMinimo,
                  precoTexto: s.precoTexto || '',
                  tipoPreco: s.tipoPreco || 'fixo',
                  imagemUrl: s.imagemUrl,
                  tipo: 'servico',
                });
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#002d62] text-lg font-black text-[#002d62]"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ServicePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const servico = findService(categorias, slug);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [materiaisCfg, setMateriaisCfg] = useState<MateriaisVitrine | null>(null);
  const [modelos, setModelos] = useState<MaterialModelo[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [precoCalc, setPrecoCalc] = useState<PrecoCalc | null>(null);
  const [erroPerguntas, setErroPerguntas] = useState('');
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [skuSel, setSkuSel] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setRespostas({});
    setQty(1);
    setModeloId(null);
    setSkuSel(null);
    solicitacaoApi.fluxo(slug).then((d) => setFluxo(d as Fluxo)).catch(() => setFluxo(null));
    solicitacaoApi
      .materiais(slug)
      .then((d) => setMateriaisCfg(d as MateriaisVitrine | null))
      .catch(() => setMateriaisCfg(null));
  }, [slug]);

  const perguntasBasicas = useMemo(() => {
    const all = fluxo?.perguntas || [];
    return materiaisCfg ? all.slice(0, 8) : all.slice(0, 6);
  }, [fluxo?.perguntas, materiaisCfg]);

  const visiveis = useMemo(
    () => perguntasVisiveis(perguntasBasicas, respostas),
    [perguntasBasicas, respostas]
  );

  const precisaMaterial = Boolean(
    materiaisCfg &&
      materiaisCfg.opcoesComprarAbs.includes(respostas[materiaisCfg.perguntaPossuiId] || '')
  );

  const tipoMaterial =
    materiaisCfg?.perguntaTipoId ? respostas[materiaisCfg.perguntaTipoId] || '' : '';

  useEffect(() => {
    if (!slug || !precisaMaterial || !materiaisCfg) {
      setModelos([]);
      return;
    }
    const tipo = materiaisCfg.perguntaTipoId ? tipoMaterial : undefined;
    if (materiaisCfg.perguntaTipoId && !tipo) {
      setModelos([]);
      return;
    }
    let cancelled = false;
    solicitacaoApi
      .materiais(slug, tipo)
      .then((d) => {
        if (cancelled || !d) return;
        setModelos((d as MateriaisVitrine).modelos || []);
      })
      .catch(() => {
        if (!cancelled) setModelos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, precisaMaterial, tipoMaterial, materiaisCfg]);

  useEffect(() => {
    setModeloId(null);
    setSkuSel(null);
  }, [precisaMaterial, tipoMaterial]);

  const modeloSel = useMemo(
    () => modelos.find((m) => m.id === modeloId) || null,
    [modelos, modeloId]
  );

  const varianteSel = useMemo(() => {
    if (!modeloSel) return null;
    if (skuSel) return modeloSel.variantes.find((v) => v.sku === skuSel) || null;
    return modeloSel.variantes.find((v) => v.disponivelParaCompra) || modeloSel.variantes[0] || null;
  }, [modeloSel, skuSel]);

  const materialOk = !precisaMaterial || Boolean(varianteSel?.disponivelParaCompra);

  const perguntasSemQty = visiveis.filter((p) => !isPerguntaQuantidade(p));
  const temPerguntaQty = visiveis.some(isPerguntaQuantidade);

  const todasRespondidas =
    (perguntasSemQty.length === 0 || perguntasSemQty.every((p) => Boolean(respostas[p.id]))) &&
    (!temPerguntaQty || qty >= 1) &&
    materialOk;

  // Mantém resposta de quantidade sincronizada com o stepper
  useEffect(() => {
    if (!temPerguntaQty) return;
    setRespostas((r) => (r.quantidade === String(qty) ? r : { ...r, quantidade: String(qty) }));
  }, [qty, temPerguntaQty]);

  useEffect(() => {
    if (!slug || !todasRespondidas || (perguntasSemQty.length === 0 && !temPerguntaQty)) {
      setPrecoCalc(null);
      return;
    }
    let cancelled = false;
    const respostasComQty = { ...respostas, ...(temPerguntaQty ? { quantidade: String(qty) } : {}) };
    solicitacaoApi
      .calcularPreco({ slug, respostas: respostasComQty, quantidade: qty })
      .then((r) => {
        if (!cancelled) setPrecoCalc(r as PrecoCalc);
      })
      .catch(() => {
        if (!cancelled) setPrecoCalc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, respostas, qty, todasRespondidas, perguntasSemQty.length, temPerguntaQty]);

  const price = toMoneyNumber(servico?.precoMinimo);
  const valorServico = toMoneyNumber(
    precoCalc?.valorServico != null
      ? precoCalc.valorServico
      : precoCalc
        ? Math.max(0, toMoneyNumber(precoCalc.preco) - toMoneyNumber(precoCalc.valorPeca))
        : price
  );
  const valorPecaCatalogo = toMoneyNumber(
    precoCalc?.valorPeca != null
      ? precoCalc.valorPeca
      : precisaMaterial && varianteSel?.disponivelParaCompra
        ? totalComDescontoAPartirDaSegunda(
            toMoneyNumber(varianteSel.preco),
            qty,
            DESCONTO_SEGUNDA_UNIDADE_PERCENT
          ).total
        : 0
  );
  const total = toMoneyNumber(
    (() => {
      const base =
        precoCalc?.preco != null ? toMoneyNumber(precoCalc.preco) : valorServico + valorPecaCatalogo;
      // Materiais (torneira/chuveiro) não entram no cálculo do fluxo — somar à parte (com desconto 2ª+)
      const materialExtra =
        precoCalc?.preco != null &&
        precisaMaterial &&
        varianteSel?.disponivelParaCompra &&
        !(toMoneyNumber(precoCalc.valorPeca) > 0)
          ? totalComDescontoAPartirDaSegunda(
              toMoneyNumber(varianteSel.preco),
              qty,
              DESCONTO_SEGUNDA_UNIDADE_PERCENT
            ).total
          : 0;
      return base + materialExtra;
    })()
  );
  const descontoQtd = toMoneyNumber(
    (() => {
      const api = toMoneyNumber(precoCalc?.descontoQuantidade);
      if (api > 0) return api;
      if (precisaMaterial && varianteSel?.disponivelParaCompra && qty > 1) {
        return totalComDescontoAPartirDaSegunda(
          toMoneyNumber(varianteSel.preco),
          qty,
          DESCONTO_SEGUNDA_UNIDADE_PERCENT
        ).economia;
      }
      return 0;
    })()
  );

  const together = useMemo(() => frequentlyTogether(categorias, slug, 4), [categorias, slug]);
  const sameCategory = useMemo(() => relatedSameCategory(categorias, slug, 4), [categorias, slug]);
  const pecas = useMemo(() => pecasDoServico(slug).slice(0, 4), [slug]);

  const inclusos = useMemo(() => {
    const base = [...INCLUSOS_PADRAO];
    if (servico?.descricao?.toLowerCase().includes('fornecimento')) {
      base.unshift('Fornecimento da peça padrão (se escolher ABS)');
    }
    return base;
  }, [servico?.descricao]);

  useEffect(() => {
    if (!servico) return;
    funil.visualizouServico({
      slug: servico.slug,
      nome: servico.nome,
      categoria: servico.categoria,
    });
  }, [servico?.slug]);

  if (loading) return <Loading />;
  if (isPecaSlug(slug)) return <Navigate to={`/p/${slug}`} replace />;
  if (!servico) {
    return (
      <div>
        <h1 className="text-xl font-bold">Serviço não encontrado</h1>
        <Link to="/" className="mt-3 inline-block text-primary-700">Voltar à loja</Link>
      </div>
    );
  }

  const escolherResposta = (perguntaId: string, opcaoId: string) => {
    setErroPerguntas('');
    setRespostas((r) => ({ ...r, [perguntaId]: opcaoId }));
  };

  const setQuantidadeLivre = (n: number) => {
    const next = Math.max(1, Math.min(99, Math.floor(n) || 1));
    setQty(next);
    setErroPerguntas('');
  };

  const selecionarModelo = (m: MaterialModelo) => {
    setErroPerguntas('');
    setModeloId(m.id);
    const preferida = m.variantes.find((v) => v.disponivelParaCompra) || m.variantes[0];
    setSkuSel(preferida?.sku || null);
  };

  const addItems = () => {
    const respostasServico: Record<string, string> = {
      ...respostas,
      ...(temPerguntaQty ? { quantidade: String(qty) } : {}),
    };
    if (varianteSel && precisaMaterial) {
      respostasServico.materialSku = varianteSel.sku;
      respostasServico.materialCor = varianteSel.labelCor;
      respostasServico.materialModeloId = modeloSel?.id || '';
    }

    // Serviço entra 1× com o valor da mão de obra (+ extras), sem multiplicar pela qtd de peças
    addToCart(
      {
        slug: servico.slug,
        nome: servico.nome,
        categoria: servico.categoria,
        precoMinimo: valorServico,
        precoTexto: servico.precoTexto || '',
        tipoPreco: servico.tipoPreco || 'fixo',
        imagemUrl: servico.imagemUrl,
        tipo: 'servico',
        respostas: Object.keys(respostasServico).length ? respostasServico : undefined,
        cartKey: `svc:${servico.slug}`,
      },
      1
    );

    // Peça do catálogo (tomada/interruptor via ABS) — multiplica pela quantidade
    if (precoCalc?.pecaSlug && toMoneyNumber(precoCalc.valorPeca) > 0) {
      const peca = findPeca(precoCalc.pecaSlug);
      if (peca) {
        addToCart(
          {
            slug: peca.slug,
            nome: peca.nome,
            categoria: peca.categoria,
            precoMinimo: toMoneyNumber(peca.precoMinimo),
            precoTexto: peca.precoTexto,
            tipoPreco: 'fixo',
            imagemUrl: peca.imagemUrl,
            tipo: 'peca',
            servicoRelacionado: servico.slug,
            cartKey: `peca:${peca.slug}:${servico.slug}`,
          },
          qty
        );
      }
    }

    // Material visual (torneira/chuveiro)
    if (precisaMaterial && varianteSel && modeloSel) {
      addToCart(
        {
          slug: varianteSel.sku,
          nome: `${modeloSel.nome} — ${varianteSel.labelCor}`,
          categoria: servico.categoria,
          precoMinimo: toMoneyNumber(varianteSel.preco),
          precoTexto: money(varianteSel.preco),
          tipoPreco: 'fixo',
          imagemUrl: varianteSel.imagemUrl,
          tipo: 'peca',
          servicoRelacionado: servico.slug,
          materialSku: varianteSel.sku,
          materialCor: varianteSel.labelCor,
          materialModeloId: modeloSel.id,
          cartKey: `mat:${varianteSel.sku}`,
        },
        qty
      );
    }
  };

  const putInCart = () => {
    if (precisaMaterial && !varianteSel?.disponivelParaCompra) {
      setErroPerguntas(`Selecione um(a) ${materiaisCfg?.labelProduto || 'produto'} disponível`);
      document.getElementById('resumo-servico')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const faltando = perguntasSemQty.find((p) => !respostas[p.id]);
    if (faltando) {
      setErroPerguntas(`Responda: ${faltando.titulo}`);
      document.getElementById('resumo-servico')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (temPerguntaQty && qty < 1) {
      setErroPerguntas('Informe a quantidade');
      return;
    }
    setErroPerguntas('');
    addItems();
  };

  const goCart = () => {
    putInCart();
    if (precisaMaterial && !varianteSel?.disponivelParaCompra) return;
    const faltando = perguntasSemQty.find((p) => !respostas[p.id]);
    if (faltando) return;
    funil.clicouComprarAgendar({
      slug: servico.slug,
      nome: servico.nome,
      origem: 'pagina_servico',
      valor: total || undefined,
    });
    navigate('/carrinho');
  };

  return (
    <div className="pb-24 lg:pb-0">
      <Breadcrumb
        items={[
          { label: 'Início', to: '/' },
          { label: servico.categoriaNome || 'Serviços', to: `/c/${servico.categoria}` },
          { label: servico.nome },
        ]}
      />

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.05fr_1fr_21rem]">
        <div className="overflow-hidden rounded-[12px] bg-white shadow-sm">
          <img
            src={
              precisaMaterial && varianteSel
                ? varianteSel.imagemUrl
                : `${fotoServico(servico)}${fotoServico(servico).includes('?') ? '&' : '?'}v=3`
            }
            alt={servico.nome}
            className="h-[280px] w-full object-cover object-center"
          />
          <TrustStrip garantiaDias={servico.garantiaDias || 90} />
        </div>

        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#002d62]">{servico.categoriaNome}</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight text-[#111827]">{servico.nome}</h1>
          <Stars value={4.9} count={186} />
          <div className="mt-4 rounded-[10px] border border-[#e6e8ee] bg-[#f8fafc] p-4">
            <p className="text-xs text-slate-500">A partir de</p>
            <p className="text-[32px] font-black text-[#002d62]">
              {money(valorServico || servico.precoMinimo || 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Mão de obra (peças à parte, se escolher ABS)</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{servico.descricao}</p>

          <div className="mt-5 rounded-[12px] border border-[#e6e8ee] bg-white p-4">
            <p className="text-sm font-black text-[#111827]">O que está incluso no serviço</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {inclusos.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 space-y-5">
            {visiveis.map((p, idx) => {
              if (isPerguntaQuantidade(p)) {
                return (
                  <div key={p.id}>
                    <p className="mb-2 text-sm font-bold text-[#002d62]">
                      {idx + 1}. {p.titulo}
                    </p>
                    <div className="flex w-fit items-center overflow-hidden rounded-lg border border-[#d5d9e2] bg-white">
                      <button
                        type="button"
                        className="h-11 w-11 text-xl font-bold"
                        onClick={() => setQuantidadeLivre(qty - 1)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={qty}
                        onChange={(e) => setQuantidadeLivre(Number(e.target.value))}
                        className="h-11 w-14 border-x border-[#d5d9e2] text-center text-base font-black outline-none"
                      />
                      <button
                        type="button"
                        className="h-11 w-11 text-xl font-bold"
                        onClick={() => setQuantidadeLivre(qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      A partir da 2ª unidade: {DESCONTO_SEGUNDA_UNIDADE_PERCENT}% de desconto na mão de obra e nas
                      peças/materiais.
                    </p>
                  </div>
                );
              }

              return (
                <div key={p.id}>
                  <p className="mb-2 text-sm font-bold text-[#002d62]">
                    {idx + 1}. {p.titulo}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {p.opcoes.map((o) => {
                      const pecaHint =
                        isFornecimento(p) && slug
                          ? pecaPreviewParaOpcao(slug, respostas, o.id)
                          : null;
                      const precoOpcao =
                        o.id === 'cliente' || o.id === 'sim'
                          ? 0
                          : pecaHint
                            ? pecaHint.precoMinimo * qty
                            : null;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => escolherResposta(p.id, o.id)}
                          className={`min-w-[7.5rem] rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
                            respostas[p.id] === o.id
                              ? 'border-[#002d62] bg-[#e8f0ff] text-[#002d62]'
                              : 'border-slate-200 bg-white hover:border-[#002d62]/40'
                          }`}
                        >
                          <span className="block">{o.label}</span>
                          {isFornecimento(p) && precoOpcao != null && (
                            <span className="mt-1 block text-xs font-bold text-slate-500">
                              {precoOpcao === 0
                                ? '+ R$ 0,00'
                                : `+ ${money(pecaHint!.precoMinimo)} / un. · ${money(precoOpcao)}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {precisaMaterial &&
                    materiaisCfg?.perguntaTipoId === p.id &&
                    respostas[p.id] && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-bold text-[#002d62]">
                          Escolha {materiaisCfg.labelProduto.toLowerCase()}
                        </p>
                        {modelos.length === 0 ? (
                          <p className="text-sm text-slate-500">Carregando modelos…</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {modelos.map((m) => {
                              const v =
                                m.id === modeloId && varianteSel
                                  ? varianteSel
                                  : m.variantes.find((x) => x.disponivelParaCompra) || m.variantes[0];
                              const selected = modeloId === m.id;
                              const indisponivel = !m.disponivelParaCompra;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  disabled={indisponivel}
                                  onClick={() => selecionarModelo(m)}
                                  className={`rounded-xl border p-3 text-left transition ${
                                    selected
                                      ? 'border-[#002d62] bg-[#e8f0ff] ring-2 ring-[#002d62]/30'
                                      : indisponivel
                                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                                        : 'border-slate-200 bg-white hover:border-[#002d62]/40'
                                  }`}
                                >
                                  <img
                                    src={v?.imagemUrl}
                                    alt={m.nome}
                                    className="mb-2 h-28 w-full rounded-lg object-cover"
                                  />
                                  <p className="text-sm font-black text-[#111827]">{m.nome}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {(v?.labelCor || '') + (m.detalhe ? ` • ${m.detalhe}` : '')}
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-[#002d62]">
                                    {indisponivel ? 'Indisponível' : `+ ${money(v?.preco || 0)}`}
                                  </p>
                                  {selected && !indisponivel && (
                                    <p className="mt-1 text-[11px] font-bold uppercase text-emerald-700">
                                      Selecionado
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {modeloSel && modeloSel.variantes.length > 1 && (
                          <div className="mt-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                              Cor / acabamento
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {modeloSel.variantes.map((v) => (
                                <button
                                  key={v.sku}
                                  type="button"
                                  disabled={!v.disponivelParaCompra}
                                  onClick={() => setSkuSel(v.sku)}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    varianteSel?.sku === v.sku
                                      ? 'border-[#002d62] bg-[#002d62] text-white'
                                      : !v.disponivelParaCompra
                                        ? 'cursor-not-allowed border-slate-100 text-slate-400 line-through'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#002d62]'
                                  }`}
                                >
                                  {v.labelCor}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}

            {visiveis.length === 0 && (
              <div>
                <p className="mb-2 text-sm font-bold">Quantidade</p>
                <div className="flex w-fit items-center overflow-hidden rounded-md border border-[#d5d9e2]">
                  <button type="button" className="h-9 w-9" onClick={() => setQuantidadeLivre(qty - 1)}>−</button>
                  <span className="w-8 text-center font-black">{qty}</span>
                  <button type="button" className="h-9 w-9" onClick={() => setQuantidadeLivre(qty + 1)}>+</button>
                </div>
              </div>
            )}
            {erroPerguntas && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroPerguntas}</p>
            )}
          </div>
        </div>

        {/* Coluna sticky: visita + resumo — aproveita a área ociosa e fica sempre à vista */}
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <VisitUpsellCompact servicos={together} />

          <div id="resumo-servico" className="rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#002d62]">Resumo do serviço</p>
              {visiveis.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-bold text-[#1d4ed8]"
                  onClick={() => {
                    setRespostas({});
                    setQty(1);
                    setModeloId(null);
                    setSkuSel(null);
                    setErroPerguntas('');
                  }}
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2 border-b border-slate-100 pb-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">
                  {servico.nome}{' '}
                  <span className="text-xs text-slate-400">
                    (mão de obra{qty > 1 ? ` · ${qty} un.` : ''})
                  </span>
                </span>
                <span className="text-right font-bold text-[#111827]">
                  {descontoQtd > 0 && (
                    <span className="mr-2 text-xs font-semibold text-slate-400 line-through">
                      {money(valorServico + descontoQtd)}
                    </span>
                  )}
                  {money(valorServico)}
                </span>
              </div>
              {descontoQtd > 0 && (
                <p className="text-xs font-semibold text-emerald-700">
                  Desconto a partir da 2ª unidade: −{money(descontoQtd)}
                </p>
              )}
              {valorPecaCatalogo > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    {precoCalc?.pecaNome || materiaisCfg?.labelProduto || 'Peça'}
                    <span className="block text-xs text-slate-400">× {qty} un.</span>
                  </span>
                  <span className="font-bold text-[#111827]">{money(valorPecaCatalogo)}</span>
                </div>
              )}
              {precisaMaterial && varianteSel && modeloSel && !(precoCalc?.valorPeca) && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">
                    {materiaisCfg?.labelProduto} {modeloSel.nome}
                    <span className="block text-xs text-slate-400">{varianteSel.labelCor} × {qty}</span>
                  </span>
                  <span className="font-bold text-[#111827]">
                    {money(
                      totalComDescontoAPartirDaSegunda(
                        toMoneyNumber(varianteSel.preco),
                        qty,
                        DESCONTO_SEGUNDA_UNIDADE_PERCENT
                      ).total
                    )}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-3 text-[13px] font-semibold text-slate-500">Total</p>
            <p className="text-[30px] font-black text-[#002d62]">{money(total)}</p>
            {erroPerguntas && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroPerguntas}</p>
            )}
            <YellowButton className="mt-4 w-full" onClick={goCart}>
              Comprar e agendar
            </YellowButton>
            <button
              type="button"
              onClick={putInCart}
              className="mt-2 w-full rounded-lg border-2 border-[#002d62] py-3 text-sm font-black uppercase text-[#002d62]"
            >
              Adicionar ao carrinho {total > 0 ? money(total) : ''}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">Sem cadastro obrigatório. Login só se você quiser.</p>
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-semibold text-[#002d62]">
              Precisa de algo diferente? Fale no WhatsApp
            </a>
          </div>
        </aside>
      </div>

      {pecas.length > 0 && (
        <RelatedRail
          title="Peças avulsas deste serviço"
          subtitle="Leve a peça agora e, se quiser, a instalação no mesmo pedido."
          servicos={pecas}
        />
      )}
      <RelatedRail
        title={`Mais da categoria ${servico.categoriaNome || ''}`}
        subtitle="Fica na mesma prateleira. Um clique e entra no pedido."
        servicos={sameCategory}
      />
    </div>
  );
}
