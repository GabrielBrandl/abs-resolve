-- ABS Resolve Já — regras de negócio MVP

CREATE TABLE "catalogo_servicos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL DEFAULT 1,
    "categoria" TEXT NOT NULL DEFAULT 'eletrica',
    "upsells" JSONB NOT NULL DEFAULT '[]',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalogo_servicos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "catalogo_servicos_slug_key" ON "catalogo_servicos"("slug");

CREATE TABLE "precos_fixos" (
    "id" TEXT NOT NULL,
    "servico_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "precos_fixos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "precos_fixos_servico_id_chave_key" ON "precos_fixos"("servico_id", "chave");
ALTER TABLE "precos_fixos" ADD CONSTRAINT "precos_fixos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "catalogo_servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "config_sistema" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "impostos" DECIMAL(5,4) NOT NULL DEFAULT 0.14,
    "taxa_cartao" DECIMAL(5,4) NOT NULL DEFAULT 0.04,
    "lucro" DECIMAL(5,4) NOT NULL DEFAULT 0.25,
    "overhead" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "express_valor" DECIMAL(12,2) NOT NULL DEFAULT 29,
    "taxa_cancelamento" DECIMAL(12,2) NOT NULL DEFAULT 49,
    "taxa_ausencia" DECIMAL(12,2) NOT NULL DEFAULT 49,
    CONSTRAINT "config_sistema_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "produto_estoque" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "reservado" INTEGER NOT NULL DEFAULT 0,
    "minimo" INTEGER NOT NULL DEFAULT 5,
    "critico" INTEGER NOT NULL DEFAULT 2,
    "servico_slug" TEXT,
    CONSTRAINT "produto_estoque_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "produto_estoque_sku_key" ON "produto_estoque"("sku");

CREATE TABLE "tecnicos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidade_diaria" INTEGER NOT NULL DEFAULT 6,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "solicitacoes_servico" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "servico_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "opcoes" JSONB NOT NULL DEFAULT '{}',
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "analise_ia" JSONB,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "preco_base" DECIMAL(12,2),
    "preco_final" DECIMAL(12,2),
    "upsells_selecionados" JSONB NOT NULL DEFAULT '[]',
    "nivel_complexidade" INTEGER,
    "confianca_ia" DECIMAL(5,2),
    "express" BOOLEAN NOT NULL DEFAULT false,
    "pedido_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "solicitacoes_servico_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "solicitacoes_servico_pedido_id_key" ON "solicitacoes_servico"("pedido_id");
ALTER TABLE "solicitacoes_servico" ADD CONSTRAINT "solicitacoes_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitacoes_servico" ADD CONSTRAINT "solicitacoes_servico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "catalogo_servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitacoes_servico" ADD CONSTRAINT "solicitacoes_servico_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "pedido_id" TEXT,
    "solicitacao_id" TEXT,
    "tecnico_id" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "horario_inicio" TEXT NOT NULL,
    "horario_fim" TEXT NOT NULL,
    "pontos_usados" INTEGER NOT NULL,
    "express" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'confirmado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agendamentos_solicitacao_id_key" ON "agendamentos"("solicitacao_id");
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "garantias" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "garantias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "garantias_numero_key" ON "garantias"("numero");
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "produtos_instalados" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "garantia_id" TEXT,
    CONSTRAINT "produtos_instalados_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "produtos_instalados" ADD CONSTRAINT "produtos_instalados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "checklist" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "checklist_completo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "garantia_id" TEXT;
