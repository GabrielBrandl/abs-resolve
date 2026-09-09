import { describe, it, expect } from 'vitest';
import { precoMinimoVitrineDeFluxo, textoPrecoAPartirDe } from '../utils/preco-vitrine.js';

describe('preço de vitrine (cards)', () => {
  it('usa o menor valor da tabela progressiva', () => {
    expect(
      precoMinimoVitrineDeFluxo({
        perguntas: [
          {
            precosPorQuantidade: { '1': 89, '2': 129, '3': 159, '4': 189, '5': 219 },
          },
        ],
        precoBase: 149,
      })
    ).toBe(89);
  });

  it('cai no precoBase quando não há faixas', () => {
    expect(precoMinimoVitrineDeFluxo({ perguntas: [], precoBase: 499 })).toBe(499);
  });

  it('formata texto A partir de', () => {
    expect(textoPrecoAPartirDe(89)).toMatch(/A partir de R\$ 89/);
  });
});
