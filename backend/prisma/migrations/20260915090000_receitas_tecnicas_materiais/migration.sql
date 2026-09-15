-- Receitas Técnicas de Materiais + snapshot na OS
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "materiais_snapshot" JSONB;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "materiais_ajuste_manual" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "receitas_tecnicas" (
  "id" TEXT NOT NULL,
  "catalogo_servico_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "pergunta_fornecimento_id" TEXT,
  "opcoes_abs_fornece" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receitas_tecnicas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "receitas_tecnicas_catalogo_servico_id_idx" ON "receitas_tecnicas"("catalogo_servico_id");
CREATE INDEX IF NOT EXISTS "receitas_tecnicas_ativo_idx" ON "receitas_tecnicas"("ativo");

DO $$ BEGIN
  ALTER TABLE "receitas_tecnicas" ADD CONSTRAINT "receitas_tecnicas_catalogo_servico_id_fkey"
    FOREIGN KEY ("catalogo_servico_id") REFERENCES "catalogo_servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "receita_condicoes" (
  "id" TEXT NOT NULL,
  "receita_id" TEXT NOT NULL,
  "pergunta_id" TEXT NOT NULL,
  "opcao_ids" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "receita_condicoes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "receita_condicoes_receita_id_idx" ON "receita_condicoes"("receita_id");
DO $$ BEGIN
  ALTER TABLE "receita_condicoes" ADD CONSTRAINT "receita_condicoes_receita_id_fkey"
    FOREIGN KEY ("receita_id") REFERENCES "receitas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "receita_materiais" (
  "id" TEXT NOT NULL,
  "receita_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "especificacao" TEXT,
  "bitola_modelo" TEXT,
  "unidade" TEXT NOT NULL DEFAULT 'unidade',
  "tipo_calculo" TEXT NOT NULL,
  "fator" DECIMAL(12,4) NOT NULL DEFAULT 1,
  "pergunta_ref_id" TEXT,
  "bloco_x" DECIMAL(12,4),
  "bloco_y" DECIMAL(12,4),
  "fixo_escopo" TEXT,
  "quantidade_fixa" DECIMAL(12,4),
  "observacao_interna" TEXT,
  "custo_unitario" DECIMAL(12,2),
  "consumivel_operacional" BOOLEAN NOT NULL DEFAULT false,
  "produto_estoque_id" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receita_materiais_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "receita_materiais_receita_id_idx" ON "receita_materiais"("receita_id");
DO $$ BEGIN
  ALTER TABLE "receita_materiais" ADD CONSTRAINT "receita_materiais_receita_id_fkey"
    FOREIGN KEY ("receita_id") REFERENCES "receitas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "os_materiais" (
  "id" TEXT NOT NULL,
  "ordem_servico_id" TEXT NOT NULL,
  "receita_id" TEXT,
  "receita_material_id" TEXT,
  "nome" TEXT NOT NULL,
  "especificacao" TEXT,
  "bitola_modelo" TEXT,
  "unidade" TEXT NOT NULL DEFAULT 'unidade',
  "quantidade" DECIMAL(12,4) NOT NULL,
  "custo_unitario" DECIMAL(12,2),
  "custo_previsto" DECIMAL(12,2),
  "observacao" TEXT,
  "origem" TEXT NOT NULL DEFAULT 'automatico',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "os_materiais_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "os_materiais_ordem_servico_id_idx" ON "os_materiais"("ordem_servico_id");
DO $$ BEGIN
  ALTER TABLE "os_materiais" ADD CONSTRAINT "os_materiais_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
