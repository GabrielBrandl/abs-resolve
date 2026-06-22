-- Campanhas CRM + métricas cliente + cancelamento agendamento

ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "ocorrencias_ausencia" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "agendamentos" ADD COLUMN IF NOT EXISTS "cancelado_em" TIMESTAMP(3);
ALTER TABLE "agendamentos" ADD COLUMN IF NOT EXISTS "taxa_cobrada" DECIMAL(12,2);

CREATE TABLE IF NOT EXISTS "campanhas_crm" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "agendada_para" TIMESTAMP(3) NOT NULL,
    "enviada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campanhas_crm_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "campanhas_crm" ADD CONSTRAINT "campanhas_crm_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
