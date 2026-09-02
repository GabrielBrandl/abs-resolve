import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { money, relatedForCart } from '../../storefront/catalog';
import { TrustRow, YellowButton } from '../../components/loja/store-ui';
import { RelatedRail } from '../../components/loja/RelatedRail';
import { useCatalog } from '../../hooks/useCatalog';
import { isClienteRole } from '../../utils/auth-routes';
import { funil } from '../../utils/gtm';
import { IconLock, IconShield, IconVerified } from '../../components/loja/icons';
import { useToast } from '../../components/Toast';
import { validarCarrinhoFrontend } from '../../utils/carrinho-regras';

export function CartPage() {
  const cart = useCartStore();
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categorias } = useCatalog();
  const resumo = useMemo(
    () =>
      validarCarrinhoFrontend(
        items.map((i) => ({
          slug: i.slug,
          quantidade: i.quantidade,
          tipo: i.tipo,
          precoMinimo: i.precoMinimo,
        }))
      ),
    [items]
  );
  const total = resumo.subtotal;
  const related = relatedForCart(categorias, items.map((i) => i.slug), 4);
  const logadoCliente = Boolean(user && isClienteRole(user.role));

  const checkout = () => {
    if (!resumo.ok) {
      toast(resumo.mensagem, 'error');
      return;
    }
    funil.iniciouCheckout({
      origem: 'carrinho',
      qtd_itens: items.length,
      valor: resumo.total,
    });
    navigate('/agendar');
  };

  if (items.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#e6e8ee] bg-white px-6 py-16 text-center">
        <h1 className="text-2xl font-black text-[#002d62]">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-slate-500">Escolha um serviço, veja o preço e agende em minutos.</p>
        <Link to="/" className="mt-6 inline-block">
          <YellowButton>Ver serviços</YellowButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20.5rem]">
      <div className="rounded-[12px] border border-[#e6e8ee] bg-white p-5">
        <h1 className="mb-1 text-[26px] font-black text-[#002d62]">Meu pedido</h1>
        <p className="mb-4 text-sm text-slate-500">{items.length} {items.length === 1 ? 'item' : 'itens'} no pedido</p>
        <ul className="divide-y divide-[#eef0f4]">
          {items.map((item) => (
            <li key={item.slug} className="flex gap-4 py-4">
              <img src={item.imagemUrl || '/logo.png'} alt="" className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight text-[#111827]">{item.nome}</p>
                {(item.tipo === 'peca' || item.slug.startsWith('peca-')) && (
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#002d62]">Peça avulsa</p>
                )}
                <p className="mt-1 text-lg font-black text-[#002d62]">{money((item.precoMinimo || 0) * item.quantidade)}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-md border border-[#d5d9e2]">
                    <button type="button" className="h-8 w-8 text-lg" onClick={() => cart.setQty(item.slug, item.quantidade - 1)}>−</button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantidade}</span>
                    <button type="button" className="h-8 w-8 text-lg" onClick={() => cart.setQty(item.slug, item.quantidade + 1)}>+</button>
                  </div>
                  <button type="button" className="text-xs font-semibold text-[#1d4ed8] hover:underline" onClick={() => cart.remove(item.slug)}>
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit rounded-[12px] border border-[#e6e8ee] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Resumo do pedido</p>
        <div className="mt-3 flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">{money(total)}</span>
        </div>
        {resumo.avisoServico && (
          <p className="mt-2 text-xs text-amber-700">{resumo.avisoServico}</p>
        )}
        {resumo.avisoMisto && (
          <p className="mt-2 text-xs text-emerald-700">{resumo.avisoMisto}</p>
        )}
        {resumo.avisoPecas && (
          <p className="mt-2 text-xs text-slate-600">{resumo.avisoPecas}</p>
        )}
        {!resumo.ok && (
          <p className="mt-2 text-xs font-semibold text-red-600">{resumo.mensagem}</p>
        )}
        <div className="mt-4 flex items-end justify-between border-t border-[#eef0f4] pt-3">
          <span className="font-bold text-[#002d62]">Total</span>
          <p className="text-[28px] font-black text-[#002d62]">{money(resumo.total)}</p>
        </div>
        <ul className="mt-4 space-y-2 text-[12px] font-semibold text-[#334155]">
          <li className="flex items-center gap-2"><IconShield className="h-4 w-4 text-[#002d62]" /> Garantia de até 90 dias</li>
          <li className="flex items-center gap-2"><IconVerified className="h-4 w-4 text-[#002d62]" /> Profissional verificado</li>
          <li className="flex items-center gap-2"><IconLock className="h-4 w-4 text-[#002d62]" /> Pagamento online 100% seguro</li>
        </ul>
        <YellowButton className="mt-5 w-full" onClick={checkout} disabled={!resumo.ok}>
          Continuar para pagamento →
        </YellowButton>
        {!logadoCliente && (
          <p className="mt-3 text-center text-[12px] text-slate-500">
            Não precisa criar conta.{' '}
            <Link to={`/login?next=${encodeURIComponent('/agendar')}`} className="font-semibold text-[#002d62] underline">
              Já tenho conta
            </Link>
          </p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-500">
          <IconLock className="h-3.5 w-3.5" /> Ambiente 100% seguro
        </p>
      </aside>

      <div className="lg:col-span-2">
        <TrustRow compact />
        <RelatedRail
          title="Aproveite a visita do profissional"
          subtitle="Adicione outros serviços e resolva tudo no mesmo atendimento."
          servicos={related}
        />
      </div>
    </div>
  );
}
