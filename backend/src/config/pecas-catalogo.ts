export type PecaCatalogoDef = {
  slug: string;
  categoria: string;
  nome: string;
  precoMinimo: number;
  precoTexto: string;
  descricao: string;
  imagemUrl: string;
  servicoRelacionado: string;
  keywords: string[];
};

export const PECAS_CATALOGO: PecaCatalogoDef[] = [
  {
    slug: 'peca-tomada-simples',
    categoria: 'eletricista',
    nome: 'Tomada 10A simples',
    precoMinimo: 24.9,
    precoTexto: 'R$ 24,90',
    descricao: 'Tomada 2P+T 10A, padrão brasileiro. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-tomada/tipoTomada/simples.webp',
    servicoRelacionado: 'troca-tomada',
    keywords: ['tomada', 'tom', '10a', 'simples', 'peca'],
  },
  {
    slug: 'peca-tomada-dupla',
    categoria: 'eletricista',
    nome: 'Tomada 10A dupla',
    precoMinimo: 34.9,
    precoTexto: 'R$ 34,90',
    descricao: 'Tomada dupla 10A. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-tomada/tipoTomada/dupla.webp',
    servicoRelacionado: 'troca-tomada',
    keywords: ['tomada', 'tom', 'dupla', 'peca'],
  },
  {
    slug: 'peca-tomada-20a',
    categoria: 'eletricista',
    nome: 'Tomada 20A',
    precoMinimo: 39.9,
    precoTexto: 'R$ 39,90',
    descricao: 'Tomada 20A. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-tomada/tipoTomada/tomada-20a.webp',
    servicoRelacionado: 'troca-tomada',
    keywords: ['tomada', 'tom', '20a', 'peca'],
  },
  {
    slug: 'peca-interruptor-simples',
    categoria: 'eletricista',
    nome: 'Interruptor simples',
    precoMinimo: 22.9,
    precoTexto: 'R$ 22,90',
    descricao: 'Interruptor simples. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-interruptor/tipoInterruptor/simples.webp',
    servicoRelacionado: 'troca-interruptor',
    keywords: ['interruptor', 'interrup', 'luz', 'peca'],
  },
  {
    slug: 'peca-interruptor-duplo',
    categoria: 'eletricista',
    nome: 'Interruptor duplo',
    precoMinimo: 29.9,
    precoTexto: 'R$ 29,90',
    descricao: 'Interruptor duplo. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-interruptor/tipoInterruptor/duplo.webp',
    servicoRelacionado: 'troca-interruptor',
    keywords: ['interruptor', 'duplo', 'peca'],
  },
  {
    slug: 'peca-interruptor-paralelo',
    categoria: 'eletricista',
    nome: 'Interruptor paralelo',
    precoMinimo: 29.9,
    precoTexto: 'R$ 29,90',
    descricao: 'Interruptor paralelo. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-interruptor/tipoInterruptor/paralelo.webp',
    servicoRelacionado: 'troca-interruptor',
    keywords: ['interruptor', 'paralelo', 'peca'],
  },
  {
    slug: 'peca-disjuntor-monopolar',
    categoria: 'eletricista',
    nome: 'Disjuntor monopolar',
    precoMinimo: 49.9,
    precoTexto: 'R$ 49,90',
    descricao: 'Disjuntor monopolar. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-disjuntor/tipoDisjuntor/monopolar.webp',
    servicoRelacionado: 'troca-disjuntor',
    keywords: ['disjuntor', 'monopolar', 'peca'],
  },
  {
    slug: 'peca-disjuntor-bipolar',
    categoria: 'eletricista',
    nome: 'Disjuntor bipolar',
    precoMinimo: 69.9,
    precoTexto: 'R$ 69,90',
    descricao: 'Disjuntor bipolar. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-disjuntor/tipoDisjuntor/bipolar.webp',
    servicoRelacionado: 'troca-disjuntor',
    keywords: ['disjuntor', 'bipolar', 'peca'],
  },
  {
    slug: 'peca-disjuntor-tripolar',
    categoria: 'eletricista',
    nome: 'Disjuntor tripolar',
    precoMinimo: 89.9,
    precoTexto: 'R$ 89,90',
    descricao: 'Disjuntor tripolar. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-disjuntor/tipoDisjuntor/tripolar.webp',
    servicoRelacionado: 'troca-disjuntor',
    keywords: ['disjuntor', 'tripolar', 'peca'],
  },
  {
    slug: 'peca-torneira-convencional',
    categoria: 'hidraulica',
    nome: 'Torneira convencional',
    precoMinimo: 79.9,
    precoTexto: 'R$ 79,90',
    descricao: 'Torneira convencional. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-torneira/tipoTorneira/convencional.webp',
    servicoRelacionado: 'troca-torneira',
    keywords: ['torneira', 'peca'],
  },
  {
    slug: 'peca-torneira-gourmet',
    categoria: 'hidraulica',
    nome: 'Torneira gourmet',
    precoMinimo: 189.9,
    precoTexto: 'R$ 189,90',
    descricao: 'Torneira gourmet. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/troca-torneira/tipoTorneira/gourmet.webp',
    servicoRelacionado: 'troca-torneira',
    keywords: ['torneira', 'gourmet', 'peca'],
  },
  {
    slug: 'peca-chuveiro-eletrico',
    categoria: 'eletricista',
    nome: 'Chuveiro elétrico',
    precoMinimo: 129.9,
    precoTexto: 'R$ 129,90',
    descricao: 'Chuveiro elétrico. Peça avulsa — instalação à parte.',
    imagemUrl: '/opcoes/instalacao-chuveiro/tipoServicoChuveiro/instalar-comum.webp',
    servicoRelacionado: 'instalacao-chuveiro',
    keywords: ['chuveiro', 'ducha', 'peca'],
  },
  {
    slug: 'peca-luminaria-plafon',
    categoria: 'eletricista',
    nome: 'Luminária plafon LED',
    precoMinimo: 89.9,
    precoTexto: 'R$ 89,90',
    descricao: 'Plafon LED. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/instalacao-luminaria/tipoLuminaria/plafon-led.webp',
    servicoRelacionado: 'instalacao-luminaria',
    keywords: ['luminaria', 'plafon', 'peca'],
  },
  {
    slug: 'peca-suporte-tv-fixo',
    categoria: 'montador',
    nome: 'Suporte de TV fixo',
    precoMinimo: 59.9,
    precoTexto: 'R$ 59,90',
    descricao: 'Suporte fixo para TV. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/instalacao-suporte-tv/tipoSuporteTv/fixo.webp',
    servicoRelacionado: 'instalacao-suporte-tv',
    keywords: ['suporte', 'tv', 'peca'],
  },
  {
    slug: 'peca-suporte-tv-articulado',
    categoria: 'montador',
    nome: 'Suporte de TV articulado',
    precoMinimo: 119.9,
    precoTexto: 'R$ 119,90',
    descricao: 'Suporte articulado para TV. Peça avulsa, sem instalação.',
    imagemUrl: '/opcoes/instalacao-suporte-tv/tipoSuporteTv/articulado.webp',
    servicoRelacionado: 'instalacao-suporte-tv',
    keywords: ['suporte', 'tv', 'articulado', 'peca'],
  },
];

export function isPecaSlug(slug: string) {
  return slug.startsWith('peca-') || PECAS_CATALOGO.some((p) => p.slug === slug);
}

export function findPeca(slug: string) {
  return PECAS_CATALOGO.find((p) => p.slug === slug) || null;
}
