/** Helpers de período e status do módulo financeiro / dashboard. */

export type PeriodoPreset = 'hoje' | '7d' | '30d' | 'mes' | 'mes_passado' | 'ano' | 'personalizado';

export function ymdBrasil(ref = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ref);
}

/** Início do dia em America/Sao_Paulo como Date UTC-equivalente para queries. */
export function inicioDiaBrasil(ymd: string): Date {
  return new Date(`${ymd}T00:00:00-03:00`);
}

export function fimDiaBrasil(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999-03:00`);
}

export function addDiasYmd(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias, 15, 0, 0));
  return ymdBrasil(dt);
}

export function resolverPeriodo(params: {
  periodo?: string;
  de?: string;
  ate?: string;
  ref?: Date;
}): { inicio: Date; fim: Date; inicioYmd: string; fimYmd: string; label: string } {
  const ref = params.ref ?? new Date();
  const hoje = ymdBrasil(ref);
  const [y, m] = hoje.split('-').map(Number);
  const periodo = (params.periodo || 'mes') as PeriodoPreset;

  let inicioYmd = hoje;
  let fimYmd = hoje;
  let label = 'Hoje';

  switch (periodo) {
    case 'hoje':
      label = 'Hoje';
      break;
    case '7d':
      inicioYmd = addDiasYmd(hoje, -6);
      label = '7 dias';
      break;
    case '30d':
      inicioYmd = addDiasYmd(hoje, -29);
      label = '30 dias';
      break;
    case 'mes':
      inicioYmd = `${y}-${String(m).padStart(2, '0')}-01`;
      label = 'Este mês';
      break;
    case 'mes_passado': {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      inicioYmd = `${py}-${String(pm).padStart(2, '0')}-01`;
      const ultimoDia = new Date(Date.UTC(py, pm, 0, 15)).getUTCDate();
      fimYmd = `${py}-${String(pm).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      label = 'Mês passado';
      break;
    }
    case 'ano':
      inicioYmd = `${y}-01-01`;
      label = 'Este ano';
      break;
    case 'personalizado':
      if (params.de) inicioYmd = params.de.slice(0, 10);
      if (params.ate) fimYmd = params.ate.slice(0, 10);
      label = 'Personalizado';
      break;
    default:
      inicioYmd = `${y}-${String(m).padStart(2, '0')}-01`;
      label = 'Este mês';
  }

  return {
    inicio: inicioDiaBrasil(inicioYmd),
    fim: fimDiaBrasil(fimYmd),
    inicioYmd,
    fimYmd,
    label,
  };
}

/** Período anterior de mesma duração (para comparação %). */
export function periodoAnteriorEquivalente(inicioYmd: string, fimYmd: string) {
  const [yi, mi, di] = inicioYmd.split('-').map(Number);
  const [yf, mf, df] = fimYmd.split('-').map(Number);
  const inicio = Date.UTC(yi, mi - 1, di);
  const fim = Date.UTC(yf, mf - 1, df);
  const dias = Math.round((fim - inicio) / 86400000) + 1;
  const fimAnt = addDiasYmd(inicioYmd, -1);
  const inicioAnt = addDiasYmd(fimAnt, -(dias - 1));
  return {
    inicio: inicioDiaBrasil(inicioAnt),
    fim: fimDiaBrasil(fimAnt),
    inicioYmd: inicioAnt,
    fimYmd: fimAnt,
  };
}

export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10;
}

export const MOTIVOS_PERDA = [
  'Preço alto',
  'Demora no atendimento',
  'Cliente desistiu',
  'Contratou concorrente',
  'Sem disponibilidade de agenda',
  'Serviço fora do escopo',
  'Não respondeu',
  'Forma de pagamento',
  'Outro',
] as const;

export const STATUS_COMERCIAL = [
  'em_andamento',
  'aguardando_cliente',
  'fechado_ganho',
  'perdido',
] as const;

export const ORIGENS_COMERCIAIS = [
  'whatsapp',
  'site',
  'meta_ads',
  'instagram',
  'google',
  'indicacao',
  'recorrente',
  'outros',
] as const;

export function normalizarOrigem(origem?: string | null): string {
  const o = (origem || 'outros').toLowerCase().trim();
  const map: Record<string, string> = {
    whatsapp: 'whatsapp',
    wa: 'whatsapp',
    site: 'site',
    web: 'site',
    loja: 'site',
    meta: 'meta_ads',
    meta_ads: 'meta_ads',
    facebook: 'meta_ads',
    instagram: 'instagram',
    ig: 'instagram',
    google: 'google',
    ads: 'google',
    indicacao: 'indicacao',
    indicação: 'indicacao',
    parceiro: 'indicacao',
    recorrente: 'recorrente',
    consultor_site: 'site',
    manual: 'outros',
    outros: 'outros',
  };
  return map[o] || 'outros';
}

export type StatusReceita = 'prevista' | 'a_receber' | 'recebida' | 'vencida' | 'cancelada' | 'estornada';
export type StatusDespesa = 'prevista' | 'a_pagar' | 'paga' | 'vencida' | 'cancelada';

export function statusReceitaEfetivo(
  status: string,
  dataVencimento: Date | null | undefined,
  agora = new Date()
): string {
  if (['recebida', 'cancelada', 'estornada'].includes(status)) return status;
  if (dataVencimento && dataVencimento < agora && ['prevista', 'a_receber'].includes(status)) {
    return 'vencida';
  }
  return status;
}

export function statusDespesaEfetivo(
  status: string,
  dataVencimento: Date | null | undefined,
  agora = new Date()
): string {
  if (['paga', 'cancelada'].includes(status)) return status;
  if (dataVencimento && dataVencimento < agora && ['prevista', 'a_pagar'].includes(status)) {
    return 'vencida';
  }
  return status;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
