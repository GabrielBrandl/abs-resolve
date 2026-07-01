/** Pergunta principal de "tipo" por serviço — usada para trocar a imagem ao selecionar */
export const PERGUNTA_TIPO_POR_SLUG: Record<string, string> = {
  'troca-tomada': 'tipoTomada',
  'troca-interruptor': 'tipoInterruptor',
  'instalacao-chuveiro': 'tipoServicoChuveiro',
  'troca-disjuntor': 'tipoDisjuntor',
  'instalacao-luminaria': 'tipoLuminaria',
  'instalacao-ventilador-teto': 'tipoVentilador',
  'troca-torneira': 'tipoTorneira',
  'troca-registro': 'tipoRegistro',
  'reparo-vazamento': 'localVazamento',
  'desentupimento-pia': 'localEntupimento',
  'desentupimento-vaso': 'localEntupimento',
  'instalacao-suporte-tv': 'tipoSuporteTv',
  'instalacao-prateleira': 'materialParede',
  'montagem-moveis-simples': 'tipoMovelSimples',
  'montagem-guarda-roupa': 'tipoGuardaRoupa',
  'instalacao-persiana': 'tipoPersiana',
  'limpeza-ar-split': 'quantidadeAparelhos',
  'instalacao-ar-split': 'tipoEquipamentoAr',
  'poda-jardim': 'tipoServicoJardim',
  'limpeza-pos-obra': 'tipoImovelPosObra',
};

const U = (id: string, w = 400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=300&q=80`;

/** Imagens por slug → opcaoId (Unsplash — elétrica, hidráulica, montagem) */
export const IMAGENS_POR_OPCAO: Record<string, Record<string, string>> = {
  'troca-tomada': {
    simples: U('photo-1621905251189-08b45d6a269e'),
    dupla: U('photo-1558618666-fcd25c85cd64'),
    'tomada-20a': U('photo-1581092160562-40aa08e78837'),
  },
  'troca-interruptor': {
    simples: U('photo-1558002038-1055907df827'),
    duplo: U('photo-1558618666-fcd25c85cd64'),
    triplo: U('photo-1621905251189-08b45d6a269e'),
    paralelo: U('photo-1581092160562-40aa08e78837'),
    intermediario: U('photo-1558002038-1055907df827'),
  },
  'instalacao-chuveiro': {
    'troca-chuveiro': U('photo-1584622651406-152c8e4a2b0a'),
    'instalacao-nova': U('photo-1620626011761-996317b8d101'),
    'manutencao': U('photo-1584622651406-152c8e4a2b0a'),
  },
  'troca-disjuntor': {
    monopolar: U('photo-1621905251189-08b45d6a269e'),
    bipolar: U('photo-1581092160562-40aa08e78837'),
    tripolar: U('photo-1558002038-1055907df827'),
    dr: U('photo-1558618666-fcd25c85cd64'),
  },
  'instalacao-luminaria': {
    plafon: U('photo-1513506003901-1e6a229e2d15'),
    pendente: U('photo-1524484383025-c966d6e66a64'),
    spot: U('photo-1565814329452-e1efa11c5b89'),
    arandela: U('photo-1513506003901-1e6a229e2d15'),
  },
  'instalacao-ventilador-teto': {
    'com-luz': U('photo-1585771724684-b382ae53c970'),
    'sem-luz': U('photo-1585771724684-b382ae53c970'),
  },
  'troca-torneira': {
    cozinha: U('photo-1584622651406-152c8e4a2b0a'),
    banheiro: U('photo-1620626011761-996317b8d101'),
    tanque: U('photo-1584622651406-152c8e4a2b0a'),
    jardim: U('photo-1416879595882-3373a0480b0b'),
  },
  'troca-registro': {
    pressao: U('photo-1620626011761-996317b8d101'),
    gaveta: U('photo-1584622651406-152c8e4a2b0a'),
    esfera: U('photo-1620626011761-996317b8d101'),
  },
  'reparo-vazamento': {
    torneira: U('photo-1584622651406-152c8e4a2b0a'),
    registro: U('photo-1620626011761-996317b8d101'),
    cano: U('photo-1584622651406-152c8e4a2b0a'),
    'caixa-agua': U('photo-1620626011761-996317b8d101'),
  },
  'desentupimento-pia': {
    cozinha: U('photo-1584622651406-152c8e4a2b0a'),
    banheiro: U('photo-1620626011761-996317b8d101'),
  },
  'desentupimento-vaso': {
    vaso: U('photo-1620626011761-996317b8d101'),
    ralo: U('photo-1584622651406-152c8e4a2b0a'),
  },
  'instalacao-suporte-tv': {
    fixo: U('photo-1593359677878-bc67bdada2e4'),
    inclinado: U('photo-1593359677878-bc67bdada2e4'),
    articulado: U('photo-1593359677878-bc67bdada2e4'),
  },
  'instalacao-prateleira': {
    alvenaria: U('photo-1586023492125-27b2c045efd7'),
    drywall: U('photo-1586023492125-27b2c045efd7'),
    madeira: U('photo-1586023492125-27b2c045efd7'),
  },
  'montagem-moveis-simples': {
    mesa: U('photo-1586023492125-27b2c045efd7'),
    cadeira: U('photo-1586023492125-27b2c045efd7'),
    estante: U('photo-1586023492125-27b2c045efd7'),
    rack: U('photo-1593359677878-bc67bdada2e4'),
  },
  'montagem-guarda-roupa': {
    casal: U('photo-1586023492125-27b2c045efd7'),
    solteiro: U('photo-1586023492125-27b2c045efd7'),
    infantil: U('photo-1586023492125-27b2c045efd7'),
  },
  'instalacao-persiana': {
    rolo: U('photo-1513506003901-1e6a229e2d15'),
    horizontal: U('photo-1513506003901-1e6a229e2d15'),
    painel: U('photo-1513506003901-1e6a229e2d15'),
  },
  'limpeza-ar-split': {
    '1': U('photo-1631545806609-2f2f1b2e8b2e'),
    '2': U('photo-1631545806609-2f2f1b2e8b2e'),
    '3': U('photo-1631545806609-2f2f1b2e8b2e'),
  },
  'instalacao-ar-split': {
    hiwall: U('photo-1631545806609-2f2f1b2e8b2e'),
    cassete: U('photo-1631545806609-2f2f1b2e8b2e'),
  },
  'poda-jardim': {
    poda: U('photo-1416879595882-3373a0480b0b'),
    corte: U('photo-1416879595882-3373a0480b0b'),
  },
  'limpeza-pos-obra': {
    apartamento: U('photo-1581578731546-249711cfb1e4'),
    casa: U('photo-1581578731546-249711cfb1e4'),
    comercial: U('photo-1581578731546-249711cfb1e4'),
  },
};

export const MARGEM_ERRO_IA_PERCENT = 15;

export function imagemParaOpcao(slug: string, opcaoId: string, fallback?: string | null): string {
  return IMAGENS_POR_OPCAO[slug]?.[opcaoId] ?? fallback ?? `/servicos/${slug}.png`;
}

export function imagemServicoComRespostas(
  slug: string,
  respostas: Record<string, string>,
  imagemCatalogo?: string | null
): string {
  const perguntaTipo = PERGUNTA_TIPO_POR_SLUG[slug];
  if (perguntaTipo && respostas[perguntaTipo]) {
    return imagemParaOpcao(slug, respostas[perguntaTipo], imagemCatalogo);
  }
  return imagemCatalogo || `/servicos/${slug}.png`;
}
