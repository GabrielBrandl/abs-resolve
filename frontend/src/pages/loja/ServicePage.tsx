import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading } from '../../components/ui';
import { ServiceCard } from '../../components/loja/ServiceCard';
import { useCatalog } from '../../hooks/useCatalog';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { solicitacaoApi } from '../../services/modules.service';
import { cashbackOf, findService, money, priceAfterCashback, relatedServices } from '../../storefront/catalog';
import { WHATSAPP_LINK } from '../../storefront/constants';
import { isClienteRole } from '../../utils/auth-routes';

type Fluxo = {
  perguntas?: Array<{ id: string; titulo: string; opcoes: Array<{ id: string; label: string }> }>;
};

export function ServicePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { categorias, loading } = useCatalog();
  const cart = useCartStore();
  const user = useAuthStore((s) => s.user);
  const servico = findService(categorias, slug);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!slug) return;
    solicitacaoApi
      .fluxo(slug)
      .then((d) => setFluxo(d as Fluxo))
      .catch(() => setFluxo(null));
  }, [slug]);

  const price = servico?.precoMinimo || 0;
  const cashback = cashbackOf(price);
  const related = useMemo(() => relatedServices(categorias, slug, 3), [categorias, slug]);

  if (loading) return <Loading />;
  if (!servico) {
    return (
      <div>
        <h1 className="text-xl font-bold">Serviço não encontrado</h1>
        <Link to="/" className="mt-3 inline-block text-primary-700">
          Voltar à loja
        </Link>
      </div>
    );
  }

  const goCheckout = () => {
    cart.add({
      slug: servico.slug,
      nome: servico.nome,
      categoria: servico.categoria,
      precoMinimo: servico.precoMinimo,
      precoTexto: servico.precoTexto || '',
      tipoPreco: servico.tipoPreco,
      imagemUrl: servico.imagemUrl,
    }, qty);
    const next = `/agendar?slug=${encodeURIComponent(servico.slug)}`;
    if (!user || !isClienteRole(user.role)) {
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    navigate(next);
  };

  return (
    <div>
      <p className="text-sm text-slate-500">
        <Link to="/">Início</Link> / <Link to={`/c/${servico.categoria}`}>{servico.categoriaNome}</Link> / {servico.nome}
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr_18rem]">
        <div className="overflow-hidden rounded-2xl bg-white">
          {servico.imagemUrl ? (
            <img src={servico.imagemUrl} alt={servico.nome} className="h-80 w-full object-cover" />
          ) : (
            <div className="flex h-80 items-center justify-center text-6xl">🔧</div>
          )}
          <div className="grid grid-cols-4 gap-2 p-3 text-center text-xs text-slate-600">
            <span>Profissionais verificados</span>
            <span>Garantia de {servico.garantiaDias || 90} dias</span>
            <span>Pagamento seguro</span>
            <span>Nota fiscal</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-primary-900">{servico.nome}</h1>
          <p className="mt-1 text-sm text-amber-600">★ 4,9 · 180+ avaliações · 300+ serviços feitos</p>
          <p className="mt-3 text-3xl font-bold text-primary-800">
            {price ? `A partir de ${money(price)}` : servico.precoTexto}
          </p>
          {cashback > 0 && (
            <p className="text-sm font-semibold text-emerald-700">10% cashback · você ganha {money(cashback)}</p>
          )}
          <p className="mt-3 text-sm text-slate-600">{servico.descricao}</p>

          <div className="mt-5 space-y-3">
            {(fluxo?.perguntas || []).slice(0, 5).map((p) => (
              <div key={p.id}>
                <p className="mb-1 text-sm font-semibold text-primary-800">{p.titulo}</p>
                <div className="flex flex-wrap gap-2">
                  {p.opcoes.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setRespostas((r) => ({ ...r, [p.id]: o.id }))}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        respostas[p.id] === o.id
                          ? 'border-primary-700 bg-primary-700 text-white'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="mb-1 text-sm font-semibold">Quantidade</p>
              <div className="flex items-center gap-2">
                <button type="button" className="h-8 w-8 rounded border" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                  −
                </button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button type="button" className="h-8 w-8 rounded border" onClick={() => setQty((n) => n + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Resumo do serviço</p>
          <p className="mt-1 font-semibold text-primary-900">{servico.nome}</p>
          <p className="mt-3 text-2xl font-bold text-primary-800">{price ? money(price * qty) : servico.precoTexto}</p>
          {cashback > 0 && (
            <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
              Com cashback, o próximo serviço pode sair por {money(priceAfterCashback(price))}
            </p>
          )}
          <button
            type="button"
            onClick={goCheckout}
            className="mt-4 w-full rounded-lg bg-accent-500 py-3 text-sm font-bold text-primary-900"
          >
            Comprar e agendar
          </button>
          <button
            type="button"
            onClick={() =>
              cart.add({
                slug: servico.slug,
                nome: servico.nome,
                categoria: servico.categoria,
                precoMinimo: servico.precoMinimo,
                precoTexto: servico.precoTexto || '',
                tipoPreco: servico.tipoPreco,
                imagemUrl: servico.imagemUrl,
              }, qty)
            }
            className="mt-2 w-full rounded-lg border border-primary-700 py-3 text-sm font-bold text-primary-800"
          >
            Adicionar ao carrinho
          </button>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs text-primary-700">
            Precisa de algo diferente? Fale no WhatsApp
          </a>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-primary-900">Aproveite a visita do profissional</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((s) => (
              <ServiceCard key={s.slug} servico={s} cta="Adicionar +" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
