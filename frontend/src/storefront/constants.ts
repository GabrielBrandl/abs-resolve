export const WHATSAPP_ABS = '5592984169936';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_ABS}?text=${encodeURIComponent(
  'Olá, ABS Resolve! Quero contratar um serviço.'
)}`;

export const CASHBACK_PCT = 0.1;
export const REFERRAL_BONUS = 20;

export type CategoryNavItem = {
  slug: string;
  label: string;
  image: string;
};

export const CATEGORY_NAV: CategoryNavItem[] = [
  { slug: 'eletricista', label: 'Elétrica', image: '/servicos/troca-tomada.webp' },
  { slug: 'hidraulica', label: 'Hidráulica', image: '/servicos/troca-torneira.webp' },
  { slug: 'ar-condicionado', label: 'Ar-condicionado', image: '/servicos/limpeza-ar-split.webp' },
  { slug: 'montador', label: 'Instalações', image: '/servicos/instalacao-suporte-tv.webp' },
  { slug: 'montador', label: 'Montagens', image: '/servicos/montagem-moveis-simples.webp' },
  { slug: 'jardinagem', label: 'Reformas', image: '/servicos/poda-jardim.webp' },
  { slug: 'limpeza-pos-obra', label: 'Limpeza', image: '/servicos/limpeza-pos-obra.webp' },
];

export const UNIQUE_CATEGORIES = CATEGORY_NAV.filter(
  (c, i, arr) => arr.findIndex((x) => x.slug === c.slug) === i
);

export const TRUST_BADGES = [
  { id: 'verified', title: 'Profissionais verificados', short: 'Profissionais verificados', text: 'Equipe identificada e treinada' },
  { id: 'warranty', title: 'Garantia de até 90 dias', short: 'Garantia 90 dias', text: 'Proteção em todos os serviços' },
  { id: 'payment', title: 'Pagamento 100% seguro', short: 'Pagamento seguro', text: 'PIX, cartão e nota fiscal' },
  { id: 'invoice', title: 'Nota fiscal emitida', short: 'Nota fiscal', text: 'Documento automático após o serviço' },
] as const;
