import { describe, expect, it } from 'vitest';
import { aplicarModoCobranca, quantidadeDasRespostas, parseQuantidadeOpcao } from '../utils/preco-quantidade.js';

describe('preco-quantidade', () => {
  it('interpreta opções de quantidade', () => {
    expect(parseQuantidadeOpcao('4')).toBe(4);
    expect(parseQuantidadeOpcao('mais-4')).toBe(5);
  });

  it('cobra extra por unidade', () => {
    expect(aplicarModoCobranca(30, 'por_unidade', 4)).toBe(120);
    expect(aplicarModoCobranca(50, 'fixo', 4)).toBe(50);
  });

  it('lê quantidade das respostas', () => {
    expect(quantidadeDasRespostas({ quantidade: '3' }, 'quantidade')).toBe(3);
  });
});
