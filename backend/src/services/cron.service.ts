import { campanhaCrmService } from './campanha-crm.service.js';
import { processarLembretesAgendamento } from './lembrete-agendamento.service.js';

let cronCampanhasInterval: ReturnType<typeof setInterval> | null = null;
let cronLembretesInterval: ReturnType<typeof setInterval> | null = null;

export function iniciarCronJobs() {
  const campanhasMs = Number(process.env.CRON_INTERVAL_MS || 3600000);
  const lembretesMs = Number(process.env.CRON_LEMBRETES_INTERVAL_MS || 900000); // 15 min

  if (!cronCampanhasInterval) {
    cronCampanhasInterval = setInterval(async () => {
      try {
        const result = await campanhaCrmService.processarPendentes();
        if (result.processadas > 0) {
          console.log(`[Cron] Campanhas processadas: ${result.processadas}`);
        }
      } catch (err) {
        console.warn('[Cron] Erro ao processar campanhas:', err);
      }
    }, campanhasMs);
    console.log(`[Cron] Campanhas CRM a cada ${campanhasMs / 60000} min`);
  }

  if (!cronLembretesInterval) {
    const rodarLembretes = async () => {
      try {
        const { enviados1d, enviados2h } = await processarLembretesAgendamento();
        if (enviados1d > 0 || enviados2h > 0) {
          console.log(`[Cron] Lembretes WhatsApp: ${enviados1d} (1d) + ${enviados2h} (2h)`);
        }
      } catch (err) {
        console.warn('[Cron] Erro nos lembretes de agendamento:', err);
      }
    };

    cronLembretesInterval = setInterval(rodarLembretes, lembretesMs);
    rodarLembretes();
    console.log(`[Cron] Lembretes agendamento a cada ${lembretesMs / 60000} min`);
  }
}

export function pararCronJobs() {
  if (cronCampanhasInterval) {
    clearInterval(cronCampanhasInterval);
    cronCampanhasInterval = null;
  }
  if (cronLembretesInterval) {
    clearInterval(cronLembretesInterval);
    cronLembretesInterval = null;
  }
}
