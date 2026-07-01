CREATE TABLE "fluxo_servico_config" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "perguntas" JSONB NOT NULL DEFAULT '[]',
    "fotos_obrigatorias" JSONB NOT NULL DEFAULT '[]',
    "regras_validacao" JSONB NOT NULL DEFAULT '[]',
    "modo_preco" TEXT NOT NULL DEFAULT 'padrao',
    "preco_base" DECIMAL(12,2),
    "itens_preco" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fluxo_servico_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fluxo_servico_config_slug_key" ON "fluxo_servico_config"("slug");
