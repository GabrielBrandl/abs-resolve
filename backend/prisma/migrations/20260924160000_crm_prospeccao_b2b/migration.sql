-- Prospecção B2B: campos de empresa/contato/segmento no Lead

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "nome_fantasia" TEXT,
  ADD COLUMN IF NOT EXISTS "segmento" TEXT,
  ADD COLUMN IF NOT EXISTS "contato_nome" TEXT,
  ADD COLUMN IF NOT EXISTS "contato_cargo" TEXT,
  ADD COLUMN IF NOT EXISTS "cidade" TEXT,
  ADD COLUMN IF NOT EXISTS "tipo_lead" TEXT NOT NULL DEFAULT 'inbound';

CREATE INDEX IF NOT EXISTS "leads_tipo_lead_idx" ON "leads"("tipo_lead");
CREATE INDEX IF NOT EXISTS "leads_segmento_idx" ON "leads"("segmento");
