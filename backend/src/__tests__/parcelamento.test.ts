import { describe, expect, it } from 'vitest';
import { calcularParcelamento, PARCELAS_SEM_JUROS } from '../config/parcelamento.js';

describe('calcularParcelamento', () => {
  it('até 3x mantém total sem juros', () => {
    const r = calcularParcelamento(300, 3);
    expect(r.semJuros).toBe(true);
    expect(r.total).toBe(300);
    expect(r.valorParcela).toBe(100);
    expect(r.valorJuros).toBe(0);
    expect(PARCELAS_SEM_JUROS).toBeGreaterThanOrEqual(1);
  });

  it('4x aplica juros sobre a parcela extra', () => {
    const r = calcularParcelamento(300, 4);
    expect(r.semJuros).toBe(false);
    expect(r.valorJuros).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThan(300);
    expect(r.parcelas).toBe(4);
  });
});
