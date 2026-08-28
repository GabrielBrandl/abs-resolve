import { describe, expect, it } from 'vitest';
import { EstoqueService } from '../services/estoque.service.js';

describe('EstoqueService', () => {
  const svc = new EstoqueService();

  it('calcula disponível', () => {
    expect(svc.disponivel({ quantidade: 10, reservado: 3 })).toBe(7);
  });

  it('status ruptura quando disponível é zero', async () => {
    const status = await svc.statusAlerta({ quantidade: 5, reservado: 5, minimo: 5, critico: 2 });
    expect(status).toBe('ruptura');
  });

  it('status crítico abaixo do limite crítico', async () => {
    const status = await svc.statusAlerta({ quantidade: 2, reservado: 0, minimo: 5, critico: 2 });
    expect(status).toBe('critico');
  });

  it('status mínimo abaixo do mínimo mas acima do crítico', async () => {
    const status = await svc.statusAlerta({ quantidade: 4, reservado: 0, minimo: 5, critico: 2 });
    expect(status).toBe('minimo');
  });

  it('status ok com saldo adequado', async () => {
    const status = await svc.statusAlerta({ quantidade: 20, reservado: 2, minimo: 5, critico: 2 });
    expect(status).toBe('ok');
  });
});
