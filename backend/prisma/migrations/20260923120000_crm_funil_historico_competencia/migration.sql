-- CRM: histórico de etapas, motivos de abandono/perda e marcos de evento
-- Competência mensal = created_at do lead (sem tabela por mês)

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "observacao_perda" TEXT,
  ADD COLUMN IF NOT EXISTS "motivo_abandono" TEXT,
  ADD COLUMN IF NOT EXISTS "observacao_abandono" TEXT,
  ADD COLUMN IF NOT EXISTS "tipo_cliente" TEXT,
  ADD COLUMN IF NOT EXISTS "data_qualificacao" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "data_orcamento" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "data_fechamento" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "data_perda" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "data_abandono" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "leads_data_fechamento_idx" ON "leads"("data_fechamento");
CREATE INDEX IF NOT EXISTS "leads_tipo_cliente_idx" ON "leads"("tipo_cliente");

CREATE TABLE IF NOT EXISTS "lead_movimentacoes" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "etapa_anterior" TEXT,
  "etapa_nova" TEXT NOT NULL,
  "motivo" TEXT,
  "observacao" TEXT,
  "usuario_id" TEXT,
  "usuario_nome" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_movimentacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_movimentacoes_lead_id_created_at_idx"
  ON "lead_movimentacoes"("lead_id", "created_at");
CREATE INDEX IF NOT EXISTS "lead_movimentacoes_etapa_nova_idx"
  ON "lead_movimentacoes"("etapa_nova");

DO $$ BEGIN
  ALTER TABLE "lead_movimentacoes"
    ADD CONSTRAINT "lead_movimentacoes_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lead_movimentacoes"
    ADD CONSTRAINT "lead_movimentacoes_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill leve: marcas a partir da etapa atual (sem inventar histórico)
UPDATE "leads"
SET "data_qualificacao" = COALESCE("data_qualificacao", "updated_at")
WHERE "etapa" IN ('qualificado', 'proposta_enviada', 'negociacao', 'fechado')
  AND "data_qualificacao" IS NULL;

UPDATE "leads"
SET "data_orcamento" = COALESCE("data_orcamento", "updated_at")
WHERE ("etapa" IN ('proposta_enviada', 'negociacao', 'fechado') OR "solicitacao_id" IS NOT NULL)
  AND "data_orcamento" IS NULL;

UPDATE "leads"
SET "data_fechamento" = COALESCE("data_fechamento", "updated_at")
WHERE "etapa" = 'fechado' AND "data_fechamento" IS NULL;

UPDATE "leads"
SET "data_perda" = COALESCE("data_perda", "updated_at")
WHERE "etapa" = 'perdido' AND "data_perda" IS NULL;
