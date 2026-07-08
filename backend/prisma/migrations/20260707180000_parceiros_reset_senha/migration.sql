-- Reset de senha (esqueci minha senha)
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

ALTER TABLE "password_reset_tokens"
    DROP CONSTRAINT IF EXISTS "password_reset_tokens_user_id_fkey";
ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Parceiros: código de indicação, comissão e login vinculado
ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "codigo" TEXT;
ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "comissao_percent" DECIMAL(5,2) NOT NULL DEFAULT 10;
ALTER TABLE "parceiros" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "parceiros" ALTER COLUMN "categoria" SET DEFAULT 'vendas';

CREATE UNIQUE INDEX IF NOT EXISTS "parceiros_codigo_key" ON "parceiros"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "parceiros_user_id_key" ON "parceiros"("user_id");

ALTER TABLE "parceiros"
    DROP CONSTRAINT IF EXISTS "parceiros_user_id_fkey";
ALTER TABLE "parceiros"
    ADD CONSTRAINT "parceiros_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cliente indicado por parceiro
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "parceiro_id" TEXT;

ALTER TABLE "clientes"
    DROP CONSTRAINT IF EXISTS "clientes_parceiro_id_fkey";
ALTER TABLE "clientes"
    ADD CONSTRAINT "clientes_parceiro_id_fkey"
    FOREIGN KEY ("parceiro_id") REFERENCES "parceiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comissões geradas por venda
CREATE TABLE IF NOT EXISTS "comissoes" (
    "id" TEXT NOT NULL,
    "parceiro_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "pedido_id" TEXT,
    "descricao" TEXT,
    "valor_venda" DECIMAL(12,2) NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valor_comissao" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "paga_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "comissoes_pedido_id_key" ON "comissoes"("pedido_id");

ALTER TABLE "comissoes"
    DROP CONSTRAINT IF EXISTS "comissoes_parceiro_id_fkey";
ALTER TABLE "comissoes"
    ADD CONSTRAINT "comissoes_parceiro_id_fkey"
    FOREIGN KEY ("parceiro_id") REFERENCES "parceiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
