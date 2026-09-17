-- AlterTable
ALTER TABLE "config_sistema" ADD COLUMN IF NOT EXISTS "minimo_carrinho_servico" DECIMAL(12,2) NOT NULL DEFAULT 150;
