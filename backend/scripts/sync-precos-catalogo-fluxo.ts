import { prisma } from '../src/utils/prisma.js';
import { fluxoConfigService } from '../src/services/fluxo-config.service.js';

async function main() {
  await fluxoConfigService.initCache();
  const servicos = await prisma.catalogoServico.findMany({
    where: { precoMinimo: { not: null } },
    select: { slug: true, precoMinimo: true, nome: true },
  });
  for (const s of servicos) {
    const p = Number(s.precoMinimo);
    if (!(p > 0)) continue;
    try {
      await fluxoConfigService.sincronizarPrecoBaseDoCatalogo(s.slug, p);
      console.log('ok', s.slug, p);
    } catch (e) {
      console.log('skip', s.slug, e instanceof Error ? e.message : e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
