import { campanhaCrmService } from './campanha-crm.service.js';

let cronInterval: ReturnType<typeof setInterval> | null = null;

export function iniciarCronJobs() {
  if (cronInterval) return;

  const intervalMs = Number(process.env.CRON_INTERVAL_MS || 3600000); // 1h

  cronInterval = setInterval(async () => {
    try {
      const result = await campanhaCrmService.processarPendentes();
      if (result.processadas > 0) {
        console.log(`[Cron] Campanhas processadas: ${result.processadas}`);
      }
    } catch (err) {
      console.warn('[Cron] Erro ao processar campanhas:', err);
    }
  }, intervalMs);

  console.log(`[Cron] Jobs iniciados (intervalo ${intervalMs / 60000} min)`);
}

export function pararCronJobs() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
