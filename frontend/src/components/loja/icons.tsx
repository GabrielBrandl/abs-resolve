type IconProps = { className?: string };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconHome({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 10.5 12 4l8 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20z" />
      <path d="M9 21.5V14h6v7.5" />
    </svg>
  );
}

export function IconBag({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M6 8h12l-1 12H7z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

export function IconCash({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconShield({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 3 5 6.5v6.2c0 4 3 6.8 7 8.3 4-1.5 7-4.3 7-8.3V6.5z" />
    </svg>
  );
}

export function IconPin({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export function IconCard({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function IconDoc({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M7 3h8l5 5v13H7z" />
      <path d="M15 3v5h5" />
    </svg>
  );
}

export function IconGift({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="4" y="11" width="16" height="9" rx="1.5" />
      <path d="M4 11h16V8H4zM12 8v12" />
      <path d="M12 8c-2-3-5-3-5 0s3 2 5 0zM12 8c2-3 5-3 5 0s-3 2-5 0z" />
    </svg>
  );
}

export function IconUser({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" />
    </svg>
  );
}

export function IconCamera({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function IconStar({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.8 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z" />
    </svg>
  );
}

export function IconVerified({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="10" cy="8" r="3.1" />
      <path d="M4.8 20c1.1-3.1 3.5-4.7 6.2-4.8" />
      <path d="M14.5 14.2 17 17l4.2-4.2" />
    </svg>
  );
}

export function IconLock({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconSearch({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconCart({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 5h2l1.2 9.2A2 2 0 0 0 9.2 16H17a2 2 0 0 0 2-1.6L20 8H7" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}

export function IconBolt({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M13 2 4 14h8l-1 8 9-12h-8z" />
    </svg>
  );
}

export function IconDrop({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z" />
    </svg>
  );
}

export function IconSnow({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 3v18M5 7l14 10M19 7 5 17M8 4.5 12 8l4-3.5M8 19.5 12 16l4 3.5" />
    </svg>
  );
}

export function IconWrench({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4L16 11z" />
    </svg>
  );
}

export function IconHammer({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="m15 5 4 4-3 1-5 5-2-2 5-5zM4 20l7-7" />
    </svg>
  );
}

export function IconSpark({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 3v4M12 17v4M4.9 7.5l2.8 2.8M16.3 13.7l2.8 2.8M4.9 16.5l2.8-2.8M16.3 10.3l2.8-2.8M8 12h4" />
    </svg>
  );
}

export function IconBuilding({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 21V6l8-3 8 3v15H4z" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

export function IconTag({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M3 12V4h8l9 9-8 8z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </svg>
  );
}

export function IconPinSmall({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export function IconHeadset({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5zM20 13h-3v6h2a1 1 0 0 0 1-1v-5z" />
      <path d="M17 19v1a3 3 0 0 1-3 3h-1" />
    </svg>
  );
}

export function IconUniform({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 20c1.2-3.5 3.8-5.2 7-5.2S17.8 16.5 19 20" />
      <path d="M9.5 11.5 8 14h8l-1.5-2.5" />
    </svg>
  );
}

export function IconCalendar({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </svg>
  );
}

export function IconPeople({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="9" cy="8" r="2.8" />
      <circle cx="16.5" cy="9" r="2.2" />
      <path d="M3.8 19c1-3 3.2-4.5 5.2-4.5S13.2 16 14.2 19" />
      <path d="M14 14.8c1.4-.5 2.9-.4 4.3.7 1 .8 1.7 2 2 3.5" />
    </svg>
  );
}

export function IconInstall({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M9.5 14.5 12 17l2.5-2.5" />
    </svg>
  );
}

export function IconParcelas({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M7 14h.01M10.5 14h.01M14 14h.01" />
      <path d="M16.2 13.2h3.3v3.2h-3.3z" />
      <path d="M17.1 14.1v2M18.6 14.1v2" />
    </svg>
  );
}

export function IconGear({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.5l1.9 1.1M17.2 15.4l1.9 1.1M4.9 16.5l1.9-1.1M17.2 8.6l1.9-1.1" />
      <path d="M19.5 12h-2.2M6.7 12H4.5" />
    </svg>
  );
}

export function IconSpray({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M9 8h5v12H9z" />
      <path d="M10 8V6h3v2" />
      <path d="M16 5c1.5 0 2.5 1 2.5 2.5S17.5 10 16 10" />
      <path d="M16 4v1M18.5 4.5l-.7.7M19 7h-1" />
    </svg>
  );
}

export function IconTools({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke}>
      <path d="M14.5 5.5a3.5 3.5 0 0 0-4.7 4.7L4 16l3 3 5.8-5.8a3.5 3.5 0 0 0 4.7-4.7L15.5 10z" />
      <path d="m8 8 2 2" />
    </svg>
  );
}

export function IconWhatsApp({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.33 4.94L2 22l5.4-1.4a10 10 0 0 0 4.64 1.14h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.1c-.24.67-1.4 1.24-1.94 1.32-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.4-.15-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.24-.27.64-.4 1.02-.4.12 0 .23 0 .33.01.29.01.44.03.63.49.24.57.82 2 .89 2.14.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.36.12.2.6.5 1.3 1.07 1.12.9 1.5 1.2 1.72 1.33.15.1.36.08.5-.06.17-.17.38-.45.6-.73.15-.2.35-.16.56-.1.21.07 1.34.63 1.57.75.23.11.38.17.44.27.06.1.06.67-.18 1.34z" />
    </svg>
  );
}

export function IconCheck({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function IconCoinsCashback({ className = 'h-20 w-20' }: IconProps) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="coinFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="45%" stopColor="#ffb800" />
          <stop offset="100%" stopColor="#c9920a" />
        </linearGradient>
        <linearGradient id="coinEdge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd24d" />
          <stop offset="100%" stopColor="#a67c00" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="86" rx="30" ry="5" fill="#000" fillOpacity="0.18" />
      <ellipse cx="60" cy="74" rx="34" ry="9" fill="url(#coinEdge)" />
      <ellipse cx="60" cy="70" rx="34" ry="9" fill="url(#coinFace)" />
      <ellipse cx="60" cy="58" rx="34" ry="9" fill="url(#coinEdge)" />
      <ellipse cx="60" cy="54" rx="34" ry="9" fill="url(#coinFace)" />
      <text x="60" y="42" textAnchor="middle" dominantBaseline="middle" fill="#7a5a00" fontSize="18" fontWeight="900" fontFamily="system-ui, sans-serif">
        R$
      </text>
    </svg>
  );
}
