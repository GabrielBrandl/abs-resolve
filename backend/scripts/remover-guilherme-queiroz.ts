/**
 * Remove pedidos/compras de teste do cliente Guilherme Queiroz.
 * Uso (na pasta backend): npx tsx scripts/remover-guilherme-queiroz.ts
 */
import { prisma } from '../src/utils/prisma.js';

async function main() {
  const clientes = await prisma.cliente.findMany({
    where: {
      nome: { contains: 'Guilherme Queiroz', mode: 'insensitive' },
    },
    select: { id: true, nome: true, email: true, telefone: true },
  });

  if (!clientes.length) {
    console.log('Nenhum cliente Guilherme Queiroz encontrado.');
    return;
  }

  for (const c of clientes) {
    console.log(`Cliente: ${c.nome} (${c.id})`);

    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: c.id },
      select: { id: true, numero: true },
    });
    const pedidoIds = pedidos.map((p) => p.id);
    console.log(`  Pedidos: ${pedidos.map((p) => p.numero).join(', ') || '(nenhum)'}`);

    const sols = await prisma.solicitacaoServico.findMany({
      where: { clienteId: c.id },
      select: { id: true },
    });
    const solIds = sols.map((s) => s.id);

    const pagamentos = await prisma.pagamento.findMany({
      where: { OR: [{ clienteId: c.id }, { pedidoId: { in: pedidoIds } }] },
      select: { id: true },
    });
    const pagIds = pagamentos.map((p) => p.id);

    if (pagIds.length) {
      await prisma.nfse.deleteMany({ where: { pagamentoId: { in: pagIds } } });
      await prisma.finLancamento.deleteMany({ where: { pagamentoId: { in: pagIds } } });
    }
    if (pedidoIds.length) {
      await prisma.nfse.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await prisma.finLancamento.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await prisma.ordemServico.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await prisma.agendamento.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
      await prisma.pagamento.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
    }

    await prisma.agendamento.deleteMany({ where: { clienteId: c.id } });
    await prisma.pagamento.deleteMany({ where: { clienteId: c.id } });
    if (solIds.length) {
      await prisma.solicitacaoServico.deleteMany({ where: { id: { in: solIds } } });
    }
    if (pedidoIds.length) {
      await prisma.pedido.deleteMany({ where: { id: { in: pedidoIds } } });
    }

    console.log(`  Removidos ${pedidoIds.length} pedidos e ${solIds.length} solicitações.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
