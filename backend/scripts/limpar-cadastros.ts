/**
 * Limpa cadastros operacionais para o cliente começar do zero.
 * Mantém: catálogo de serviços, configs, fluxos, receitas técnicas,
 * plano de contas financeiro e usuários da equipe (admin/comercial/operacional).
 *
 * Uso: npx tsx scripts/limpar-cadastros.ts
 */
import 'dotenv/config';
import { prisma } from '../src/utils/prisma.js';

async function main() {
  console.log('Limpando cadastros operacionais...');

  const counts: Record<string, number> = {};
  const del = async (label: string, fn: () => Promise<{ count: number }>) => {
    const r = await fn();
    counts[label] = r.count;
    console.log(`  ${label}: ${r.count}`);
  };

  await prisma.$transaction(async (tx) => {
    await del('os_materiais', () => tx.osMaterial.deleteMany({}));
    await del('avaliacoes', () => tx.avaliacao.deleteMany({}));
    await del('nfse', () => tx.nfse.deleteMany({}));
    await del('agendamentos', () => tx.agendamento.deleteMany({}));
    await del('pagamentos', () => tx.pagamento.deleteMany({}));
    await del('solicitacoes', () => tx.solicitacaoServico.deleteMany({}));
    await del('ordens_servico', () => tx.ordemServico.deleteMany({}));
    await del('fin_lancamentos', () => tx.finLancamento.deleteMany({}));
    await del('fin_recorrencias', () => tx.finRecorrencia.deleteMany({}));
    await del('pedidos', () => tx.pedido.deleteMany({}));
    await del('garantias', () => tx.garantia.deleteMany({}));
    await del('produtos_instalados', () => tx.produtoInstalado.deleteMany({}));
    await del('campanhas_crm', () => tx.campanhaCrm.deleteMany({}));
    await del('documentos', () => tx.documento.deleteMany({}));
    await del('interacoes', () => tx.interacao.deleteMany({}));
    await del('comissoes', () => tx.comissao.deleteMany({}));
    await del('leads', () => tx.lead.deleteMany({}));
    await del('notificacoes', () => tx.notificacao.deleteMany({}));
    await del('audit_logs', () => tx.auditLog.deleteMany({}));
    await del('movimentacoes', () => tx.movimentacao.deleteMany({}));
    await del('beneficios', () => tx.beneficio.deleteMany({}));
    await del('servicos_legado', () => tx.servico.deleteMany({}));

    // Usuários cliente/parceiro (+ tokens)
    const usersRemover = await tx.user.findMany({
      where: { role: { in: ['cliente', 'parceiro'] } },
      select: { id: true },
    });
    const userIds = usersRemover.map((u) => u.id);
    if (userIds.length) {
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      counts.users_cliente_parceiro = (
        await tx.user.deleteMany({ where: { id: { in: userIds } } })
      ).count;
      console.log(`  users_cliente_parceiro: ${counts.users_cliente_parceiro}`);
    } else {
      counts.users_cliente_parceiro = 0;
      console.log('  users_cliente_parceiro: 0');
    }

    await del('parceiros', () => tx.parceiro.deleteMany({}));
    await del('clientes', () => tx.cliente.deleteMany({}));

    // Zera estoque (mantém cadastro de SKUs do catálogo)
    const est = await tx.produtoEstoque.updateMany({
      data: { quantidade: 0, reservado: 0 },
    });
    counts.estoque_zerado = est.count;
    console.log(`  estoque_zerado: ${est.count}`);
  });

  const restante = {
    clientes: await prisma.cliente.count(),
    leads: await prisma.lead.count(),
    pedidos: await prisma.pedido.count(),
    os: await prisma.ordemServico.count(),
    solicitacoes: await prisma.solicitacaoServico.count(),
    pagamentos: await prisma.pagamento.count(),
    usersEquipe: await prisma.user.count({
      where: { role: { in: ['admin', 'comercial', 'operacional'] } },
    }),
    catalogo: await prisma.catalogoServico.count(),
  };

  console.log('\nLimpeza concluída. Restante:');
  console.log(restante);
  console.log('Mantidos: catálogo, configs, fluxos, receitas técnicas, plano financeiro, equipe.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
