const BRANDS = [
  { id: 'lorenzetti', label: 'Lorenzetti', src: '/marcas/lorenzetti.svg' },
  { id: 'civitt', label: 'Civitt', src: '/marcas/civitt.svg' },
  { id: 'tigre', label: 'Tigre', src: '/marcas/tigre.svg' },
  { id: 'taschibra', label: 'Taschibra', src: '/marcas/taschibra.svg' },
  { id: 'deca', label: 'Deca', src: '/marcas/deca.svg' },
  { id: 'amanco', label: 'Amanco', src: '/marcas/amanco.svg' },
  { id: 'tramontina', label: 'Tramontina', src: '/marcas/tramontina.svg' },
] as const;

function BrandLogo({ label, src }: { label: string; src: string }) {
  return (
    <div
      className="flex h-16 min-w-[11rem] shrink-0 items-center justify-center px-6"
      aria-label={label}
    >
      <img
        src={src}
        alt={label}
        className="max-h-11 w-auto max-w-[10rem] object-contain"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export function BrandMarquee() {
  const track = [...BRANDS, ...BRANDS];

  return (
    <section
      className="overflow-hidden rounded-[14px] bg-[#f3f3f3] py-5"
      aria-label="Marcas parceiras"
    >
      <h2 className="mb-4 text-center text-[13px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
        Marcas com quais trabalhamos
      </h2>
      <div className="brand-marquee-mask relative">
        <div className="brand-marquee-track flex w-max items-center">
          {track.map((brand, i) => (
            <BrandLogo key={`${brand.id}-${i}`} label={brand.label} src={brand.src} />
          ))}
        </div>
      </div>
    </section>
  );
}
