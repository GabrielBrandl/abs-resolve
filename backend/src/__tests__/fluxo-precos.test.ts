import { describe, it, expect } from 'vitest';
import { getFluxo, SLUGS_FLUXO_SERVICO } from '../config/fluxo-servicos.js';
import { calcularPrecoFluxo } from '../config/tabela-precos-fluxo.js';

const RESPOSTAS_TOMADA = {
  tipoTomada: 'simples',
  quantidade: '1',
  fornecimentoTomada: 'cliente',
  estadoAtual: 'funcionando',
  localInstalacao: 'sala',
  alturaInstalacao: 'ate-2-5m',
  acabamentoParede: 'pintura',
};

describe('fluxo-servicos', () => {
  it('possui fluxo para todos os slugs do catálogo', () => {
    expect(SLUGS_FLUXO_SERVICO.length).toBe(20);
    for (const slug of SLUGS_FLUXO_SERVICO) {
      expect(getFluxo(slug)?.perguntas.length).toBeGreaterThan(0);
    }
  });
});

describe('tabela-precos-fluxo', () => {
  it('calcula tomada simples base R$149', () => {
    const r = calcularPrecoFluxo('troca-tomada', RESPOSTAS_TOMADA, 1);
    expect(r.preco).toBe(149);
    expect(r.requerValidacaoTecnica).toBe(false);
  });

  it('marca análise humana para tomada queimada', () => {
    const r = calcularPrecoFluxo('troca-tomada', { ...RESPOSTAS_TOMADA, estadoAtual: 'queimada' }, 1);
    expect(r.requerValidacaoTecnica).toBe(true);
  });

  it('aplica tier de quantidade tomada', () => {
    const r = calcularPrecoFluxo('troca-tomada', { ...RESPOSTAS_TOMADA, quantidade: '2' }, 2);
    expect(r.preco).toBe(219);
  });
});
