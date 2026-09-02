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
  relatedSameCategory,
} from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { isPecaSlug, pecasDoServico } from '../../storefront/pecas';

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

function perguntasVisiveis(perguntas: FluxoPergunta[], respostas: Record<string, string>) {
  return perguntas.filter((p) => {
    if (!p.showIf) return true;
    const val = respostas[p.showIf.perguntaId];
    return val != null && p.showIf.opcaoIds.includes(val);
  });
}

function quantidadeDaResposta(opcaoId: string) {
  if (opcaoId === 'mais-4' || opcaoId === '4-ou-mais' || opcaoId === '3-ou-mais') return 5;
  const n = Number(opcaoId);
  return Number.isFinite(n) && n > 0 ? n : 1;
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
  const [precoCalculado, setPrecoCalculado] = useState<number | null>(null);
  const [erroPerguntas, setErroPerguntas] = useState('');
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [skuSel, setSkuSel] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setRespostas({});
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
    // Com catálogo de material, mostra perguntas principais (até 8) para não cortar o fluxo
    return materiaisCfg ? all.slice(0, 8) : all.slice(0, 5);
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
    // Limpa seleção de material ao mudar tipo / “já tenho”
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

  const todasRespondidas =
    (visiveis.length === 0 || visiveis.every((p) => Boolean(respostas[p.id]))) && materialOk;

  useEffect(() => {
    if (!slug || !todasRespondidas || visiveis.length === 0) {
      setPrecoCalculado(null);
      return;
    }
    let cancelled = false;
    solicitacaoApi
      .calcularPreco({ slug, respostas, quantidade: qty })
      .then((r) => {
        if (!cancelled) setPrecoCalculado(Number(r.preco));
      })
      .catch(() => {
        if (!cancelled) setPrecoCalculado(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, respostas, qty, todasRespondidas, visiveis.length]);

  const price = servico?.precoMinimo || 0;
  const precoServico = precoCalculado ?? price;
  const precoPeca = precisaMaterial && varianteSel?.disponivelParaCompra ? varianteSel.preco : 0;
  const totalUnitario = precoServico + precoPeca;
  const together = useMemo(() => frequentlyTogether(categorias, slug, 4), [categorias, slug]);
  const sameCategory = useMemo(() => relatedSameCategory(categorias, slug, 4), [categorias, slug]);
  const pecas = useMemo(() => pecasDoServico(slug).slice(0, 4), [slug]);

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
    if (perguntaId === 'quantidade') {
      setQty(quantidadeDaResposta(opcaoId));
    }
  };

  const selecionarModelo = (m: MaterialModelo) => {
    setErroPerguntas('');
    setModeloId(m.id);
    const preferida = m.variantes.find((v) => v.disponivelParaCompra) || m.variantes[0];
    setSkuSel(preferida?.sku || null);
  };

  const selecionarCor = (sku: string) => {
    setErroPerguntas('');
    setSkuSel(sku);
  };

  const validarPerguntas = () => {
    if (visiveis.length > 0) {
      const faltando = visiveis.find((p) => !respostas[p.id]);
      if (faltando) {
        setErroPerguntas(`Responda: ${faltando.titulo}`);
        return false;
      }
    }
    if (precisaMaterial && !varianteSel?.disponivelParaCompra) {
      setErroPerguntas(`Selecione um(a) ${materiaisCfg?.labelProduto || 'produto'} disponível`);
      return false;
    }
    return true;
  };

  const addItems = () => {
    const respostasServico = { ...respostas };
    if (varianteSel && precisaMaterial) {
      respostasServico.materialSku = varianteSel.sku;
      respostasServico.materialCor = varianteSel.labelCor;
      respostasServico.materialModeloId = modeloSel?.id || '';
    }
    addToCart(
      {
        slug: servico.slug,
        nome: servico.nome,
        categoria: servico.categoria,
        precoMinimo: precoServico,
        precoTexto: servico.precoTexto || '',
        tipoPreco: servico.tipoPreco || 'fixo',
        imagemUrl: servico.imagemUrl,
        tipo: 'servico',
        ...(visiveis.length > 0 ? { respostas: respostasServico } : {}),
      },
      qty
    );
    if (precisaMaterial && varianteSel && modeloSel) {
      addToCart(
        {
          slug: varianteSel.sku,
          nome: `${modeloSel.nome} — ${varianteSel.labelCor}`,
          categoria: servico.categoria,
          precoMinimo: varianteSel.preco,
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
    if (!validarPerguntas()) return;
    addItems();
  };

  const goCart = () => {
    if (!validarPerguntas()) return;
    funil.clicouComprarAgendar({
      slug: servico.slug,
      nome: servico.nome,
      origem: 'pagina_servico',
      valor: totalUnitario ? totalUnitario * qty : undefined,
    });
    addItems();
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

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.05fr_1fr_20rem]">
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
            <p className="text-xs text-slate-500">{visiveis.length > 0 ? 'A partir de' : 'Preço fixo'}</p>
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-[32px] font-black text-[#002d62]">
                {totalUnitario ? money(totalUnitario) : servico.precoTexto}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{servico.descricao}</p>

          <div className="mt-6 space-y-5">
            {visiveis.map((p, idx) => (
              <div key={p.id}>
                <p className="mb-2 text-sm font-bold text-[#002d62]">
                  {idx + 1}. {p.titulo}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.opcoes.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => escolherResposta(p.id, o.id)}
                      className={`min-w-[7rem] rounded-lg border px-3 py-3 text-left text-sm font-semibold ${
                        respostas[p.id] === o.id
                          ? 'border-[#002d62] bg-[#e8f0ff] text-[#002d62]'
                          : 'border-slate-200 bg-white hover:border-[#002d62]/40'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Catálogo de materiais logo após a pergunta de tipo, se já escolheu comprar com ABS */}
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
                                onClick={() => selecionarCor(v.sku)}
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
            ))}

            {visiveis.length === 0 && (
              <div>
                <p className="mb-2 text-sm font-bold">Quantidade</p>
                <div className="flex w-fit items-center overflow-hidden rounded-md border border-[#d5d9e2]">
                  <button type="button" className="h-9 w-9" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
                  <span className="w-8 text-center font-black">{qty}</span>
                  <button type="button" className="h-9 w-9" onClick={() => setQty((n) => n + 1)}>+</button>
                </div>
              </div>
            )}
            {erroPerguntas && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erroPerguntas}</p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#002d62]">Resumo do serviço</p>
            {visiveis.length > 0 && (
              <button
                type="button"
                className="text-xs font-bold text-[#1d4ed8]"
                onClick={() => {
                  setRespostas({});
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
              <span className="text-slate-600">{servico.nome}</span>
              <span className="font-bold text-[#111827]">{money(precoServico)}</span>
            </div>
            {precisaMaterial && varianteSel && modeloSel && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">
                  {materiaisCfg?.labelProduto} {modeloSel.nome}
                  <span className="block text-xs text-slate-400">{varianteSel.labelCor}</span>
                </span>
                <span className="font-bold text-[#111827]">{money(varianteSel.preco)}</span>
              </div>
            )}
          </div>

          <p className="mt-3 text-[13px] font-semibold text-slate-500">Total</p>
          <p className="text-[30px] font-black text-[#002d62]">
            {money(totalUnitario * qty)}
          </p>
          <YellowButton className="mt-4 w-full" onClick={goCart}>
            Comprar e agendar
          </YellowButton>
          <button
            type="button"
            onClick={putInCart}
            className="mt-2 w-full rounded-lg border-2 border-[#002d62] py-3 text-sm font-black uppercase text-[#002d62]"
          >
            Adicionar ao carrinho
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-500">Sem cadastro obrigatório. Login só se você quiser.</p>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-semibold text-[#002d62]">
            Precisa de algo diferente? Fale no WhatsApp
          </a>
        </aside>
      </div>

      <div className="mt-6 rounded-[12px] bg-[#fff4cc] p-4">
        <RelatedRail
          title="Aproveite a visita do profissional"
          subtitle="Adicione outros serviços e economize no mesmo atendimento."
          servicos={together}
        />
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
