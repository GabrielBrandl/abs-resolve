import { describe, it, expect, beforeEach } from 'vitest';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { defaultPrecoCompostoArSplit } from '../config/preco-composto.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import type { FluxoServico } from '../config/fluxo-servicos.js';

function montarComposto() {
  const composto = defaultPrecoCompostoArSplit();
  composto.opcoesAbsFornece = ['nao'];
  composto.faixas = composto.faixas.map((f) =>
    f.opcaoId === 'ate-12000'
      ? { ...f, ajusteCapacidade: 0, valorKitInicial: 215, metrosInclusos: 2, precoPorMetroExtra: 105 }
      : f.opcaoId === '12001-18000'
        ? { ...f, ajusteCapacidade: 100, valorKitInicial: 285, metrosInclusos: 2, precoPorMetroExtra: 145 }
        : f
  );
  return composto;
}

describe('múltiplas unidades com perguntas por aparelho', () => {
  beforeEach(() => {
    const composto = montarComposto();

    const fluxo: FluxoServico = {
      slug: 'instalacao-ar-split',
      nome: 'Instalação ar',
      perguntas: [
        {
          id: 'quantidade',
          titulo: 'Quantos aparelhos?',
          papel: 'quantidade',
          opcoes: [],
        },
        {
          id: 'andaime',
          titulo: 'Precisa de andaime?',
          opcoes: [
            { id: 'nao', label: 'Não' },
            {
              id: 'sim',
              label: 'Sim',
              precoAdicional: 200,
              modoCobranca: 'fixo',
            },
          ],
        },
        {
          id: 'capacidadeBtu',
          titulo: 'Capacidade',
          replicarPorUnidade: true,
          opcoes: [
            { id: 'ate-12000', label: 'Até 12k' },
            { id: '12001-18000', label: '18k' },
          ],
        },
        {
          id: 'distanciaEvapCond',
          titulo: 'Metragem',
          papel: 'numero',
          replicarPorUnidade: true,
          opcoes: [],
        },
        {
          id: 'materiaisInstalacaoAr',
          titulo: 'Material',
          replicarPorUnidade: true,
          opcoes: [
            { id: 'sim', label: 'Cliente' },
            { id: 'nao', label: 'ABS' },
          ],
        },
        {
          id: 'localCondensadora',
          titulo: 'Local',
          replicarPorUnidade: true,
          opcoes: [
            { id: 'chao', label: 'Chão' },
            { id: 'suporte-parede', label: 'Suporte' },
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
      precoBase: 499,
      itensPreco: [
        {
          id: 'suporte-parede',
          label: 'Suporte de parede',
          valor: 80,
          when: { localCondensadora: ['suporte-parede'] },
          modoCobranca: 'por_unidade',
        },
      ],
      precoComposto: composto,
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: false,
    });
  });

  it('soma preço de cada aparelho + andaime 1× por atendimento', () => {
    // Aparelho 1: 12k + 3m + ABS = 499+215+105 = 819
    // Aparelho 2: 18k + 2m + ABS = 499+100+285 = 884
    // Andaime: 200 (não ×2)
    const r = calcularPrecoFluxo(
      'instalacao-ar-split',
      {
        quantidade: '2',
        andaime: 'sim',
        capacidadeBtu__u1: 'ate-12000',
        distanciaEvapCond__u1: '3',
        materiaisInstalacaoAr__u1: 'nao',
        localCondensadora__u1: 'chao',
        capacidadeBtu__u2: '12001-18000',
        distanciaEvapCond__u2: '2',
        materiaisInstalacaoAr__u2: 'nao',
        localCondensadora__u2: 'chao',
      },
      2
    );
    expect(r.preco).toBe(819 + 884 + 200);
    expect(r.breakdown.some((b) => /andaime|atendimento/i.test(b.label) && b.valor === 200)).toBe(
      true
    );
    expect(r.breakdown.some((b) => /Aparelho 1/i.test(b.label))).toBe(true);
    expect(r.breakdown.some((b) => /Aparelho 2/i.test(b.label))).toBe(true);
  });

  it('item condicional por unidade (suporte) multiplica só nas unidades que batem', () => {
    const r = calcularPrecoFluxo(
      'instalacao-ar-split',
      {
        quantidade: '2',
        andaime: 'nao',
        capacidadeBtu__u1: 'ate-12000',
        distanciaEvapCond__u1: '2',
        materiaisInstalacaoAr__u1: 'sim',
        localCondensadora__u1: 'suporte-parede',
        capacidadeBtu__u2: 'ate-12000',
        distanciaEvapCond__u2: '2',
        materiaisInstalacaoAr__u2: 'sim',
        localCondensadora__u2: 'chao',
      },
      2
    );
    // 2× 499 mão de obra; material cliente = 0; suporte 1×80
    expect(r.preco).toBe(499 + 499 + 80);
  });

  it('andaime sem modoCobranca explícito ainda cobra 1× (padrão compartilhado)', () => {
    const fluxo = (
      fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }
    ).getFluxoEfetivo();
    (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () => ({
      ...fluxo,
      perguntas: fluxo.perguntas.map((p) =>
        p.id !== 'andaime'
          ? p
          : {
              ...p,
              opcoes: p.opcoes.map((o) => {
                const { modoCobranca: _m, ...rest } = o as {
                  id: string;
                  label: string;
                  precoAdicional?: number;
                  modoCobranca?: string;
                };
                return rest;
              }),
            }
      ),
    });

    const r = calcularPrecoFluxo(
      'instalacao-ar-split',
      {
        quantidade: '2',
        andaime: 'sim',
        capacidadeBtu__u1: 'ate-12000',
        distanciaEvapCond__u1: '2',
        materiaisInstalacaoAr__u1: 'sim',
        localCondensadora__u1: 'chao',
        capacidadeBtu__u2: 'ate-12000',
        distanciaEvapCond__u2: '2',
        materiaisInstalacaoAr__u2: 'sim',
        localCondensadora__u2: 'chao',
      },
      2
    );
    expect(r.preco).toBe(499 + 499 + 200);
    expect(r.breakdown.some((b) => b.valor === 200 && /andaime|atendimento/i.test(b.label))).toBe(
      true
    );
  });
});
