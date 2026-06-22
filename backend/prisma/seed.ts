import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../src/utils/prisma.js';

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

  await prisma.beneficio.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-ben-1', parceiro: 'Drogasil', categoria: 'farmacia', descricao: '10% de desconto em medicamentos', desconto: 10, cupom: 'ABS10' },
      { id: 'seed-ben-2', parceiro: 'Smart Fit', categoria: 'academia', descricao: 'Cashback de R$ 50 na matrícula', cashback: 50 },
      { id: 'seed-ben-3', parceiro: 'Extra', categoria: 'mercado', descricao: '5% de desconto nas compras', desconto: 5, cupom: 'ABSEXTRA' },
    ],
  });

  await prisma.parceiro.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-par-1', nome: 'CleanPro', email: 'contato@cleanpro.com', telefone: '11999990001', categoria: 'limpeza' },
      { id: 'seed-par-2', nome: 'PinturaFácil', email: 'contato@pinturafacil.com', telefone: '11999990002', categoria: 'pintura' },
    ],
  });

  await prisma.configSistema.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  const catalogoData = [
    { slug: 'tomada', nome: 'Tomada', tipo: 'A', pontos: 1 },
    { slug: 'interruptor', nome: 'Interruptor', tipo: 'A', pontos: 1 },
    { slug: 'disjuntor', nome: 'Disjuntor', tipo: 'B', pontos: 1 },
    { slug: 'chuveiro', nome: 'Chuveiro', tipo: 'B', pontos: 2 },
    { slug: 'luminaria', nome: 'Luminária', tipo: 'B', pontos: 2 },
    { slug: 'ventilador', nome: 'Ventilador', tipo: 'B', pontos: 2 },
    { slug: 'registro', nome: 'Registro', tipo: 'B', pontos: 2 },
    { slug: 'ar-condicionado', nome: 'Ar-condicionado', tipo: 'B', pontos: 4 },
  ];

  for (const c of catalogoData) {
    await prisma.catalogoServico.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, categoria: 'eletrica', upsells: [] },
    });
  }

  const tomada = await prisma.catalogoServico.findUnique({ where: { slug: 'tomada' } });
  const interruptor = await prisma.catalogoServico.findUnique({ where: { slug: 'interruptor' } });
  if (tomada) {
    const precosTomada = [
      { chave: 'simples_10a', label: 'Tomada Simples 10A', preco: 149 },
      { chave: 'simples_20a', label: 'Tomada Simples 20A', preco: 159 },
      { chave: 'dupla_10a', label: 'Tomada Dupla 10A', preco: 169 },
      { chave: 'dupla_20a', label: 'Tomada Dupla 20A', preco: 179 },
    ];
    for (const p of precosTomada) {
      await prisma.precoFixo.upsert({
        where: { servicoId_chave: { servicoId: tomada.id, chave: p.chave } },
        update: { preco: p.preco },
        create: { servicoId: tomada.id, ...p },
      });
    }
  }
  if (interruptor) {
    const precosInt = [
      { chave: 'simples', label: 'Interruptor Simples', preco: 149 },
      { chave: 'duplo', label: 'Interruptor Duplo', preco: 159 },
      { chave: 'triplo', label: 'Interruptor Triplo', preco: 169 },
    ];
    for (const p of precosInt) {
      await prisma.precoFixo.upsert({
        where: { servicoId_chave: { servicoId: interruptor.id, chave: p.chave } },
        update: { preco: p.preco },
        create: { servicoId: interruptor.id, ...p },
      });
    }
  }

  await prisma.tecnico.createMany({
    skipDuplicates: true,
    data: [
      { id: 'seed-tec-1', nome: 'Técnico 1', capacidadeDiaria: 6 },
      { id: 'seed-tec-2', nome: 'Técnico 2', capacidadeDiaria: 6 },
    ],
  });

  await prisma.produtoEstoque.createMany({
    skipDuplicates: true,
    data: [
      { id: 'est-1', sku: 'tomada_simples_10a', nome: 'Tomada Simples 10A', quantidade: 50, servicoSlug: 'tomada' },
      { id: 'est-2', sku: 'tomada_simples_20a', nome: 'Tomada Simples 20A', quantidade: 40, servicoSlug: 'tomada' },
      { id: 'est-3', sku: 'interruptor_simples', nome: 'Interruptor Simples', quantidade: 45, servicoSlug: 'interruptor' },
      { id: 'est-4', sku: 'disjuntor', nome: 'Disjuntor 20A', quantidade: 30, servicoSlug: 'disjuntor' },
      { id: 'est-5', sku: 'chuveiro', nome: 'Chuveiro 5500W', quantidade: 20, servicoSlug: 'chuveiro' },
    ],
  });

  console.log('Seed concluído:');
  console.log(`  Admin: admin@absresolve.com.br / admin123`);
  console.log(`  Comercial: comercial@absresolve.com.br / comercial123`);
  console.log(`  Cliente portal: CPF 529.982.247-25 / cliente123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
