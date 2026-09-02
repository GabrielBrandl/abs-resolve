/**
 * Catálogo de materiais vendidos junto com serviços (torneira, chuveiro, etc.).
 * Estoque real fica em ProdutoEstoque (SKU = variante.sku).
 */

export type MaterialVarianteDef = {
  sku: string;
  cor: string;
  labelCor: string;
  preco: number;
  imagemUrl: string;
  /** Estoque sugerido no sync inicial (só cria se SKU novo). */
  estoqueInicial?: number;
};

export type MaterialModeloDef = {
  id: string;
  tipo: string;
  nome: string;
  /** Ex.: "Bica flexível" */
  detalhe?: string;
  variantes: MaterialVarianteDef[];
};

export type MaterialServicoConfig = {
  servicoSlug: string;
  /** Id da pergunta "já possui / já comprou?" */
  perguntaPossuiId: string;
  /** Opções que abrem o catálogo ABS */
  opcoesComprarAbs: string[];
  /** Pergunta de tipo (convencional, gourmet…) — se vazia, lista todos os modelos */
  perguntaTipoId?: string;
  labelProduto: string;
  tipos: Array<{ id: string; label: string }>;
  modelos: MaterialModeloDef[];
};

export const MATERIAIS_POR_SERVICO: Record<string, MaterialServicoConfig> = {
  'troca-torneira': {
    servicoSlug: 'troca-torneira',
    perguntaPossuiId: 'torneiraComprada',
    opcoesComprarAbs: ['nao'],
    perguntaTipoId: 'tipoTorneira',
    labelProduto: 'Torneira',
    tipos: [
      { id: 'convencional', label: 'Convencional' },
      { id: 'gourmet', label: 'Gourmet' },
      { id: 'monocomando-misturador', label: 'Monocomando/Misturador' },
      { id: 'eletrica', label: 'Elétrica' },
    ],
    modelos: [
      {
        id: 'torneira-convencional-basica',
        tipo: 'convencional',
        nome: 'Torneira Convencional Básica',
        detalhe: 'Uso geral',
        variantes: [
          {
            sku: 'mat-torneira-conv-cromado',
            cor: 'cromado',
            labelCor: 'Cromado',
            preco: 79,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/convencional.webp',
            estoqueInicial: 20,
          },
          {
            sku: 'mat-torneira-conv-preto',
            cor: 'preto',
            labelCor: 'Preto',
            preco: 89,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/convencional.webp',
            estoqueInicial: 12,
          },
        ],
      },
      {
        id: 'torneira-gourmet-black',
        tipo: 'gourmet',
        nome: 'Gourmet Black',
        detalhe: 'Bica flexível',
        variantes: [
          {
            sku: 'mat-torneira-gourmet-preto',
            cor: 'preto',
            labelCor: 'Preta',
            preco: 89,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/gourmet.webp',
            estoqueInicial: 15,
          },
          {
            sku: 'mat-torneira-gourmet-cromado',
            cor: 'cromado',
            labelCor: 'Cromado',
            preco: 99,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/gourmet.webp',
            estoqueInicial: 10,
          },
          {
            sku: 'mat-torneira-gourmet-dourado',
            cor: 'dourado',
            labelCor: 'Dourado',
            preco: 129,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/gourmet.webp',
            estoqueInicial: 6,
          },
        ],
      },
      {
        id: 'torneira-gourmet-inox',
        tipo: 'gourmet',
        nome: 'Gourmet Inox Pro',
        detalhe: 'Bica alta • Inox',
        variantes: [
          {
            sku: 'mat-torneira-gourmet-inox',
            cor: 'inox',
            labelCor: 'Inox',
            preco: 149,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/gourmet.webp',
            estoqueInicial: 8,
          },
        ],
      },
      {
        id: 'torneira-monocomando',
        tipo: 'monocomando-misturador',
        nome: 'Monocomando Mesa',
        detalhe: 'Misturador',
        variantes: [
          {
            sku: 'mat-torneira-mono-cromado',
            cor: 'cromado',
            labelCor: 'Cromado',
            preco: 159,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/monocomando-misturador.webp',
            estoqueInicial: 10,
          },
          {
            sku: 'mat-torneira-mono-preto',
            cor: 'preto',
            labelCor: 'Preto',
            preco: 179,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/monocomando-misturador.webp',
            estoqueInicial: 8,
          },
        ],
      },
      {
        id: 'torneira-eletrica',
        tipo: 'eletrica',
        nome: 'Torneira Elétrica Compacta',
        detalhe: '127/220V',
        variantes: [
          {
            sku: 'mat-torneira-eletrica-branca',
            cor: 'branco',
            labelCor: 'Branca',
            preco: 189,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/eletrica.webp',
            estoqueInicial: 8,
          },
          {
            sku: 'mat-torneira-eletrica-preta',
            cor: 'preto',
            labelCor: 'Preta',
            preco: 199,
            imagemUrl: '/opcoes/troca-torneira/tipoTorneira/eletrica.webp',
            estoqueInicial: 6,
          },
        ],
      },
    ],
  },
  'instalacao-chuveiro': {
    servicoSlug: 'instalacao-chuveiro',
    perguntaPossuiId: 'chuveiroComprado',
    opcoesComprarAbs: ['nao-abs'],
    perguntaTipoId: 'tipoServicoChuveiro',
    labelProduto: 'Chuveiro',
    tipos: [
      { id: 'instalar-comum', label: 'Chuveiro comum' },
      { id: 'instalar-eletronico', label: 'Chuveiro eletrônico' },
      { id: 'instalar-com-revisao-eletrica', label: 'Com revisão elétrica' },
    ],
    modelos: [
      {
        id: 'chuveiro-comum-lorenzetti',
        tipo: 'instalar-comum',
        nome: 'Chuveiro Elétrico 5500W',
        detalhe: 'Uso residencial',
        variantes: [
          {
            sku: 'mat-chuveiro-comum-branco',
            cor: 'branco',
            labelCor: 'Branco',
            preco: 129,
            imagemUrl: '/opcoes/instalacao-chuveiro/tipoServicoChuveiro/instalar-comum.webp',
            estoqueInicial: 12,
          },
          {
            sku: 'mat-chuveiro-comum-cinza',
            cor: 'cinza',
            labelCor: 'Cinza',
            preco: 139,
            imagemUrl: '/opcoes/instalacao-chuveiro/tipoServicoChuveiro/instalar-comum.webp',
            estoqueInicial: 8,
          },
        ],
      },
      {
        id: 'chuveiro-eletronico',
        tipo: 'instalar-eletronico',
        nome: 'Chuveiro Eletrônico Digital',
        detalhe: 'Temperatura ajustável',
        variantes: [
          {
            sku: 'mat-chuveiro-eletro-branco',
            cor: 'branco',
            labelCor: 'Branco',
            preco: 249,
            imagemUrl: '/opcoes/instalacao-chuveiro/tipoServicoChuveiro/instalar-eletronico.webp',
            estoqueInicial: 6,
          },
          {
            sku: 'mat-chuveiro-eletro-preto',
            cor: 'preto',
            labelCor: 'Preto',
            preco: 269,
            imagemUrl: '/opcoes/instalacao-chuveiro/tipoServicoChuveiro/instalar-eletronico.webp',
            estoqueInicial: 5,
          },
        ],
      },
      {
        id: 'chuveiro-revisao-kit',
        tipo: 'instalar-com-revisao-eletrica',
        nome: 'Kit Chuveiro + revisão',
        detalhe: 'Modelo padrão ABS',
        variantes: [
          {
            sku: 'mat-chuveiro-kit-branco',
            cor: 'branco',
            labelCor: 'Branco',
            preco: 159,
            imagemUrl: '/opcoes/instalacao-chuveiro/tipoServicoChuveiro/instalar-com-revisao-eletrica.webp',
            estoqueInicial: 7,
          },
        ],
      },
    ],
  },
};

