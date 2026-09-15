-- Pendência técnica nas receitas + OS
ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "dados_tecnicos" JSONB;

ALTER TABLE "receitas_tecnicas" ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'materiais';
ALTER TABLE "receitas_tecnicas" ADD COLUMN IF NOT EXISTS "pendencia_titulo" TEXT;
ALTER TABLE "receitas_tecnicas" ADD COLUMN IF NOT EXISTS "pendencia_mensagem" TEXT;
ALTER TABLE "receitas_tecnicas" ADD COLUMN IF NOT EXISTS "pendencia_bloquear_materiais" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "receitas_tecnicas" ADD COLUMN IF NOT EXISTS "pergunta_resolucao_id" TEXT;
ALTER TABLE "receitas_tecnicas" ADD COLUMN IF NOT EXISTS "opcoes_resolucao" JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS "receitas_tecnicas_tipo_idx" ON "receitas_tecnicas"("tipo");

CREATE TABLE IF NOT EXISTS "os_pendencias_tecnicas" (
  "id" TEXT NOT NULL,
  "ordem_servico_id" TEXT NOT NULL,
  "receita_id" TEXT,
  "titulo" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "bloquear_materiais" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "resposta_original_cliente" JSONB,
  "pergunta_resolucao_id" TEXT,
  "opcoes_resolucao" JSONB NOT NULL DEFAULT '[]',
  "resolucao_opcao_id" TEXT,
  "resolucao_opcao_label" TEXT,
  "resolvido_em" TIMESTAMP(3),
  "resolvido_por_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "os_pendencias_tecnicas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "os_pendencias_tecnicas_ordem_servico_id_idx" ON "os_pendencias_tecnicas"("ordem_servico_id");
CREATE INDEX IF NOT EXISTS "os_pendencias_tecnicas_status_idx" ON "os_pendencias_tecnicas"("status");

DO $$ BEGIN
  ALTER TABLE "os_pendencias_tecnicas" ADD CONSTRAINT "os_pendencias_tecnicas_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "os_pendencias_tecnicas" ADD CONSTRAINT "os_pendencias_tecnicas_receita_id_fkey"
    FOREIGN KEY ("receita_id") REFERENCES "receitas_tecnicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
