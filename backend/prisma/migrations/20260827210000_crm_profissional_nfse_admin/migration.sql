-- CRM profissional: valor, probabilidade, prioridade, follow-up e vínculo com cliente
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "valor_estimado" DECIMAL(12,2);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "probabilidade" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "prioridade" TEXT NOT NULL DEFAULT 'media';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "motivo_perda" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "data_prevista" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "proximo_contato" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "cliente_id" TEXT;

CREATE INDEX IF NOT EXISTS "leads_etapa_idx" ON "leads"("etapa");
CREATE INDEX IF NOT EXISTS "leads_responsavel_idx" ON "leads"("responsavel");
CREATE INDEX IF NOT EXISTS "leads_proximo_contato_idx" ON "leads"("proximo_contato");

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "nfse_status_idx" ON "nfse"("status");
CREATE INDEX IF NOT EXISTS "nfse_created_at_idx" ON "nfse"("created_at");
