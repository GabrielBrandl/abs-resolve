import { describe, it, expect, beforeEach } from 'vitest';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import type { FluxoServico } from '../config/fluxo-servicos.js';

/**
 * Cenário genérico (não hardcoda slug): mão de obra progressiva + material
 * por unidade condicionado a “ABS fornece”.
 */
describe('adicional por quantidade (genérico, configurável)', () => {
  beforeEach(() => {
    const fluxo: FluxoServico = {
      slug: 'troca-tomada',
      nome: 'Serviço com quantidade',
      perguntas: [
        {
          id: 'quantidade',
          titulo: 'Quantas unidades?',
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
          id: 'fornecimentoMaterial',
          titulo: 'Você já possui o material?',
          opcoes: [
            { id: 'sim', label: 'Sim, já tenho' },
            { id: 'nao', label: 'Não, quero que a ABS forneça' },
          ],
        },
        {
          id: 'tipoMaterial',
          titulo: 'Qual tipo será instalado?',
          opcoes: [
            {
              id: 'simples-10a',
              label: 'Simples 10A',
              precoAdicional: 12,
              modoCobranca: 'por_unidade',
              when: { fornecimentoMaterial: ['nao'] },
            },
            {
              id: 'dupla-10a',
              label: 'Dupla 10A',
              precoAdicional: 20,
              modoCobranca: 'por_unidade',
              when: { fornecimentoMaterial: ['nao'] },
            },
            {
              id: 'simples-20a',
              label: 'Simples 20A',
              precoAdicional: 15,
              modoCobranca: 'por_unidade',
              when: { fornecimentoMaterial: ['nao'] },
            },
            {
              id: 'dupla-20a',
              label: 'Dupla 20A',
              precoAdicional: 22,
              modoCobranca: 'por_unidade',
              when: { fornecimentoMaterial: ['nao'] },
            },
          ],
        },
        {
          id: 'taxaVisita',
          titulo: 'Precisa de taxa extra?',
          opcoes: [
            { id: 'nao', label: 'Não' },
            {
              id: 'sim',
              label: 'Sim (+R$50 fixo)',
              precoAdicional: 50,
              modoCobranca: 'fixo',
            },
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
      multiplicarBasePorQuantidade: false,
    });
  });

  it('ABS fornece: mão de obra progressiva + material × quantidade', () => {
    const r = calcularPrecoFluxo(
      'troca-tomada',
      {
        quantidade: '3',
        fornecimentoMaterial: 'nao',
        tipoMaterial: 'simples-10a',
        taxaVisita: 'nao',
      },
      3
    );
    // 159 + 12×3 = 195
    expect(r.preco).toBe(195);
    expect(r.valorAdicionais).toBe(36);
  });

  it('cliente já tem material: não cobra adicional mesmo com tipo respondido', () => {
    const r = calcularPrecoFluxo(
      'troca-tomada',
      {
        quantidade: '3',
        fornecimentoMaterial: 'sim',
        tipoMaterial: 'simples-10a',
      },
      3
    );
    expect(r.preco).toBe(159);
    expect(r.valorAdicionais ?? 0).toBe(0);
  });

  it('adicional fixo não multiplica pela quantidade', () => {
    const r = calcularPrecoFluxo(
      'troca-tomada',
      {
        quantidade: '3',
        fornecimentoMaterial: 'sim',
        taxaVisita: 'sim',
      },
      3
    );
    // 159 + 50 (fixo)
    expect(r.preco).toBe(209);
  });

  it('respeita showIf da pergunta ao cobrar adicional', () => {
    const fluxo: FluxoServico = {
      slug: 'troca-interruptor',
      nome: 'Troca de interruptor',
      perguntas: [
        {
          id: 'quantidade',
          titulo: 'Quantidade',
          papel: 'quantidade',
          opcoes: [],
          precosPorQuantidade: { '1': 100, '2': 150 },
        },
        {
          id: 'fornecimento',
          titulo: 'Possui o material?',
          opcoes: [
            { id: 'sim', label: 'Sim' },
            { id: 'nao', label: 'Não' },
          ],
        },
        {
          id: 'tipoPeca',
          titulo: 'Tipo',
          showIf: { perguntaId: 'fornecimento', opcaoIds: ['nao'] },
          opcoes: [
            {
              id: 'simples',
              label: 'Simples',
              precoAdicional: 10,
              modoCobranca: 'por_unidade',
            },
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
      precoBase: 100,
      itensPreco: [],
      precoComposto: { ativo: false },
      perguntaQuantidadeId: 'quantidade',
      multiplicarBasePorQuantidade: false,
    });

    const comAbs = calcularPrecoFluxo(
      'troca-interruptor',
      { quantidade: '2', fornecimento: 'nao', tipoPeca: 'simples' },
      2
    );
    expect(comAbs.preco).toBe(170); // 150 + 10×2

    const cliente = calcularPrecoFluxo(
      'troca-interruptor',
      { quantidade: '2', fornecimento: 'sim', tipoPeca: 'simples' },
      2
    );
    // showIf não satisfeito → ignora adicional residual
    expect(cliente.preco).toBe(150);
  });
});
