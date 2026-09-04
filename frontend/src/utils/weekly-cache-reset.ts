/**
 * Limpeza semanal de cache do navegador (espelha o script do index.html).
 * Mantém login/carrinho; remove Cache Storage e Service Workers.
 */
const WEEK_KEY = 'abs-cache-week';

export function currentIsoWeekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Remove parâmetro _cw da URL após o reload semanal (limpeza cosmética). */
export function stripCacheBustQuery(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_cw')) return;
    url.searchParams.delete('_cw');
    const clean = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash;
    window.history.replaceState({}, '', clean);
  } catch {
    /* ignore */
  }
}

export async function ensureWeeklyBrowserCacheReset(): Promise<void> {
  const week = currentIsoWeekId();
  try {
    if (localStorage.getItem(WEEK_KEY) === week) return;
    localStorage.setItem(WEEK_KEY, week);
  } catch {
    return;
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}
