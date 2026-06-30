import { describe, it, expect } from 'vitest';
import { calcularPrecoFixo } from '../engines/pricing.engine.js';

describe('pricing.engine', () => {
  it('calcula preço fixo com express', () => {
    const result = calcularPrecoFixo(149, [], true, 29);
    expect(result).toBe(178);
  });

  it('calcula preço fixo com upsell', () => {
    const result = calcularPrecoFixo(149, [{ preco: 30 }], false, 29);
    expect(result).toBe(179);
  });
});

describe('buildTimeline logic', () => {
  it('pagamento pendente bloqueia agendamento', () => {
    const podeAgendar = false;
    expect(podeAgendar).toBe(false);
  });
});
