const BRANDS = [
  { id: 'lorenzetti', label: 'Lorenzetti', color: '#E30613' },
  { id: 'civitt', label: 'Civitt', color: '#003DA5' },
  { id: 'tigre', label: 'Tigre', color: '#0066CC' },
  { id: 'taschibra', label: 'Taschibra', color: '#C8102E' },
  { id: 'deca', label: 'Deca', color: '#0054A6' },
  { id: 'amanco', label: 'Amanco', color: '#00843D' },
  { id: 'tramontina', label: 'Tramontina', color: '#E30613' },
] as const;

function BrandLogo({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex h-12 min-w-[9rem] shrink-0 items-center justify-center px-4"
      aria-label={label}
    >
      <span
        className="select-none text-[1.35rem] font-black uppercase tracking-tight opacity-80"
        style={{ color }}
      >
        {label}
      </span>
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
            <BrandLogo key={`${brand.id}-${i}`} label={brand.label} color={brand.color} />
          ))}
        </div>
      </div>
    </section>
  );
}
