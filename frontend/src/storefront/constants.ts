export const WHATSAPP_ABS = '5592984169936';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_ABS}?text=${encodeURIComponent(
  'Olá, ABS Resolve! Quero contratar um serviço.'
)}`;

export const CASHBACK_PCT = 0.1;
export const REFERRAL_BONUS = 20;

export const CATEGORY_NAV: Array<{ slug: string; label: string; icon: string }> = [
  { slug: 'eletricista', label: 'Elétrica', icon: '⚡' },
  { slug: 'hidraulica', label: 'Hidráulica', icon: '💧' },
  { slug: 'ar-condicionado', label: 'Ar-condicionado', icon: '❄️' },
  { slug: 'montador', label: 'Instalações', icon: '🔧' },
  { slug: 'montador', label: 'Montagens', icon: '🪑' },
  { slug: 'jardinagem', label: 'Reformas', icon: '🏡' },
  { slug: 'limpeza-pos-obra', label: 'Limpeza', icon: '🧹' },
];

export const TRUST_BADGES = [
  { icon: '✓', title: 'Profissionais verificados', text: 'Equipe identificada e treinada' },
  { icon: '★', title: 'Pagamento 100% seguro', text: 'PIX, cartão e nota fiscal' },
  { icon: '🛡', title: 'Garantia de até 90 dias', text: 'Proteção em todos os serviços' },
  { icon: '📄', title: 'Nota fiscal emitida', text: 'Documento automático após o serviço' },
];
