-- Campos de triagem B2B alinhados ao cabecalho da planilha

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "bairro" TEXT,
  ADD COLUMN IF NOT EXISTS "ligou" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "atendeu" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "contato_telefone" TEXT,
  ADD COLUMN IF NOT EXISTS "contato_email" TEXT,
  ADD COLUMN IF NOT EXISTS "contato_decisor_ok" BOOLEAN;

CREATE INDEX IF NOT EXISTS "leads_bairro_idx" ON "leads"("bairro");
