import { prisma } from './prisma.js';

export async function gerarNumeroPedido(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `PED-${ano}-`;

  const ultimo = await prisma.pedido.findFirst({
    where: { numero: { startsWith: prefixo } },
    orderBy: { numero: 'desc' },
  });

  let sequencia = 1;
  if (ultimo) {
    const partes = ultimo.numero.split('-');
    sequencia = parseInt(partes[2] || '0', 10) + 1;
  }

  return `${prefixo}${String(sequencia).padStart(4, '0')}`;
}

export function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val);
  if (val && typeof val === 'object' && 'toNumber' in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return 0;
}
