import { describe, it, expect } from 'vitest';
import {
  resolverPeriodo,
  periodoAnteriorEquivalente,
  variacaoPercentual,
  statusReceitaEfetivo,
  statusDespesaEfetivo,
  normalizarOrigem,
  ymdBrasil,
} from '../utils/periodo.js';

describe('periodo', () => {
  const ref = new Date('2026-09-10T15:00:00-03:00');

  it('resolve este mês', () => {
    const p = resolverPeriodo({ periodo: 'mes', ref });
    expect(p.inicioYmd).toBe('2026-09-01');
    expect(p.fimYmd).toBe('2026-09-10');
  });

  it('resolve mês passado', () => {
    const p = resolverPeriodo({ periodo: 'mes_passado', ref });
    expect(p.inicioYmd).toBe('2026-08-01');
    expect(p.fimYmd).toBe('2026-08-31');
  });

  it('período anterior equivalente tem mesma duração', () => {
    const p = resolverPeriodo({ periodo: '7d', ref });
    const ant = periodoAnteriorEquivalente(p.inicioYmd, p.fimYmd);
    expect(ant.fimYmd).toBe('2026-09-03');
    expect(ant.inicioYmd).toBe('2026-08-28');
  });

  it('variação percentual', () => {
    expect(variacaoPercentual(110, 100)).toBe(10);
    expect(variacaoPercentual(0, 0)).toBe(0);
    expect(variacaoPercentual(50, 0)).toBeNull();
  });
});

describe('status financeiros', () => {
  const agora = new Date('2026-09-10T12:00:00Z');
  it('receita vencida por vencimento', () => {
    expect(statusReceitaEfetivo('a_receber', new Date('2026-09-01'), agora)).toBe('vencida');
    expect(statusReceitaEfetivo('recebida', new Date('2026-09-01'), agora)).toBe('recebida');
  });
  it('despesa vencida', () => {
    expect(statusDespesaEfetivo('a_pagar', new Date('2026-09-01'), agora)).toBe('vencida');
    expect(statusDespesaEfetivo('paga', new Date('2026-09-01'), agora)).toBe('paga');
  });
});

describe('origem', () => {
  it('normaliza origens conhecidas', () => {
    expect(normalizarOrigem('WhatsApp')).toBe('whatsapp');
    expect(normalizarOrigem('consultor_site')).toBe('site');
    expect(normalizarOrigem('meta')).toBe('meta_ads');
    expect(normalizarOrigem('xyz')).toBe('outros');
  });
});

describe('ymdBrasil', () => {
  it('formata data BR', () => {
    expect(ymdBrasil(new Date('2026-09-10T15:00:00-03:00'))).toBe('2026-09-10');
  });
});
