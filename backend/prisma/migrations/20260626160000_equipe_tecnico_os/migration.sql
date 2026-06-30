-- Equipe: usuários ativos, técnicos vinculados, OS com técnico
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "tecnicos" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "tecnicos_user_id_key" ON "tecnicos"("user_id");
ALTER TABLE "tecnicos" DROP CONSTRAINT IF EXISTS "tecnicos_user_id_fkey";
ALTER TABLE "tecnicos" ADD CONSTRAINT "tecnicos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ordens_servico" ADD COLUMN IF NOT EXISTS "tecnico_id" TEXT;
ALTER TABLE "ordens_servico" DROP CONSTRAINT IF EXISTS "ordens_servico_tecnico_id_fkey";
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
