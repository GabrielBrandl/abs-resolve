-- CreateTable
CREATE TABLE "nfse" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "pagamento_id" TEXT,
    "numero" TEXT,
    "codigo_verificacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processando',
    "pdf_url" TEXT,
    "xml_url" TEXT,
    "documento_id" TEXT,
    "provider_ref" TEXT,
    "erro" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfse_pedido_id_key" ON "nfse"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "nfse_pagamento_id_key" ON "nfse"("pagamento_id");

-- AddForeignKey
ALTER TABLE "nfse" ADD CONSTRAINT "nfse_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfse" ADD CONSTRAINT "nfse_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
