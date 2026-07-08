CREATE TABLE IF NOT EXISTS "ia_conhecimento" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'geral',
    "servico_slug" TEXT,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_conhecimento_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ia_conhecimento"
    DROP CONSTRAINT IF EXISTS "ia_conhecimento_admin_id_fkey";
ALTER TABLE "ia_conhecimento"
    ADD CONSTRAINT "ia_conhecimento_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Serviços com preço definido mas marcados como sob orçamento → preço fixo
UPDATE "catalogo_servicos"
SET "tipo_preco" = 'fixo'
WHERE "tipo_preco" = 'sob_orcamento'
  AND "preco_minimo" IS NOT NULL
  AND "preco_minimo" > 0;
