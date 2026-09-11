-- Peças avulsas desligadas por padrão na vitrine
ALTER TABLE "config_sistema" ADD COLUMN IF NOT EXISTS "pecas_avulsas_ativas" BOOLEAN NOT NULL DEFAULT false;
