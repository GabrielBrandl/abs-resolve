-- AlterTable FinLancamento
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "valor_pago" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "juros_pago" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "multa_paga" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "desconto_concedido" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "taxa_paga" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "parcela_numero" INTEGER;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "parcela_total" INTEGER;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "grupo_parcelas_id" TEXT;
ALTER TABLE "fin_lancamentos" ADD COLUMN IF NOT EXISTS "historico" JSONB;

CREATE INDEX IF NOT EXISTS "fin_lancamentos_grupo_parcelas_id_idx" ON "fin_lancamentos"("grupo_parcelas_id");

-- CreateTable FinBaixa
CREATE TABLE IF NOT EXISTS "fin_baixas" (
    "id" TEXT NOT NULL,
    "lancamento_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'baixa',
    "data_movimento" TIMESTAMP(3) NOT NULL,
    "valor_principal" DECIMAL(14,2) NOT NULL,
    "juros" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "multa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_liquido" DECIMAL(14,2) NOT NULL,
    "conta_id" TEXT,
    "forma_pagamento" TEXT,
    "anexo_url" TEXT,
    "observacoes" TEXT,
    "usuario_id" TEXT,
    "estornado" BOOLEAN NOT NULL DEFAULT false,
    "baixa_origem_id" TEXT,
    "asaas_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fin_baixas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fin_baixas_lancamento_id_idx" ON "fin_baixas"("lancamento_id");
CREATE INDEX IF NOT EXISTS "fin_baixas_data_movimento_idx" ON "fin_baixas"("data_movimento");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fin_baixas_lancamento_id_fkey') THEN
    ALTER TABLE "fin_baixas" ADD CONSTRAINT "fin_baixas_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "fin_lancamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fin_baixas_conta_id_fkey') THEN
    ALTER TABLE "fin_baixas" ADD CONSTRAINT "fin_baixas_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "fin_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
