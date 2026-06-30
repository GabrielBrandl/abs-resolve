-- Avaliacoes pos-servico
CREATE TABLE IF NOT EXISTS "avaliacoes" (
    "id" TEXT NOT NULL,
    "ordem_servico_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "avaliacoes_ordem_servico_id_key" ON "avaliacoes"("ordem_servico_id");

ALTER TABLE "avaliacoes" DROP CONSTRAINT IF EXISTS "avaliacoes_ordem_servico_id_fkey";
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
