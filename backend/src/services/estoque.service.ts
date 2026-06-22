import { prisma } from '../utils/prisma.js';

export class EstoqueService {
  async listar() {
    return prisma.produtoEstoque.findMany({ orderBy: { nome: 'asc' } });
  }

  async statusAlerta(produto: { quantidade: number; reservado: number; minimo: number; critico: number }) {
    const disponivel = produto.quantidade - produto.reservado;
    if (disponivel <= 0) return 'ruptura';
    if (disponivel <= produto.critico) return 'critico';
    if (disponivel <= produto.minimo) return 'minimo';
    return 'ok';
  }

  async reservarPorServico(servicoSlug: string, chave?: string) {
    const sku = chave ? `${servicoSlug}_${chave}` : servicoSlug;
    const produto = await prisma.produtoEstoque.findFirst({
      where: { OR: [{ sku }, { servicoSlug }] },
    });
    if (!produto) return null;

    const disponivel = produto.quantidade - produto.reservado;
    if (disponivel <= 0) throw new Error(`Estoque insuficiente: ${produto.nome}`);

    await prisma.produtoEstoque.update({
      where: { id: produto.id },
      data: { reservado: { increment: 1 } },
    });

    await prisma.movimentacao.create({
      data: {
        tipo: 'saida',
        categoria: 'reserva',
        descricao: `Reserva automática — ${produto.nome}`,
        quantidade: 1,
        responsavel: 'sistema',
      },
    });

    return produto;
  }

  async baixaPorServico(servicoSlug: string, chave?: string) {
    const sku = chave ? `${servicoSlug}_${chave}` : servicoSlug;
    const produto = await prisma.produtoEstoque.findFirst({
      where: { OR: [{ sku }, { servicoSlug }] },
    });
    if (!produto) return null;

    await prisma.produtoEstoque.update({
      where: { id: produto.id },
      data: {
        reservado: { decrement: 1 },
        quantidade: { decrement: 1 },
      },
    });

    await prisma.movimentacao.create({
      data: {
        tipo: 'saida',
        categoria: 'baixa',
        descricao: `Baixa automática — ${produto.nome}`,
        quantidade: 1,
        responsavel: 'sistema',
      },
    });

    return produto;
  }

  async alertas() {
    const produtos = await this.listar();
    const alertas = [];
    for (const p of produtos) {
      const status = await this.statusAlerta(p);
      if (status !== 'ok') alertas.push({ ...p, status });
    }
    return alertas;
  }
}

export const estoqueService = new EstoqueService();
