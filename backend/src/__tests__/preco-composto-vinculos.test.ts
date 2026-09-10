import { describe, it, expect } from 'vitest';
import {
  corrigirVinculosPrecoComposto,
  defaultPrecoCompostoArSplit,
  precoCompostoEfetivo,
} from '../config/preco-composto.js';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import type { FluxoServico } from '../config/fluxo-servicos.js';

describe('vínculos do preço composto (admin → loja)', () => {
  const perguntas = [
    { id: 'quantidade', titulo: 'Quantos aparelhos deseja instalar?', papel: 'quantidade', opcoes: [] },
    {
      id: 'capacidadeBtu',
      titulo: 'Capacidade',
      opcoes: [
        { id: 'ate-12000', label: 'Até 12.000' },
        { id: '12001-18000', label: '12.001 a 18.000' },
      ],
    },
    { id: 'distanciaEvapCond', titulo: 'Metragem', papel: 'numero', opcoes: [] },
    {
      id: 'materiaisInstalacaoAr',
      titulo: 'Material',
      opcoes: [
        { id: 'sim', label: 'Cliente' },
        { id: 'nao', label: 'ABS' },
      ],
    },
  ];

  it('corrige capacidade apontando para quantidade de aparelhos', () => {
    const quebrado = {
      ...defaultPrecoCompostoArSplit(),
      perguntaCapacidadeId: 'quantidade',
      faixas: [
        {
          opcaoId: 'ate-12000',
          label: 'Até 12.000',
          ajusteCapacidade: 0,
          valorKitInicial: 215,
          metrosInclusos: 2,
          precoPorMetroExtra: 105,
        },
      ],
    };
    const ok = corrigirVinculosPrecoComposto(quebrado, perguntas);
    expect(ok.perguntaCapacidadeId).toBe('capacidadeBtu');
    expect(ok.faixas.some((f) => f.opcaoId === 'ate-12000' && f.valorKitInicial === 215)).toBe(true);
  });

  it('precoCompostoEfetivo + cálculo aplica kit mesmo com config salva errada', () => {
    const composto = precoCompostoEfetivo(
      'instalacao-ar-split',
      {
        ativo: true,
        perguntaCapacidadeId: 'quantidade',
        perguntaMetrosId: 'distanciaEvapCond',
        perguntaFornecimentoId: 'materiaisInstalacaoAr',
        opcoesAbsFornece: ['nao'],
        metrosNumericos: true,
        metrosInclusosPadrao: 2,
        faixas: [
          {
            opcaoId: 'ate-12000',
            ajusteCapacidade: 0,
            valorKitInicial: 215,
            metrosInclusos: 2,
            precoPorMetroExtra: 105,
          },
        ],
      },
      perguntas
    );

    const fluxo: FluxoServico = {
      slug: 'instalacao-ar-split',
      nome: 'Instalação',
      perguntas: perguntas as FluxoServico['perguntas'],
      fotosObrigatorias: [],
      regrasValidacao: [],
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

    const r = calcularPrecoFluxo(
      'instalacao-ar-split',
      {
        quantidade: '1',
        capacidadeBtu: 'ate-12000',
        distanciaEvapCond: '3',
        materiaisInstalacaoAr: 'nao',
      },
      1
    );
    expect(r.preco).toBe(819);
  });

  it('aceita respostas com sufixo __u1 em qty=1', () => {
    const composto = precoCompostoEfetivo(
      'instalacao-ar-split',
      defaultPrecoCompostoArSplit(),
      perguntas.map((p) =>
        p.id === 'capacidadeBtu' || p.id === 'distanciaEvapCond' || p.id === 'materiaisInstalacaoAr'
          ? { ...p, replicarPorUnidade: true }
          : p
      )
    );
    composto.opcoesAbsFornece = ['nao'];
    composto.faixas = composto.faixas.map((f) =>
      f.opcaoId === 'ate-12000'
        ? { ...f, ajusteCapacidade: 0, valorKitInicial: 215, metrosInclusos: 2, precoPorMetroExtra: 105 }
        : f
    );

    const fluxo: FluxoServico = {
      slug: 'instalacao-ar-split',
      nome: 'Instalação',
      perguntas: perguntas.map((p) =>
        p.id === 'capacidadeBtu' || p.id === 'distanciaEvapCond' || p.id === 'materiaisInstalacaoAr'
          ? { ...p, replicarPorUnidade: true }
          : p
      ) as FluxoServico['perguntas'],
      fotosObrigatorias: [],
      regrasValidacao: [],
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

    const r = calcularPrecoFluxo(
      'instalacao-ar-split',
      {
        quantidade: '1',
        capacidadeBtu__u1: 'ate-12000',
        distanciaEvapCond__u1: '3',
        materiaisInstalacaoAr__u1: 'nao',
      },
      1
    );
    expect(r.preco).toBe(819);
  });
});