export function getMaterialConfig(servicoSlug: string) {
  return MATERIAIS_POR_SERVICO[servicoSlug] || null;
}

export function listarTodasVariantesMateriais() {
  const out: Array<{
    sku: string;
    nome: string;
    preco: number;
    servicoSlug: string;
    tipo: string;
    cor: string;
    imagemUrl: string;
    modeloId: string;
    estoqueInicial: number;
  }> = [];

  for (const cfg of Object.values(MATERIAIS_POR_SERVICO)) {
    for (const modelo of cfg.modelos) {
      for (const v of modelo.variantes) {
        out.push({
          sku: v.sku,
          nome: `${modelo.nome} — ${v.labelCor}`,
          preco: v.preco,
          servicoSlug: cfg.servicoSlug,
          tipo: modelo.tipo,
          cor: v.cor,
          imagemUrl: v.imagemUrl,
          modeloId: modelo.id,
          estoqueInicial: v.estoqueInicial ?? 0,
        });
      }
    }
  }
  return out;
}

export function findMaterialVariante(sku: string) {
  const key = sku.trim().toLowerCase();
  for (const cfg of Object.values(MATERIAIS_POR_SERVICO)) {
    for (const modelo of cfg.modelos) {
      const variante = modelo.variantes.find((v) => v.sku === key);
      if (variante) {
        return {
          servicoSlug: cfg.servicoSlug,
          labelProduto: cfg.labelProduto,
          modelo,
          variante,
          nome: `${modelo.nome} — ${variante.labelCor}`,
        };
      }
    }
  }
  return null;
}

export function isMaterialSku(sku: string) {
  return Boolean(findMaterialVariante(sku));
}
