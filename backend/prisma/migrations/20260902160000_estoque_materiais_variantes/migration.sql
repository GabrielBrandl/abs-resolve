-- AlterTable
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "tipo" TEXT;
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "cor" TEXT;
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "imagem_url" TEXT;
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "custo" DECIMAL(12,2);
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "modelo_id" TEXT;
