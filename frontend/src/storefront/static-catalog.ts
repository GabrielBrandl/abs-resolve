import type { CategoriaLoja } from './catalog';

const CATS = [
  { slug: 'eletricista', nome: 'Eletricista', icone: '⚡', cor: '#0033B5' },
  { slug: 'hidraulica', nome: 'Hidráulica', icone: '💧', cor: '#0ea5e9' },
  { slug: 'montador', nome: 'Montador', icone: '🔧', cor: '#6366f1' },
  { slug: 'ar-condicionado', nome: 'Ar-condicionado', icone: '❄️', cor: '#06b6d4' },
  { slug: 'jardinagem', nome: 'Jardinagem', icone: '🌿', cor: '#22c55e' },
  { slug: 'limpeza-pos-obra', nome: 'Limpeza pós-obra', icone: '🧹', cor: '#64748b' },
];

const SERVICOS = [
  ['troca-tomada', 'eletricista', 'Troca de tomada', 149, 'R$ 149', 'fixo', 90],
  ['troca-interruptor', 'eletricista', 'Troca de interruptor', 149, 'R$ 149', 'fixo', 90],
  ['instalacao-chuveiro', 'eletricista', 'Instalação de chuveiro', 199, 'R$ 199', 'fixo', 90],
  ['troca-disjuntor', 'eletricista', 'Troca de disjuntor', 169, 'R$ 169', 'fixo', 90],
  ['instalacao-luminaria', 'eletricista', 'Instalação de luminária', 159, 'R$ 159', 'fixo', 90],
  ['instalacao-ventilador-teto', 'eletricista', 'Instalação de ventilador de teto', 299, 'R$ 299', 'fixo', 90],
  ['troca-torneira', 'hidraulica', 'Troca de torneira', 179, 'R$ 179', 'fixo', 90],
  ['troca-registro', 'hidraulica', 'Troca de registro', 189, 'R$ 189', 'fixo', 90],
  ['reparo-vazamento', 'hidraulica', 'Reparo de vazamento', 249, 'A partir de R$ 249', 'a_partir', 90],
  ['desentupimento-pia', 'hidraulica', 'Desentupimento de pia', 199, 'R$ 199', 'fixo', 30],
  ['desentupimento-vaso', 'hidraulica', 'Desentupimento de vaso', 299, 'A partir de R$ 299', 'a_partir', 30],
  ['instalacao-suporte-tv', 'montador', 'Instalação de suporte de TV', 159, 'R$ 159', 'fixo', 90],
  ['instalacao-prateleira', 'montador', 'Instalação de prateleira', 149, 'R$ 149', 'fixo', 30],
  ['montagem-moveis-simples', 'montador', 'Montagem de móvel simples', 249, 'R$ 249', 'fixo', 30],
  ['montagem-guarda-roupa', 'montador', 'Montagem de guarda-roupa', 499, 'R$ 499', 'fixo', 30],
  ['instalacao-persiana', 'montador', 'Instalação de persiana', 179, 'R$ 179', 'fixo', 30],
  ['limpeza-ar-split', 'ar-condicionado', 'Limpeza preventiva (split)', 249, 'R$ 249', 'fixo', 30],
  ['instalacao-ar-split', 'ar-condicionado', 'Instalação de ar-condicionado split', null, 'Sob orçamento', 'sob_orcamento', 90],
  ['poda-jardim', 'jardinagem', 'Poda e limpeza de jardim', 159, 'R$ 159', 'fixo', 0],
  ['limpeza-pos-obra', 'limpeza-pos-obra', 'Limpeza pós-obra', 15, 'A partir de R$ 15/m²', 'a_partir', 0],
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
})).filter((c) => c.servicos.length > 0);
