import { describe, it, expect } from 'vitest';
import { avaliarShowIf, normalizarShowIf, serializarShowIf } from '../utils/show-if.js';
import { perguntaVisivelPorShowIf } from '../utils/preco-quantidade.js';

describe('showIf com múltiplas condições (AND)', () => {
  it('normaliza formato legado e { all }', () => {
    expect(
      normalizarShowIf({ perguntaId: 'a', opcaoIds: ['1'] })
    ).toEqual([{ perguntaId: 'a', opcaoIds: ['1'] }]);
    expect(
      normalizarShowIf({
        all: [
          { perguntaId: 'a', opcaoIds: ['1'] },
          { perguntaId: 'b', opcaoIds: ['2'] },
        ],
      })
    ).toHaveLength(2);
  });

  it('exige todas as condições (E)', () => {
    const showIf = {
      all: [
        { perguntaId: 'possuiTorneira', opcaoIds: ['nao'] },
        { perguntaId: 'localInstalacao', opcaoIds: ['bancada'] },
      ],
    };
    expect(
      avaliarShowIf(showIf, { possuiTorneira: 'nao', localInstalacao: 'bancada' })
    ).toBe(true);
    expect(
      avaliarShowIf(showIf, { possuiTorneira: 'nao', localInstalacao: 'parede' })
    ).toBe(false);
    expect(avaliarShowIf(showIf, { possuiTorneira: 'nao' })).toBe(false);
    expect(avaliarShowIf(showIf, {})).toBe(false);
  });

  it('legado de 1 condição continua funcionando', () => {
    expect(
      perguntaVisivelPorShowIf(
        { showIf: { perguntaId: 'fornecimento', opcaoIds: ['nao'] } },
        { fornecimento: 'nao' }
      )
    ).toBe(true);
    expect(
      perguntaVisivelPorShowIf(
        { showIf: { perguntaId: 'fornecimento', opcaoIds: ['nao'] } },
        { fornecimento: 'sim' }
      )
    ).toBe(false);
  });

  it('serializa 1 condição no formato legado e N em { all }', () => {
    expect(serializarShowIf([{ perguntaId: 'a', opcaoIds: ['1'] }])).toEqual({
      perguntaId: 'a',
      opcaoIds: ['1'],
    });
    expect(
      serializarShowIf([
        { perguntaId: 'a', opcaoIds: ['1'] },
        { perguntaId: 'b', opcaoIds: ['2'] },
      ])
    ).toEqual({
      all: [
        { perguntaId: 'a', opcaoIds: ['1'] },
        { perguntaId: 'b', opcaoIds: ['2'] },
      ],
    });
  });
});
