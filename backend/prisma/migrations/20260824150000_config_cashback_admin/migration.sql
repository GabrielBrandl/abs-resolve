ALTER TABLE "config_sistema" ADD COLUMN IF NOT EXISTS "cashback_percent" DECIMAL(5,4) NOT NULL DEFAULT 0.10;
ALTER TABLE "config_sistema" ADD COLUMN IF NOT EXISTS "bonus_indicacao" DECIMAL(12,2) NOT NULL DEFAULT 20;
ALTER TABLE "config_sistema" ADD COLUMN IF NOT EXISTS "garantia_padrao_dias" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "config_sistema" ADD COLUMN IF NOT EXISTS "desconto_novo_cliente_percent" DECIMAL(5,4) NOT NULL DEFAULT 0.10;
