-- Estoque profissional: preço unitário, auditoria e vínculo com movimentações
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "preco_unitario" DECIMAL(12,2);
ALTER TABLE "produto_estoque" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "movimentacoes" ADD COLUMN IF NOT EXISTS "produto_estoque_id" TEXT;
CREATE INDEX IF NOT EXISTS "movimentacoes_produto_estoque_id_idx" ON "movimentacoes"("produto_estoque_id");
