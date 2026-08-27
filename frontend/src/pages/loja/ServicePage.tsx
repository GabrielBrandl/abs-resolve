import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { Breadcrumb, CashbackTag, Stars, TrustStrip, YellowButton } from '../../components/loja/store-ui';
import { useCatalog } from '../../hooks/useCatalog';
import { addToCart } from '../../store/cartStore';
import { solicitacaoApi } from '../../services/modules.service';
import {
  cashbackOf,
  findService,
  frequentlyTogether,
  fotoServico,
  money,
  relatedSameCategory,
} from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';

type Fluxo = {
  perguntas?: Array<{ id: string; titulo: string; opcoes: Array<{ id: string; label: string }> }>;
};

export function ServicePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const { cashbackPercent } = useStoreConfig();
  const servico = findService(categorias, slug);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!slug) return;
    solicitacaoApi.fluxo(slug).then((d) => setFluxo(d as Fluxo)).catch(() => setFluxo(null));
  }, [slug]);

  const price = servico?.precoMinimo || 0;
  const cashback = cashbackOf(price, cashbackPercent);
  const together = useMemo(() => frequentlyTogether(categorias, slug, 4), [categorias, slug]);
  const sameCategory = useMemo(() => relatedSameCategory(categorias, slug, 4), [categorias, slug]);

  if (loading) return <Loading />;
  if (!servico) {
    return (
      <div>
        <h1 className="text-xl font-bold">Serviço não encontrado</h1>
        <Link to="/" className="mt-3 inline-block text-primary-700">Voltar à loja</Link>
      </div>
    );
  }

  const payload = {
    slug: servico.slug,
    nome: servico.nome,
    categoria: servico.categoria,
    precoMinimo: servico.precoMinimo,
    precoTexto: servico.precoTexto || '',
    tipoPreco: servico.tipoPreco || 'fixo',
    imagemUrl: servico.imagemUrl,
  };

  const putInCart = () => addToCart(payload, qty);

  const goCart = () => {
    putInCart();
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr_20rem]">
        <div className="overflow-hidden rounded-[12px] bg-white shadow-sm">
          <img
            src={`${fotoServico(servico)}${fotoServico(servico).includes('?') ? '&' : '?'}v=3`}
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
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-[32px] font-black text-[#002d62]">{price ? money(price) : servico.precoTexto}</p>
              {cashback > 0 && <CashbackTag>{percentLabel(cashbackPercent)}% CASHBACK</CashbackTag>}
            </div>
            {cashback > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-700">Você recebe {money(cashback)} de volta no próximo serviço.</p>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{servico.descricao}</p>

          <div className="mt-6 space-y-4">
            {(fluxo?.perguntas || []).slice(0, 5).map((p, idx) => (
              <div key={p.id}>
                <p className="mb-2 text-sm font-bold text-[#002d62]">
                  {idx + 1}. {p.titulo}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.opcoes.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setRespostas((r) => ({ ...r, [p.id]: o.id }))}
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
              </div>
            ))}
            <div>
              <p className="mb-2 text-sm font-bold">Quantidade</p>
              <div className="flex items-center overflow-hidden rounded-md border border-[#d5d9e2] w-fit">
                <button type="button" className="h-9 w-9" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
                <span className="w-8 text-center font-black">{qty}</span>
                <button type="button" className="h-9 w-9" onClick={() => setQty((n) => n + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#002d62]">Resumo do serviço</p>
            <button type="button" className="text-xs font-bold text-[#1d4ed8]" onClick={() => setRespostas({})}>Limpar</button>
          </div>
          <p className="mt-2 font-bold text-[#111827]">{servico.nome}</p>
          <p className="mt-3 text-[30px] font-black text-[#002d62]">{price ? money(price * qty) : servico.precoTexto}</p>
          {cashback > 0 && (
            <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              Você receberá {money(cashback * qty)} de cashback no próximo serviço.
            </p>
          )}
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
          <p className="mt-2 text-center text-[11px] text-slate-500">Sem cadastro para olhar e montar o pedido. Login só na hora de pagar.</p>
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
      <RelatedRail
        title={`Mais da categoria ${servico.categoriaNome || ''}`}
        subtitle="Fica na mesma prateleira. Um clique e entra no pedido."
        servicos={sameCategory}
        cta="Levar da categoria"
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-2xl lg:hidden">
        <YellowButton className="w-full" onClick={goCart}>
          Adicionar ao carrinho {price ? money(price * qty) : ''}
        </YellowButton>
      </div>
    </div>
  );
}
