import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';

export interface PricingInput {
  custoOperacional: number;
  custoProduto: number;
  overhead?: number;
}

export async function getConfigPrecificacao() {
  let config = await prisma.configSistema.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await prisma.configSistema.create({ data: { id: 'default' } });
  }
  return config;
}

/** Preço = (Custo Operacional + Produto + Overhead) / (1 - Imposto - Taxa Cartão - Lucro) */
export async function calcularPrecoVariavel(input: PricingInput): Promise<number> {
  const config = await getConfigPrecificacao();
  const impostos = toNumber(config.impostos);
  const taxaCartao = toNumber(config.taxaCartao);
  const lucro = toNumber(config.lucro);
  const overhead = input.overhead ?? toNumber(config.overhead);

  const custoTotal = input.custoOperacional + input.custoProduto + overhead;
  const divisor = 1 - impostos - taxaCartao - lucro;
  if (divisor <= 0) throw new Error('Configuração de precificação inválida');

  return Math.round((custoTotal / divisor) * 100) / 100;
}

export function calcularPrecoFixo(precoBase: number, upsells: Array<{ preco: number }>, express: boolean, expressValor: number): number {
  const upsellTotal = upsells.reduce((s, u) => s + u.preco, 0);
  const expressTotal = express ? expressValor : 0;
  return Math.round((precoBase + upsellTotal + expressTotal) * 100) / 100;
}

export async function estimarLucro(precoFinal: number, custoTotal: number): Promise<number> {
  const config = await getConfigPrecificacao();
  const impostos = toNumber(config.impostos);
  const taxaCartao = toNumber(config.taxaCartao);
  const deducoes = precoFinal * (impostos + taxaCartao);
  return Math.round((precoFinal - custoTotal - deducoes) * 100) / 100;
}
