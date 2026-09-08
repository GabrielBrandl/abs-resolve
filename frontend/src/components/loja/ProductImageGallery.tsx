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
  className?: string;
  heightClass?: string;
};

/** Galeria de produto/serviço: capa + miniaturas clicáveis. */
export function ProductImageGallery({ item, className = '', heightClass = 'h-[280px]' }: Props) {
  const fotos = galeriaServico(item);
  const reserva = fallbackFotoServico(item);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [item.slug, item.imagemUrl, fotos.join('|')]);

  const safeIdx = fotos.length ? Math.min(idx, fotos.length - 1) : 0;
  const mostrar = fotos[safeIdx] || fotoServico(item) || reserva;

  return (
    <div className={`overflow-hidden rounded-[12px] bg-white shadow-sm ${className}`}>
      <div className={`relative ${heightClass} w-full overflow-hidden bg-[#dbe7f5]`}>
        <img
          key={mostrar}
          src={`${mostrar}${mostrar.includes('?') ? '&' : '?'}v=3`}
          alt={item.nome || ''}
          className="h-full w-full object-cover object-center"
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
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
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
