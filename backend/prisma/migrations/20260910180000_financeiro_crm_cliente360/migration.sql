-- Cliente 360
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "origem" TEXT DEFAULT 'outros';
CREATE INDEX IF NOT EXISTS "clientes_telefone_idx" ON "clientes"("telefone");
CREATE INDEX IF NOT EXISTS "clientes_origem_idx" ON "clientes"("origem");

-- CRM comercial
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "status_comercial" TEXT NOT NULL DEFAULT 'em_andamento';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "data_ultima_interacao" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "proxima_acao" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pedido_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "leads_pedido_id_key" ON "leads"("pedido_id");
CREATE INDEX IF NOT EXISTS "leads_status_comercial_idx" ON "leads"("status_comercial");

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_pedido_id_fkey"
    FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Financeiro
CREATE TABLE IF NOT EXISTS "fin_categorias" (
  "id" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "grupo_dre" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_categorias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fin_categorias_tipo_nome_key" ON "fin_categorias"("tipo", "nome");
CREATE INDEX IF NOT EXISTS "fin_categorias_tipo_idx" ON "fin_categorias"("tipo");

CREATE TABLE IF NOT EXISTS "fin_subcategorias" (
  "id" TEXT NOT NULL,
  "categoria_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_subcategorias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fin_subcategorias_categoria_id_nome_key" ON "fin_subcategorias"("categoria_id", "nome");
DO $$ BEGIN
  ALTER TABLE "fin_subcategorias" ADD CONSTRAINT "fin_subcategorias_categoria_id_fkey"
    FOREIGN KEY ("categoria_id") REFERENCES "fin_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "fin_contas" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "saldo_inicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_contas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_centros_custo" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_centros_custo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fin_centros_custo_nome_key" ON "fin_centros_custo"("nome");

CREATE TABLE IF NOT EXISTS "fin_recorrencias" (
  "id" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "natureza" TEXT NOT NULL DEFAULT 'despesa',
  "categoria_id" TEXT,
  "subcategoria_id" TEXT,
  "centro_custo_id" TEXT,
  "fornecedor_nome" TEXT,
  "valor" DECIMAL(14,2) NOT NULL,
  "dia_do_mes" INTEGER NOT NULL,
  "conta_id" TEXT,
  "forma_pagamento" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "proxima_geracao" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_recorrencias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fin_lancamentos" (
  "id" TEXT NOT NULL,
  "natureza" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "categoria_id" TEXT,
  "subcategoria_id" TEXT,
  "centro_custo_id" TEXT,
  "cliente_id" TEXT,
  "fornecedor_nome" TEXT,
  "pedido_id" TEXT,
  "ordem_servico_id" TEXT,
  "pagamento_id" TEXT,
  "valor" DECIMAL(14,2) NOT NULL,
  "data_competencia" TIMESTAMP(3) NOT NULL,
  "data_vencimento" TIMESTAMP(3),
  "data_movimento" TIMESTAMP(3),
  "forma_pagamento" TEXT,
  "conta_id" TEXT,
  "conta_destino_id" TEXT,
  "status" TEXT NOT NULL,
  "recorrencia_id" TEXT,
  "anexo_url" TEXT,
  "observacoes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fin_lancamentos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "fin_lancamentos_pagamento_id_key" ON "fin_lancamentos"("pagamento_id");
CREATE INDEX IF NOT EXISTS "fin_lancamentos_natureza_status_idx" ON "fin_lancamentos"("natureza", "status");
CREATE INDEX IF NOT EXISTS "fin_lancamentos_data_competencia_idx" ON "fin_lancamentos"("data_competencia");
CREATE INDEX IF NOT EXISTS "fin_lancamentos_data_movimento_idx" ON "fin_lancamentos"("data_movimento");
CREATE INDEX IF NOT EXISTS "fin_lancamentos_data_vencimento_idx" ON "fin_lancamentos"("data_vencimento");
CREATE INDEX IF NOT EXISTS "fin_lancamentos_cliente_id_idx" ON "fin_lancamentos"("cliente_id");
CREATE INDEX IF NOT EXISTS "fin_lancamentos_pedido_id_idx" ON "fin_lancamentos"("pedido_id");

DO $$ BEGIN
  ALTER TABLE "fin_recorrencias" ADD CONSTRAINT "fin_recorrencias_categoria_id_fkey"
    FOREIGN KEY ("categoria_id") REFERENCES "fin_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_recorrencias" ADD CONSTRAINT "fin_recorrencias_subcategoria_id_fkey"
    FOREIGN KEY ("subcategoria_id") REFERENCES "fin_subcategorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_recorrencias" ADD CONSTRAINT "fin_recorrencias_centro_custo_id_fkey"
    FOREIGN KEY ("centro_custo_id") REFERENCES "fin_centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_recorrencias" ADD CONSTRAINT "fin_recorrencias_conta_id_fkey"
    FOREIGN KEY ("conta_id") REFERENCES "fin_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_categoria_id_fkey"
    FOREIGN KEY ("categoria_id") REFERENCES "fin_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_subcategoria_id_fkey"
    FOREIGN KEY ("subcategoria_id") REFERENCES "fin_subcategorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_centro_custo_id_fkey"
    FOREIGN KEY ("centro_custo_id") REFERENCES "fin_centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_pedido_id_fkey"
    FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_pagamento_id_fkey"
    FOREIGN KEY ("pagamento_id") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_conta_id_fkey"
    FOREIGN KEY ("conta_id") REFERENCES "fin_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_conta_destino_id_fkey"
    FOREIGN KEY ("conta_destino_id") REFERENCES "fin_contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "fin_lancamentos" ADD CONSTRAINT "fin_lancamentos_recorrencia_id_fkey"
    FOREIGN KEY ("recorrencia_id") REFERENCES "fin_recorrencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
