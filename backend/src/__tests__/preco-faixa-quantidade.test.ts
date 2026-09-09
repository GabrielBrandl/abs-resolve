import { describe, it, expect, beforeEach } from 'vitest';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import type { FluxoServico } from '../config/fluxo-servicos.js';

describe('preço por faixa de quantidade (substitui base)', () => {
  beforeEach(() => {
    const fluxo: FluxoServico = {
      slug: 'troca-tomada',
      nome: 'Troca de tomada',
      perguntas: [
        {
          id: 'quantidade',
          titulo: 'Quantidade',
          papel: 'quantidade',
          opcoes: [],
          numeroMin: 1,
          numeroMax: 5,
          precosPorQuantidade: {
            '1': 89,
            '2': 129,
            '3': 159,
            '4': 189,
            '5': 219,
          },
        },
        {
          id: 'localInstalacao',
          titulo: 'Local',
          opcoes: [
            { id: 'sala', label: 'Sala' },
            { id: 'cozinha', label: 'Cozinha', precoAdicional: 10, modoCobranca: 'fixo' },
          ],
        },
      ],
      fotosObrigatorias: [],
      regrasValidacao: [],
    };

    (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () =>
      fluxo;
    (fluxoConfigService as unknown as { getPrecoConfig: () => unknown }).getPrecoConfig = () => ({
      modoPreco: 'personalizado',
      precoBase: 89,
      itensPreco: [],
      precoComposto: { ativo: false },
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: true, // mesmo com multiply ligado, a tabela manda
    });
  });

  it('usa preço da faixa no lugar de base × qtd', () => {
    const r1 = calcularPrecoFluxo('troca-tomada', { quantidade: '1' }, 1);
    expect(r1.preco).toBe(89);

    const r2 = calcularPrecoFluxo('troca-tomada', { quantidade: '2' }, 2);
    expect(r2.preco).toBe(129);
    expect(r2.preco).not.toBe(178); // não é 89×2

    const r3 = calcularPrecoFluxo('troca-tomada', { quantidade: '3' }, 3);
    expect(r3.preco).toBe(159);
  });

  it('soma adicionais por cima da faixa, sem reaplicar a base', () => {
    const r = calcularPrecoFluxo(
      'troca-tomada',
      { quantidade: '2', localInstalacao: 'cozinha' },
      2
    );
    expect(r.preco).toBe(139); // 129 + 10
  });
});
