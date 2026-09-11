-- CRM comercial: campanha, interesse no catálogo, vínculo orçamento
ALTER TABLE "leads" ALTER COLUMN "email" SET DEFAULT '';
ALTER TABLE "leads" ALTER COLUMN "interesse" SET DEFAULT '';

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "campanha" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "categoria_interesse" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "catalogo_servico_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "solicitacao_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "leads_solicitacao_id_key" ON "leads"("solicitacao_id");
CREATE INDEX IF NOT EXISTS "leads_origem_idx" ON "leads"("origem");
CREATE INDEX IF NOT EXISTS "leads_campanha_idx" ON "leads"("campanha");
CREATE INDEX IF NOT EXISTS "leads_categoria_interesse_idx" ON "leads"("categoria_interesse");
CREATE INDEX IF NOT EXISTS "leads_catalogo_servico_id_idx" ON "leads"("catalogo_servico_id");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads"("created_at");

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_catalogo_servico_id_fkey"
    FOREIGN KEY ("catalogo_servico_id") REFERENCES "catalogo_servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_solicitacao_id_fkey"
    FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "solicitacoes_servico" ADD COLUMN IF NOT EXISTS "lead_id" TEXT;
CREATE INDEX IF NOT EXISTS "solicitacoes_servico_lead_id_idx" ON "solicitacoes_servico"("lead_id");

DO $$ BEGIN
  ALTER TABLE "solicitacoes_servico" ADD CONSTRAINT "solicitacoes_servico_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
