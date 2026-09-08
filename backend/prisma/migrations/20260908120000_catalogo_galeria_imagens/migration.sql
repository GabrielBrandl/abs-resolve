-- Galeria de imagens para serviços e produtos de estoque
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "imagens" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "imagens" JSONB NOT NULL DEFAULT '[]';

-- Preenche galeria com a capa atual, quando existir
UPDATE "catalogo_servicos"
SET "imagens" = jsonb_build_array("imagem_url")
WHERE "imagem_url" IS NOT NULL
  AND "imagem_url" <> ''
  AND ("imagens" IS NULL OR "imagens" = '[]'::jsonb);

UPDATE "produto_estoque"
SET "imagens" = jsonb_build_array("imagem_url")
WHERE "imagem_url" IS NOT NULL
  AND "imagem_url" <> ''
  AND ("imagens" IS NULL OR "imagens" = '[]'::jsonb);
