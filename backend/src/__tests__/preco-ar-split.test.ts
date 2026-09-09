import { describe, it, expect, beforeEach } from 'vitest';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { defaultPrecoCompostoArSplit } from '../config/preco-composto.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import type { FluxoServico } from '../config/fluxo-servicos.js';

const FLUXO_AR: FluxoServico = {
  slug: 'instalacao-ar-split',
  nome: 'Instalação de ar-condicionado split',
  perguntas: [
    {
      id: 'capacidadeBtu',
      titulo: 'Capacidade',
      opcoes: [
        { id: 'ate-12000', label: 'Até 12.000 BTUs' },
        { id: '12001-18000', label: '12.001 a 18.000' },
        { id: '18001-24000', label: '18.001 a 24.000' },
        { id: 'acima-24000', label: 'Acima de 24.000' },
      ],
    },
    {
      id: 'distanciaEvapCond',
      titulo: 'Metragem',
      papel: 'numero',
      opcoes: [],
      numeroMin: 0,
      numeroMax: 30,
      numeroUnidade: 'm',
    },
    {
      id: 'materiaisInstalacaoAr',
      titulo: 'Quem fornece o material?',
      opcoes: [
        { id: 'cliente-fornece', label: 'Já possuo o material adequado' },
        { id: 'abs-fornece-kit', label: 'ABS fornece o material/kit' },
      ],
    },
    {
      id: 'localCondensadora',
      titulo: 'Local',
      opcoes: [
        { id: 'chao', label: 'Chão' },
        { id: 'suporte-parede', label: 'Suporte de parede', precoAdicional: 80, modoCobranca: 'fixo' },
      ],
    },
  ],
  fotosObrigatorias: [],
  regrasValidacao: [],
};

