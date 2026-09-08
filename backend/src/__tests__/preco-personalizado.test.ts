import { describe, it, expect, beforeEach } from 'vitest';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import type { FluxoServico } from '../config/fluxo-servicos.js';

describe('calcularPreco personalizado (admin)', () => {
  beforeEach(() => {
    // Injeta cache em memória sem banco
    const fluxo: FluxoServico = {
      slug: 'troca-tomada',
      nome: 'Troca de tomada',
      perguntas: [
        {
          id: 'tipoTomada',
          titulo: 'Tipo',
          opcoes: [
            { id: 'simples', label: 'Simples', precoAdicional: 0 },
            { id: 'dupla', label: 'Dupla', precoAdicional: 40, modoCobranca: 'por_unidade' },
          ],
        },
        {
          id: 'quantidade',
          titulo: 'Quantidade',
          papel: 'quantidade',
          opcoes: [],
        },
      ],
      fotosObrigatorias: [],
      regrasValidacao: [],
    };

    (fluxoConfigService as unknown as { getFluxoEfetivo: (s: string) => FluxoServico }).getFluxoEfetivo = () =>
      fluxo;
    (fluxoConfigService as unknown as {
      getPrecoConfig: (s: string) => {
        modoPreco: string;
        precoBase: number;
        itensPreco: Array<{ id: string; label: string; valor: number; modoCobranca?: string }>;
        precoComposto: { ativo: boolean };
        perguntaQuantidadeId: string;
        multiplicarBasePorQuantidade: boolean;
      };
    }).getPrecoConfig = () => ({
      modoPreco: 'personalizado',
      precoBase: 100,
      itensPreco: [
        {
          id: 'extra-fixo',
          label: 'Taxa deslocamento',
          valor: 25,
          modoCobranca: 'fixo',
        },
      ],
      precoComposto: { ativo: false } as never,
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: true,
    });
  });

  it('aplica precoBase × qtd + precoAdicional + itensPreco', () => {
    const r = calcularPrecoFluxo(
      'troca-tomada',
      { tipoTomada: 'dupla', quantidade: '2' },
      2
    );
    // base 100×2 + adicional 40×2 + item fixo 25 = 305
    expect(r.preco).toBe(305);
    expect(r.valorServico).toBe(305);
    expect(r.valorAdicionais).toBe(105);
  });

  it('carrinho deve usar preco completo (valorServico inclui adicionais)', () => {
    const r = calcularPrecoFluxo('troca-tomada', { tipoTomada: 'dupla', quantidade: '1' }, 1);
    expect(r.valorServico).toBe(r.preco);
    expect(r.preco).toBe(165); // 100 + 40 + 25
  });
});
