import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const HERO_SLIDES = [
  {
    src: '/hero-home.jpg',
    alt: 'ABS Resolve — Sua casa em boas mãos. Serviços residenciais com preço na hora, agendamento online e garantia.',
    href: '/busca',
    label: 'Solicitar orçamento',
  },
  {
    src: '/hero-cashback.jpg',
    alt: 'ABS Resolve — Cashback e desconto na segunda compra.',
    href: '/busca',
    label: 'Ver ofertas e cashback',
  },
] as const;

const INTERVAL_MS = 5500;

export function HeroBannerCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || HERO_SLIDES.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = HERO_SLIDES[index];

  return (
    <div
      className="relative overflow-hidden rounded-[14px] shadow-[0_10px_30px_rgba(0,45,98,0.18)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Link to={slide.href} className="block" aria-label={slide.label}>
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            width={1600}
            height={700}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            className={`h-auto w-full object-cover object-left transition-opacity duration-700 ${
              i === index ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
            }`}
          />
        ))}
      </Link>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            aria-label={`Banner ${i + 1}`}
            aria-current={i === index}
            className={`pointer-events-auto h-2.5 w-2.5 rounded-full border border-white/80 transition ${
              i === index ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/70'
            }`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
