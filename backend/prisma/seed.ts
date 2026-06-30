import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../src/utils/prisma.js';
import { SERVICOS_CATALOGO } from '../src/config/catalogo-servicos.js';

async function main() {
  const senhaAdmin = await bcrypt.hash('admin123', 10);
  const senhaComercial = await bcrypt.hash('comercial123', 10);
  const senhaCliente = await bcrypt.hash('cliente123', 10);

  const admin = await prisma.user.upsert({
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

  const clientePf = await prisma.cliente.upsert({
    where: { cpf: '52998224725' },
    update: {},
    create: {
      tipo: 'PF',
      nome: 'João Silva',
      cpf: '52998224725',
      email: 'joao.silva@email.com',
      telefone: '11999998888',
      whatsapp: '11999998888',
      endereco: { rua: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01001000' },
      consentimentoLgpd: true,
      dataAceite: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: 'joao.silva@email.com' },
    update: {},
    create: {
      nome: 'João Silva',
      email: 'joao.silva@email.com',
      senhaHash: senhaCliente,
      role: Role.cliente,
      clienteId: clientePf.id,
    },
  });

  const clientePj = await prisma.cliente.upsert({
    where: { cnpj: '11222333000181' },
    update: {},
    create: {
      tipo: 'PJ',
      nome: 'Empresa ABC Ltda',
      razaoSocial: 'Empresa ABC Ltda',
      nomeFantasia: 'ABC Serviços',
      cnpj: '11222333000181',
      responsavel: 'Maria Santos',
      email: 'contato@abc.com.br',
      telefone: '1133334444',
      endereco: { rua: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', cep: '01310100' },
      consentimentoLgpd: true,
      dataAceite: new Date(),
    },
  });

  await prisma.lead.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-lead-1', nome: 'Carlos Mendes', telefone: '11988887777', email: 'carlos@email.com', origem: 'site', interesse: 'Limpeza residencial', responsavel: 'Comercial', etapa: 'novo_lead' },
      { id: 'seed-lead-2', nome: 'Ana Paula', telefone: '21977776666', email: 'ana@email.com', origem: 'whatsapp', interesse: 'Pintura', responsavel: 'Comercial', etapa: 'contato_realizado' },
      { id: 'seed-lead-3', nome: 'Tech Solutions', telefone: '11966665555', email: 'tech@email.com', origem: 'indicação', interesse: 'Elétrica', responsavel: 'Comercial', etapa: 'qualificado' },
    ],
  });

  const pedido1 = await prisma.pedido.upsert({
    where: { numero: 'PED-2026-0001' },
    update: {},
    create: {
      numero: 'PED-2026-0001',
      clienteId: clientePf.id,
      valor: 1500,
      responsavel: 'Comercial',
      status: 'em_execucao',
      descricao: 'Limpeza completa apartamento',
    },
  });

  await prisma.ordemServico.upsert({
    where: { pedidoId: pedido1.id },
    update: {},
    create: { pedidoId: pedido1.id, etapa: 'execucao', parceiro: 'Parceiro Limpeza SP' },
  });

  await prisma.pedido.upsert({
    where: { numero: 'PED-2026-0002' },
    update: {},
    create: {
      numero: 'PED-2026-0002',
      clienteId: clientePj.id,
      valor: 8500,
      responsavel: 'Comercial',
      status: 'recebido',
      descricao: 'Reforma escritório',
    },
  });

  await prisma.servico.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-serv-1', nome: 'Limpeza Residencial', categoria: 'limpeza', descricao: 'Limpeza completa de residências', preco: 350, parceiro: 'CleanPro' },
      { id: 'seed-serv-2', nome: 'Pintura Interna', categoria: 'pintura', descricao: 'Pintura de ambientes internos', preco: 800, parceiro: 'PinturaFácil' },
      { id: 'seed-serv-3', nome: 'Instalação Elétrica', categoria: 'eletrica', descricao: 'Serviços elétricos residenciais e comerciais', preco: 500, parceiro: 'EletroMax' },
    ],
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
        ativo: true,
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

  await prisma.catalogoServico.updateMany({
    where: { slug: { notIn: SERVICOS_CATALOGO.map((s) => s.slug) } },
    data: { ativo: false },
  });

  await prisma.tecnico.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-tec-2', nome: 'Técnico 2', capacidadeDiaria: 6 },
    ],
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

  await prisma.produtoEstoque.createMany({
    skipDuplicates: true,
    data: [
      { id: 'est-1', sku: 'troca-tomada_padrao', nome: 'Tomada Simples 10A', quantidade: 50, servicoSlug: 'troca-tomada' },
      { id: 'est-2', sku: 'troca-interruptor_padrao', nome: 'Interruptor Simples', quantidade: 45, servicoSlug: 'troca-interruptor' },
      { id: 'est-3', sku: 'troca-disjuntor_padrao', nome: 'Disjuntor 20A', quantidade: 30, servicoSlug: 'troca-disjuntor' },
      { id: 'est-4', sku: 'instalacao-chuveiro_padrao', nome: 'Kit Chuveiro', quantidade: 20, servicoSlug: 'instalacao-chuveiro' },
      { id: 'est-5', sku: 'troca-torneira_padrao', nome: 'Torneira Padrão', quantidade: 35, servicoSlug: 'troca-torneira' },
    ],
  });

  console.log('Seed concluído:');
  console.log(`  Admin: admin@absresolve.com.br / admin123`);
  console.log(`  Comercial: comercial@absresolve.com.br / comercial123`);
  console.log(`  Cliente portal: CPF 529.982.247-25 / cliente123`);
  console.log(`  Técnico: tecnico@absresolve.com.br / tecnico123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
