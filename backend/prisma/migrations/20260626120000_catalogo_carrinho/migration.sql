-- Catálogo profissional + campos para carrinho
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "descricao" TEXT;
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "preco_texto" TEXT;
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "preco_minimo" DECIMAL(12,2);
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "tipo_preco" TEXT NOT NULL DEFAULT 'fixo';
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "garantia_dias" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "imagem_url" TEXT;
ALTER TABLE "catalogo_servicos" ADD COLUMN IF NOT EXISTS "ordem" INTEGER NOT NULL DEFAULT 0;
