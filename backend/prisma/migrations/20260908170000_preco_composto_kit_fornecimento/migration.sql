-- Garante campos de fornecimento/kit no preço composto do ar split (UI + cálculo)
UPDATE "fluxo_servico_config"
SET
  "preco_composto" = '{
    "ativo": true,
    "perguntaCapacidadeId": "capacidadeBtu",
    "perguntaMetrosId": "distanciaEvapCond",
    "perguntaFornecimentoId": "materiaisInstalacaoAr",
    "opcoesAbsFornece": ["abs-fornece-kit"],
    "mapaMetrosOpcao": {
      "ate-2m": 2,
      "ate-3m": 3,
      "3m-5m": 5,
      "5m-7m": 7,
      "acima-7m": 8,
      "nao-sei": 2
    },
    "metrosInclusosPadrao": 2,
    "labelMaoDeObra": "Mão de obra — instalação split",
    "labelAjusteCapacidade": "Ajuste por capacidade",
    "labelKitInicial": "Kit/material inicial ABS",
    "labelMaterialIncluso": "Metros inclusos no kit de material",
    "labelMetrosExtras": "Metros adicionais de material",
    "labelClienteFornece": "Material do cliente (sem cobrança de kit/metros)",
    "faixas": [
      { "opcaoId": "ate-12000", "label": "Até 12.000 BTUs", "ajusteCapacidade": 0, "valorKitInicial": 200, "metrosInclusos": 2, "precoPorMetroExtra": 55 },
      { "opcaoId": "12001-18000", "label": "12.001 a 18.000 BTUs", "ajusteCapacidade": 100, "valorKitInicial": 200, "metrosInclusos": 2, "precoPorMetroExtra": 70 },
      { "opcaoId": "18001-24000", "label": "18.001 a 24.000 BTUs", "ajusteCapacidade": 200, "valorKitInicial": 250, "metrosInclusos": 2, "precoPorMetroExtra": 85 },
      { "opcaoId": "acima-24000", "label": "Acima de 24.000 BTUs", "ajusteCapacidade": 200, "valorKitInicial": 250, "metrosInclusos": 2, "precoPorMetroExtra": 100 },
      { "opcaoId": "nao-sei", "label": "Não sei a capacidade", "ajusteCapacidade": 0, "valorKitInicial": 200, "metrosInclusos": 2, "precoPorMetroExtra": 70 }
    ]
  }'::jsonb
WHERE "slug" = 'instalacao-ar-split';
