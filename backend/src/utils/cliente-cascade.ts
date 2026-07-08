import { prisma } from './prisma.js';

/**
 * Remove um cliente e TODO o histórico vinculado (pedidos, OS, pagamentos, NFS-e,
 * solicitações, agendamentos, garantias, comissões, documentos e o usuário de acesso).
 *
 * Usado ao excluir um usuário do tipo cliente no painel admin. Também resolve o
 * problema de "não consigo recadastrar": ao apagar o usuário, o registro de cliente
 * (com CPF/CNPJ únicos) precisa sair junto para liberar o documento.
 */
export async function apagarClienteCascade(clienteId: string) {
  await prisma.$transaction(async (tx) => {
    const pedidos = await tx.pedido.findMany({ where: { clienteId }, select: { id: true } });
    const pedidoIds = pedidos.map((p) => p.id);

    if (pedidoIds.length) {
      const oss = await tx.ordemServico.findMany({
        where: { pedidoId: { in: pedidoIds } },
        select: { id: true },
      });
      const osIds = oss.map((o) => o.id);
      if (osIds.length) {
        await tx.avaliacao.deleteMany({ where: { ordemServicoId: { in: osIds } } });
      }
    }

    await tx.agendamento.deleteMany({ where: { clienteId } });

    if (pedidoIds.length) {
      await tx.nfse.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
    }

    await tx.pagamento.deleteMany({ where: { clienteId } });
    await tx.solicitacaoServico.deleteMany({ where: { clienteId } });

    if (pedidoIds.length) {
      await tx.ordemServico.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
    }

    await tx.pedido.deleteMany({ where: { clienteId } });
    await tx.garantia.deleteMany({ where: { clienteId } });
    await tx.produtoInstalado.deleteMany({ where: { clienteId } });
    await tx.campanhaCrm.deleteMany({ where: { clienteId } });
    await tx.documento.deleteMany({ where: { clienteId } });
    await tx.interacao.deleteMany({ where: { clienteId } });
    await tx.comissao.deleteMany({ where: { clienteId } });

    const user = await tx.user.findFirst({ where: { clienteId } });
    if (user) {
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    }

    await tx.cliente.delete({ where: { id: clienteId } });
  });
}

/**
 * Remove um cadastro de cliente "órfão" (sem usuário e sem pedidos) que tenha o mesmo
 * CPF/CNPJ/e-mail informado. Garante que um recadastro após exclusão não seja bloqueado
 * por um resíduo antigo.
 */
export async function limparClienteOrfaoPorDocumento(doc: string, email: string) {
  const candidatos = await prisma.cliente.findMany({
    where: {
      OR: [{ cpf: doc }, { cnpj: doc }, { email }],
    },
    include: { user: true, _count: { select: { pedidos: true } } },
  });

  for (const c of candidatos) {
    if (!c.user && c._count.pedidos === 0) {
      await apagarClienteCascade(c.id);
    }
  }
}
