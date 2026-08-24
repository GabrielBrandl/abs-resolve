ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "relacionados" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "fluxo_servico_config" ADD COLUMN IF NOT EXISTS "pergunta_quantidade_id" TEXT;
ALTER TABLE "fluxo_servico_config" ADD COLUMN IF NOT EXISTS "multiplicar_base_por_quantidade" BOOLEAN NOT NULL DEFAULT true;
