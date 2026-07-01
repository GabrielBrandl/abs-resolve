-- Lembretes WhatsApp (1 dia e 2 horas antes do agendamento)
ALTER TABLE "agendamentos" ADD COLUMN IF NOT EXISTS "lembrete_1d_enviado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "agendamentos" ADD COLUMN IF NOT EXISTS "lembrete_2h_enviado" BOOLEAN NOT NULL DEFAULT false;
