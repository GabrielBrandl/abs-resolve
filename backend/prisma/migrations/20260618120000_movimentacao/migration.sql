-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2),
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "responsavel" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);