function mockPreco(precoBase = 499) {
  const composto = defaultPrecoCompostoArSplit();
  (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () =>
    FLUXO_AR;
  (fluxoConfigService as unknown as {
    getPrecoConfig: () => {
      modoPreco: string;
      precoBase: number;
      itensPreco: unknown[];
      precoComposto: typeof composto;
      perguntaQuantidadeId: string;
      multiplicarBasePorQuantidade: boolean;
    };
  }).getPrecoConfig = () => ({
    modoPreco: 'personalizado',
    precoBase,
    itensPreco: [],
    precoComposto: composto,
    perguntaQuantidadeId: 'quantidade',
    multiplicarBasePorQuantidade: false,
  });
}

describe('preço composto instalação ar-split', () => {
  beforeEach(() => mockPreco(499));

  it('mão de obra = base + ajuste por BTUs (12k / 18k / 24k)', () => {
    const r12 = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: 'ate-12000',
      distanciaEvapCond: '2',
      materiaisInstalacaoAr: 'cliente-fornece',
    });
    expect(r12.valorServico).toBe(499);
    expect(r12.preco).toBe(499);

    const r18 = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: '12001-18000',
      distanciaEvapCond: '2',
      materiaisInstalacaoAr: 'cliente-fornece',
    });
    expect(r18.valorServico).toBe(599);
    expect(r18.preco).toBe(599);

    const r24 = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: '18001-24000',
      distanciaEvapCond: '2',
      materiaisInstalacaoAr: 'cliente-fornece',
    });
    expect(r24.valorServico).toBe(699);
    expect(r24.preco).toBe(699);
  });

  it('cliente fornece material: não cobra kit nem metros, mas mantém ajuste BTU', () => {
    const r = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: '12001-18000',
      distanciaEvapCond: '10',
      materiaisInstalacaoAr: 'cliente-fornece',
    });
    expect(r.valorServico).toBe(599);
    expect(r.valorMaterial ?? 0).toBe(0);
    expect(r.preco).toBe(599);
  });

  it('ABS fornece: cobra kit + metros extras da faixa', () => {
    // 18k: kit 200, 2m inclusos, R$70/m → 10m = 8 extras × 70 = 560 → total 599+200+560
    const r = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: '12001-18000',
      distanciaEvapCond: '10',
      materiaisInstalacaoAr: 'abs-fornece-kit',
    });
    expect(r.valorServico).toBe(599);
    expect(r.valorMaterial).toBe(200 + 8 * 70);
    expect(r.preco).toBe(599 + 200 + 560);
  });

  it('soma adicionais de outras respostas sem perder o ajuste BTU', () => {
    const r = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: '18001-24000',
      distanciaEvapCond: '2',
      materiaisInstalacaoAr: 'cliente-fornece',
      localCondensadora: 'suporte-parede',
    });
    expect(r.valorServico).toBe(699 + 80);
    expect(r.preco).toBe(779);
  });

  it('ABS com id "nao" (Sim/Não): 499+100+285+(1×145) = 1029', () => {
    const composto = defaultPrecoCompostoArSplit();
    composto.opcoesAbsFornece = ['nao'];
    composto.faixas = composto.faixas.map((f) =>
      f.opcaoId === '12001-18000'
        ? { ...f, ajusteCapacidade: 100, valorKitInicial: 285, metrosInclusos: 2, precoPorMetroExtra: 145 }
        : f
    );
    const fluxo: FluxoServico = {
      ...FLUXO_AR,
      perguntas: FLUXO_AR.perguntas.map((p) =>
        p.id === 'materiaisInstalacaoAr'
          ? {
              ...p,
              opcoes: [
                { id: 'sim', label: 'Sim, já possuo o material necessário' },
                { id: 'nao', label: 'Não, quero que a ABS forneça o material' },
              ],
            }
          : p
      ),
    };
    (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () =>
      fluxo;
    (fluxoConfigService as unknown as { getPrecoConfig: () => unknown }).getPrecoConfig = () => ({
      modoPreco: 'personalizado',
      precoBase: 499,
      itensPreco: [],
      precoComposto: composto,
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: false,
    });

    const r = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: '12001-18000',
      distanciaEvapCond: '3',
      materiaisInstalacaoAr: 'nao',
    });
    expect(r.valorServico).toBe(599);
    expect(r.valorMaterial).toBe(285 + 145);
    expect(r.preco).toBe(1029);
  });

  it('12k + 3m + ABS (nao): 499 + 215 kit + 1×105 = 819', () => {
    const composto = defaultPrecoCompostoArSplit();
    composto.opcoesAbsFornece = ['nao'];
    composto.faixas = composto.faixas.map((f) =>
      f.opcaoId === 'ate-12000'
        ? { ...f, ajusteCapacidade: 0, valorKitInicial: 215, metrosInclusos: 2, precoPorMetroExtra: 105 }
        : f
    );
    const fluxo: FluxoServico = {
      ...FLUXO_AR,
      perguntas: [
        {
          id: 'aparelhoComprado',
          titulo: 'Aparelho já comprado?',
          opcoes: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
        },
        ...FLUXO_AR.perguntas.map((p) =>
          p.id === 'materiaisInstalacaoAr'
            ? {
                ...p,
                opcoes: [
                  { id: 'sim', label: 'Sim, já possuo o material necessário' },
                  { id: 'nao', label: 'Não, quero que a ABS forneça o material' },
                ],
              }
            : p
        ),
      ],
    };
    (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () =>
      fluxo;
    (fluxoConfigService as unknown as { getPrecoConfig: () => unknown }).getPrecoConfig = () => ({
      modoPreco: 'personalizado',
      precoBase: 499,
      itensPreco: [],
      precoComposto: composto,
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: false,
    });

    const r = calcularPrecoFluxo('instalacao-ar-split', {
      aparelhoComprado: 'sim',
      capacidadeBtu: 'ate-12000',
      distanciaEvapCond: '3',
      materiaisInstalacaoAr: 'nao',
    });
    expect(r.valorServico).toBe(499);
    expect(r.valorMaterial).toBe(215 + 105);
    expect(r.preco).toBe(819);
    expect(r.breakdown.some((b) => /kit|material/i.test(b.label) && b.valor === 215)).toBe(true);
    expect(r.breakdown.some((b) => /metros/i.test(b.label) && b.valor === 105)).toBe(true);
  });

  it('não confunde aparelhoComprado com fornecimento de material (pergunta errada no admin)', () => {
    const composto = defaultPrecoCompostoArSplit();
    // Admin apontou para a pergunta errada (aparelho), mas marcou id "nao" como ABS
    composto.perguntaFornecimentoId = 'aparelhoComprado';
    composto.opcoesAbsFornece = ['abs-fornece-kit', 'nao'];
    composto.faixas = composto.faixas.map((f) =>
      f.opcaoId === 'ate-12000'
        ? { ...f, ajusteCapacidade: 0, valorKitInicial: 215, metrosInclusos: 2, precoPorMetroExtra: 105 }
        : f
    );
    const fluxo: FluxoServico = {
      ...FLUXO_AR,
      perguntas: [
        {
          id: 'aparelhoComprado',
          titulo: 'Aparelho já comprado?',
          opcoes: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
        },
        ...FLUXO_AR.perguntas.map((p) =>
          p.id === 'materiaisInstalacaoAr'
            ? {
                ...p,
                opcoes: [
                  { id: 'sim', label: 'Sim, já possuo o material necessário' },
                  { id: 'nao', label: 'Não, quero que a ABS forneça o material' },
                ],
              }
            : p
        ),
      ],
    };
    (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () =>
      fluxo;
    (fluxoConfigService as unknown as { getPrecoConfig: () => unknown }).getPrecoConfig = () => ({
      modoPreco: 'personalizado',
      precoBase: 499,
      itensPreco: [],
      precoComposto: composto,
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: false,
    });

    const r = calcularPrecoFluxo('instalacao-ar-split', {
      aparelhoComprado: 'sim',
      capacidadeBtu: 'ate-12000',
      distanciaEvapCond: '3',
      materiaisInstalacaoAr: 'nao',
    });
    expect(r.preco).toBe(819);
    expect(r.valorMaterial).toBe(320);
  });

  it('opcoesAbsFornece só com abs-fornece-kit ainda cobra quando a opção real é "nao"', () => {
    const composto = defaultPrecoCompostoArSplit();
    composto.opcoesAbsFornece = ['abs-fornece-kit']; // migração antiga
    composto.faixas = composto.faixas.map((f) =>
      f.opcaoId === 'ate-12000'
        ? { ...f, ajusteCapacidade: 0, valorKitInicial: 215, metrosInclusos: 2, precoPorMetroExtra: 105 }
        : f
    );
    const fluxo: FluxoServico = {
      ...FLUXO_AR,
      perguntas: FLUXO_AR.perguntas.map((p) =>
        p.id === 'materiaisInstalacaoAr'
          ? {
              ...p,
              opcoes: [
                { id: 'sim', label: 'Sim, já possuo o material necessário' },
                { id: 'nao', label: 'Não, quero que a ABS forneça o material' },
              ],
            }
          : p
      ),
    };
    (fluxoConfigService as unknown as { getFluxoEfetivo: () => FluxoServico }).getFluxoEfetivo = () =>
      fluxo;
    (fluxoConfigService as unknown as { getPrecoConfig: () => unknown }).getPrecoConfig = () => ({
      modoPreco: 'personalizado',
      precoBase: 499,
      itensPreco: [],
      precoComposto: composto,
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: false,
    });

    const r = calcularPrecoFluxo('instalacao-ar-split', {
      capacidadeBtu: 'ate-12000',
      distanciaEvapCond: '3',
      materiaisInstalacaoAr: 'nao',
    });
    expect(r.preco).toBe(819);
  });
});
