import 'dotenv/config';
import bcrypt from 'bcrypt';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Role } from '@prisma/client';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const codeDir = existsSync(join(rootDir, 'dist/utils/prisma.js')) ? 'dist' : 'src';

const { prisma } = await import(`../${codeDir}/utils/prisma.js`);
const { SERVICOS_CATALOGO } = await import(`../${codeDir}/config/catalogo-servicos.js`);

/**
 * Seed estrutural apenas — sem clientes, leads, pedidos ou dados de demonstração.
 * O entrypoint do EasyPanel roda este arquivo em todo deploy; por isso não recria cadastros.
 */
async function main() {
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const senhaComercial = await bcrypt.hash('comercial123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@absresolve.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@absresolve.com.br',
      senhaHash: senhaAdmin,
      role: Role.admin,
    },
  });

  await prisma.user.upsert({
    where: { email: 'comercial@absresolve.com.br' },
    update: {},
    create: {
      nome: 'Usuário Comercial',
      email: 'comercial@absresolve.com.br',
      senhaHash: senhaComercial,
      role: Role.comercial,
    },
  });

  await prisma.configSistema.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  for (const s of SERVICOS_CATALOGO) {
    await prisma.catalogoServico.upsert({
      where: { slug: s.slug },
      update: {
        nome: s.nome,
        categoria: s.categoria,
        tipo: 'C',
        pontos: s.pontos,
        descricao: s.descricao,
        precoTexto: s.precoTexto,
        precoMinimo: s.precoMinimo,
        tipoPreco: s.tipoPreco,
        garantiaDias: s.garantiaDias,
        imagemUrl: s.imagemUrl,
        ordem: s.ordem,
        // Não força ativo:true — serviços retirados da vitrine permanecem desativados.
      },
      create: {
        slug: s.slug,
        nome: s.nome,
        categoria: s.categoria,
        tipo: 'C',
        pontos: s.pontos,
        descricao: s.descricao,
        precoTexto: s.precoTexto,
        precoMinimo: s.precoMinimo,
        tipoPreco: s.tipoPreco,
        garantiaDias: s.garantiaDias,
        imagemUrl: s.imagemUrl,
        ordem: s.ordem,
        upsells: [],
        ativo: true,
      },
    });
  }

  const slugsForaDaVitrine = [
    'troca-torneira',
    'troca-registro',
    'reparo-vazamento',
    'desentupimento-pia',
    'desentupimento-vaso',
    'limpeza-ar-split',
  ];
  await prisma.catalogoServico.updateMany({
    where: { slug: { in: slugsForaDaVitrine } },
    data: { ativo: false },
  });

  await prisma.catalogoServico.updateMany({
    where: { slug: { notIn: SERVICOS_CATALOGO.map((s) => s.slug) } },
    data: { ativo: false },
  });

  const tecnicoUser = await prisma.user.upsert({
    where: { email: 'tecnico@absresolve.com.br' },
    update: { ativo: true },
    create: {
      nome: 'Técnico Campo',
      email: 'tecnico@absresolve.com.br',
      senhaHash: await bcrypt.hash('tecnico123', 10),
      role: Role.operacional,
      ativo: true,
    },
  });

  await prisma.tecnico.upsert({
    where: { id: 'seed-tec-1' },
    update: { userId: tecnicoUser.id, nome: 'Técnico Campo', ativo: true },
    create: {
      id: 'seed-tec-1',
      nome: 'Técnico Campo',
      userId: tecnicoUser.id,
      capacidadeDiaria: 6,
      ativo: true,
    },
  });

  console.log('Seed estrutural concluído (sem cadastros de demonstração):');
  console.log('  Admin: admin@absresolve.com.br / admin123');
  console.log('  Comercial: comercial@absresolve.com.br / comercial123');
  console.log('  Técnico: tecnico@absresolve.com.br / tecnico123');

  try {
    const { garantirPlanoFinanceiroPadrao } = await import(`../${codeDir}/services/financeiro.service.js`);
    await garantirPlanoFinanceiroPadrao();
    console.log('  Financeiro: plano de contas/categorias/centros OK');
  } catch (e) {
    console.warn('  Financeiro seed:', e instanceof Error ? e.message : e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
