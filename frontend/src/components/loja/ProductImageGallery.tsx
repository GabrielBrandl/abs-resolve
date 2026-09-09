import { useEffect, useState } from 'react';
import { fallbackFotoServico, fotoServico, galeriaServico } from '../../storefront/catalog';

type Props = {
  item: {
    slug?: string;
    categoria?: string;
    imagemUrl?: string | null;
    imagens?: string[] | null;
    nome?: string;
  };
  /** Quando definido, vira a capa imediatamente (ex.: opção do questionário) */
  destaqueUrl?: string | null;
  className?: string;
  heightClass?: string;
};

function comCacheBust(url: string) {
  if (!url) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=3`;
}

/** Galeria de produto/serviço: capa + miniaturas; troca de destaque sem quebrar layout. */
export function ProductImageGallery({
  item,
  destaqueUrl,
  className = '',
  heightClass = 'h-[280px]',
}: Props) {
  const fotosBase = galeriaServico(item);
  const reserva = fallbackFotoServico(item);
  const destaque = String(destaqueUrl || '').trim() || null;
  const fotos = destaque
    ? [destaque, ...fotosBase.filter((u) => u !== destaque)]
    : fotosBase;
  const [idx, setIdx] = useState(0);
  const [opacidade, setOpacidade] = useState(1);

  useEffect(() => {
    setIdx(0);
  }, [item.slug, destaque, item.imagemUrl]);

  const safeIdx = fotos.length ? Math.min(idx, fotos.length - 1) : 0;
  const mostrar = fotos[safeIdx] || fotoServico(item) || reserva;

  useEffect(() => {
    setOpacidade(0.92);
    const t = window.setTimeout(() => setOpacidade(1), 40);
    return () => window.clearTimeout(t);
  }, [mostrar]);

  return (
    <div className={`overflow-hidden rounded-[12px] bg-white shadow-sm ${className}`}>
      <div className={`relative ${heightClass} w-full overflow-hidden bg-[#dbe7f5]`}>
        <img
          src={comCacheBust(mostrar)}
          alt={item.nome || ''}
          className="h-full w-full object-cover object-center transition-opacity duration-200 ease-out"
          style={{ opacity: opacidade }}
          decoding="async"
          onError={(e) => {
            const el = e.currentTarget;
            if (!el.src.includes(reserva)) el.src = reserva;
          }}
        />
        {fotos.length > 1 && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
            {safeIdx + 1}/{fotos.length}
          </div>
        )}
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-2">
          {fotos.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 sm:h-16 sm:w-16 ${
                i === safeIdx ? 'border-[#002d62]' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
