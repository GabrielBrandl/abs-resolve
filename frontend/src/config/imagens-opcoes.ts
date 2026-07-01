import manifest from './opcoes-imagens-manifest.json';

/** Pergunta principal de produto/tipo — prioridade na imagem lateral do serviço */
export const PERGUNTA_TIPO_POR_SLUG: Record<string, string> = {
  'troca-tomada': 'tipoTomada',
  'troca-interruptor': 'tipoInterruptor',
  'instalacao-chuveiro': 'tipoServicoChuveiro',
  'troca-disjuntor': 'tipoDisjuntor',
  'instalacao-luminaria': 'tipoLuminaria',
  'instalacao-ventilador-teto': 'tipoVentilador',
  'troca-torneira': 'tipoTorneira',
  'troca-registro': 'tipoRegistro',
  'reparo-vazamento': 'origemVazamento',
  'desentupimento-pia': 'problemaDesentupimento',
  'desentupimento-vaso': 'problemaDesentupimento',
  'instalacao-suporte-tv': 'tipoSuporteTv',
  'instalacao-prateleira': 'usoPrateleira',
  'montagem-moveis-simples': 'tipoMovelSimples',
  'montagem-guarda-roupa': 'tipoGuardaRoupa',
  'instalacao-persiana': 'tipoPersiana',
  'limpeza-ar-split': 'sintomaAr',
  'instalacao-ar-split': 'tipoEquipamentoAr',
  'poda-jardim': 'servicoJardim',
  'limpeza-pos-obra': 'tipoImovelPosObra',
};

const chavesComImagem = new Set(
  (manifest as Array<{ slug: string; perguntaId: string; opcaoId: string }>).map(
    (item) => `${item.slug}/${item.perguntaId}/${item.opcaoId}`
  )
);

export const MARGEM_ERRO_IA_PERCENT = 15;

export function caminhoImagemOpcao(slug: string, perguntaId: string, opcaoId: string): string {
  return `/opcoes/${slug}/${perguntaId}/${opcaoId}.svg`;
}

export function temImagemOpcao(slug: string, perguntaId: string, opcaoId: string): boolean {
  return chavesComImagem.has(`${slug}/${perguntaId}/${opcaoId}`);
}

export function imagemParaOpcao(
  slug: string,
  perguntaId: string,
  opcaoId: string,
  fallback?: string | null
): string {
  if (temImagemOpcao(slug, perguntaId, opcaoId)) {
    return caminhoImagemOpcao(slug, perguntaId, opcaoId);
  }
  return fallback ?? `/servicos/${slug}.webp`;
}

export function imagemServicoComRespostas(
  slug: string,
  respostas: Record<string, string>,
  imagemCatalogo?: string | null
): string {
  const perguntaTipo = PERGUNTA_TIPO_POR_SLUG[slug];
  if (perguntaTipo && respostas[perguntaTipo]) {
    return imagemParaOpcao(slug, perguntaTipo, respostas[perguntaTipo], imagemCatalogo);
  }

  for (const [perguntaId, opcaoId] of Object.entries(respostas)) {
    if (temImagemOpcao(slug, perguntaId, opcaoId)) {
      return imagemParaOpcao(slug, perguntaId, opcaoId, imagemCatalogo);
    }
  }

  return imagemCatalogo || `/servicos/${slug}.webp`;
}
