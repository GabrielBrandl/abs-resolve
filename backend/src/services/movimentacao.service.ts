import { prisma } from '../utils/prisma.js';

export class MovimentacaoService {
  async listar(filters: { tipo?: string; categoria?: string; dataInicio?: string; dataFim?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.dataInicio || filters.dataFim) {
      where.createdAt = {};
      if (filters.dataInicio) (where.createdAt as Record<string, Date>).gte = new Date(filters.dataInicio);
      if (filters.dataFim) (where.createdAt as Record<string, Date>).lte = new Date(filters.dataFim);
    }

    return prisma.movimentacao.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async criar(data: {
    tipo: 'entrada' | 'saida';
    categoria: string;
    descricao: string;
    valor?: number;
    quantidade?: number;
    responsavel: string;
  }) {
    if (!['entrada', 'saida'].includes(data.tipo)) throw new Error('Tipo inválido');
    return prisma.movimentacao.create({ data });
  }

  async resumo() {
    const items = await prisma.movimentacao.findMany();
    let entradas = 0;
    let saidas = 0;
    items.forEach((m) => {
      const v = Number(m.valor || 0) * m.quantidade;
      if (m.tipo === 'entrada') entradas += v;
      else saidas += v;
    });
    return { entradas, saidas, saldo: entradas - saidas, total: items.length };
  }
}

export const movimentacaoService = new MovimentacaoService();

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(';');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      const str = val == null ? '' : String(val);
      return str.includes(';') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(';')
  );
  return '\uFEFF' + [header, ...lines].join('\n');
}
