import { Link } from 'react-router-dom';
import { cashbackOf, money, type ServicoLoja } from '../../storefront/catalog';
import { CashbackTag } from './store-ui';
import { percentLabel, useStoreConfig } from '../../hooks/useStoreConfig';

export function ServiceCard({
  servico,
}: {
  servico: ServicoLoja;
  cta?: string;
  highlight?: string;
}) {
  const { cashbackPercent } = useStoreConfig();
  const price = servico.precoMinimo;
  const cashback = cashbackOf(price, cashbackPercent);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[12px] border border-[#e6e8ee] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <Link to={`/s/${servico.slug}`} className="relative block aspect-[4/3] bg-slate-100">
        {servico.imagemUrl ? (
          <img src={servico.imagemUrl} alt={servico.nome} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-slate-200" />
        )}
        <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-[#002d62] shadow-sm">
          Avaliação 4,9
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-3.5">
        <Link to={`/s/${servico.slug}`} className="line-clamp-2 min-h-10 text-[15px] font-extrabold leading-tight text-[#111827]">
          {servico.nome}
        </Link>
        {servico.descricao && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-500">{servico.descricao}</p>
        )}
        <p className="mt-3 text-[12px] text-slate-500">A partir de</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-[20px] font-black text-[#111827]">
            {price ? money(price) : servico.precoTexto || 'Sob orçamento'}
          </p>
          {cashback > 0 && (
            <CashbackTag>
              {percentLabel(cashbackPercent)}% CASHBACK
            </CashbackTag>
          )}
        </div>
        <Link
          to={`/s/${servico.slug}`}
          className="mt-3 block rounded-lg bg-[#002d62] py-2.5 text-center text-[12px] font-extrabold uppercase tracking-wide text-white"
        >
          Ver preço e agendar
        </Link>
      </div>
    </article>
  );
}
