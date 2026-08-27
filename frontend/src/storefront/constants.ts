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
  icon: 'bolt' | 'drop' | 'snow' | 'wrench' | 'hammer' | 'spark' | 'building';
  to?: string;
};

export const CATEGORY_NAV: CategoryNavItem[] = [
  { slug: 'pecas', label: 'Peças', image: '/opcoes/troca-tomada/tipoTomada/simples.webp', icon: 'bolt', to: '/c/pecas' },
  { slug: 'eletricista', label: 'Elétrica', image: '/servicos/troca-tomada.webp', icon: 'bolt' },
  { slug: 'hidraulica', label: 'Hidráulica', image: '/servicos/troca-torneira.webp', icon: 'drop' },
  { slug: 'ar-condicionado', label: 'Ar-condicionado', image: '/servicos/limpeza-ar-split.webp', icon: 'snow' },
  { slug: 'montador', label: 'Instalações', image: '/servicos/instalacao-suporte-tv.webp', icon: 'wrench' },
  { slug: 'montador', label: 'Montagens', image: '/servicos/montagem-moveis-simples.webp', icon: 'wrench' },
  { slug: 'limpeza-pos-obra', label: 'Limpeza', image: '/servicos/limpeza-pos-obra.webp', icon: 'spark' },
  { slug: 'jardinagem', label: 'Reformas', image: '/servicos/poda-jardim.webp', icon: 'hammer' },
  { slug: 'eletricista', label: 'Empresarial', image: '/servicos/troca-tomada.webp', icon: 'building', to: '/busca?q=empresarial' },
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
