import type { CategoriaLoja } from './catalog';

const CATS = [
  { slug: 'eletricista', nome: 'Eletricista', icone: '⚡', cor: '#0033B5' },
  { slug: 'hidraulica', nome: 'Hidráulica', icone: '💧', cor: '#0ea5e9' },
  { slug: 'montador', nome: 'Montador', icone: '🔧', cor: '#6366f1' },
  { slug: 'ar-condicionado', nome: 'Ar-condicionado', icone: '❄️', cor: '#06b6d4' },
];

const SERVICOS = [
  ['troca-tomada', 'eletricista', 'Troca de tomada', 149, 'R$ 149', 'fixo', 90],
  ['troca-interruptor', 'eletricista', 'Troca de interruptor', 149, 'R$ 149', 'fixo', 90],
  ['instalacao-chuveiro', 'eletricista', 'Instalação de chuveiro', 199, 'R$ 199', 'fixo', 90],
  ['troca-disjuntor', 'eletricista', 'Troca de disjuntor', 149, 'A partir de R$ 149', 'a_partir', 90],
  ['instalacao-luminaria', 'eletricista', 'Instalação de luminária', 149, 'R$ 149', 'fixo', 90],
  ['instalacao-ventilador-teto', 'eletricista', 'Instalação de ventilador de teto', 299, 'R$ 299', 'fixo', 90],
  ['troca-torneira', 'hidraulica', 'Troca de torneira', 129, 'A partir de R$ 129', 'a_partir', 90],
  ['troca-registro', 'hidraulica', 'Troca de registro', 149, 'A partir de R$ 149', 'a_partir', 90],
  ['reparo-vazamento', 'hidraulica', 'Reparo de vazamento', 129, 'A partir de R$ 129', 'a_partir', 90],
  ['desentupimento-pia', 'hidraulica', 'Desentupimento de pia', 249, 'R$ 249', 'fixo', 30],
  ['desentupimento-vaso', 'hidraulica', 'Desentupimento de vaso', 299, 'A partir de R$ 299', 'a_partir', 30],
  ['instalacao-suporte-tv', 'montador', 'Instalação de suporte de TV', 149, 'A partir de R$ 149', 'a_partir', 90],
  ['instalacao-prateleira', 'montador', 'Instalação de prateleira', 129, 'A partir de R$ 129', 'a_partir', 30],
  ['limpeza-ar-split', 'ar-condicionado', 'Limpeza preventiva (split)', 149, 'A partir de R$ 149', 'a_partir', 30],
  ['instalacao-ar-split', 'ar-condicionado', 'Instalação de ar-condicionado split', null, 'Sob orçamento', 'sob_orcamento', 90],
] as const;

export const CATALOGO_FALLBACK: CategoriaLoja[] = CATS.map((cat) => ({
  ...cat,
  servicos: SERVICOS.filter((s) => s[1] === cat.slug).map((s) => ({
    slug: s[0],
    categoria: s[1],
    nome: s[2],
    precoMinimo: s[3],
    precoTexto: s[4],
    tipoPreco: s[5],
    garantiaDias: s[6],
    descricao: s[2],
    imagemUrl: `/servicos/${s[0]}.webp`,
  })),
}));
