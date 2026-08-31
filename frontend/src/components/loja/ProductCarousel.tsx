import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type ProductCarouselProps = {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
  showDots?: boolean;
  showFade?: boolean;
};

export function ProductCarousel({
  children,
  className = '',
  gridClassName = 'md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-4',
  showDots = true,
  showFade = true,
}: ProductCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  const updateIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slides = el.querySelectorAll('[data-carousel-slide]');
    setSlideCount(slides.length);
    if (!slides.length) return;

    const scrollLeft = el.scrollLeft;
    let closest = 0;
    let minDist = Infinity;
    slides.forEach((slide, i) => {
      const dist = Math.abs((slide as HTMLElement).offsetLeft - scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateIndex();
    el.addEventListener('scroll', updateIndex, { passive: true });
    window.addEventListener('resize', updateIndex);
    return () => {
      el.removeEventListener('scroll', updateIndex);
      window.removeEventListener('resize', updateIndex);
    };
  }, [updateIndex, children]);

  const scrollTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.querySelectorAll('[data-carousel-slide]')[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <div className={`relative ${className}`}>
      {showFade && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f3f5f8] to-transparent md:hidden"
        />
      )}
      <div
        ref={scrollerRef}
        className={`-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0 ${gridClassName} md:overflow-visible md:snap-none`}
      >
        {children}
      </div>
      {showDots && slideCount > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 md:hidden">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para item ${i + 1}`}
              aria-current={i === activeIndex ? 'true' : undefined}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-5 bg-[#002d62]' : 'w-1.5 bg-[#cbd5e1]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductCarouselItem({
  children,
  className = '',
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  /** Slide mais estreito (ex.: cards relacionados) */
  compact?: boolean;
}) {
  return (
    <div
      data-carousel-slide
      className={`shrink-0 snap-start md:w-auto md:max-w-none ${
        compact ? 'w-[88vw] max-w-[20rem]' : 'w-[82vw] max-w-[17.5rem]'
      } ${className}`}
    >
      {children}
    </div>
  );
}
