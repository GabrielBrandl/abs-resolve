-- Preço composto (capacidade × metragem) por questionário — configurável no admin
ALTER TABLE "fluxo_servico_config"
  ADD COLUMN IF NOT EXISTS "preco_composto" JSONB NOT NULL DEFAULT '{}';

-- Instalação split: ativa tabela BTU × metros (valores editáveis depois no painel)
UPDATE "fluxo_servico_config"
SET
  "modo_preco" = 'personalizado',
  "preco_base" = 699,
  "multiplicar_base_por_quantidade" = false,
  "preco_composto" = '{
    "ativo": true,
    "perguntaCapacidadeId": "capacidadeBtu",
    "perguntaMetrosId": "distanciaEvapCond",
    "mapaMetrosOpcao": {
      "ate-3m": 3,
      "3m-5m": 5,
      "5m-7m": 7,
      "acima-7m": 8,
      "nao-sei": 3
    },
    "metrosInclusosPadrao": 3,
    "labelMaoDeObra": "Mão de obra — instalação split",
    "labelMaterialIncluso": "Material incluso (até metros padrão)",
    "labelMetrosExtras": "Metros adicionais de material",
    "faixas": [
      { "opcaoId": "ate-12000", "label": "Até 12.000 BTUs", "metrosInclusos": 3, "precoPorMetroExtra": 55 },
      { "opcaoId": "12001-18000", "label": "12.001 a 18.000 BTUs", "metrosInclusos": 3, "precoPorMetroExtra": 70 },
      { "opcaoId": "18001-24000", "label": "18.001 a 24.000 BTUs", "metrosInclusos": 3, "precoPorMetroExtra": 85 },
      { "opcaoId": "acima-24000", "label": "Acima de 24.000 BTUs", "metrosInclusos": 3, "precoPorMetroExtra": 100 },
      { "opcaoId": "nao-sei", "label": "Não sei a capacidade", "metrosInclusos": 3, "precoPorMetroExtra": 70 }
    ]
  }'::jsonb,
  "itens_preco" = '[
    {
      "id": "ponto-eletrico",
      "label": "Instalação de ponto elétrico exclusivo",
      "valor": 250,
      "when": { "pontoEletricoExclusivo": ["nao"] },
      "modoCobranca": "fixo"
    },
    {
      "id": "suporte-parede",
      "label": "Suporte de parede para condensadora",
      "valor": 80,
      "when": { "localCondensadora": ["suporte-parede"] },
      "modoCobranca": "fixo"
    }
  ]'::jsonb
WHERE "slug" = 'instalacao-ar-split';
