-- Atualiza URLs das imagens do catálogo para fotos WebP otimizadas
UPDATE "catalogo_servicos"
SET "imagem_url" = '/servicos/' || slug || '.webp'
WHERE slug IN (
  'troca-tomada',
  'troca-interruptor',
  'instalacao-chuveiro',
  'troca-disjuntor',
  'instalacao-luminaria',
  'instalacao-ventilador-teto',
  'troca-torneira',
  'troca-registro',
  'reparo-vazamento',
  'desentupimento-pia',
  'desentupimento-vaso',
  'instalacao-suporte-tv',
  'instalacao-prateleira',
  'montagem-moveis-simples',
  'montagem-guarda-roupa',
  'instalacao-persiana',
  'limpeza-ar-split',
  'instalacao-ar-split',
  'poda-jardim',
  'limpeza-pos-obra'
);
