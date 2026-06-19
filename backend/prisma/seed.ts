import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

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

  console.log('Seed concluído:');
  console.log(`  Admin: admin@absresolve.com.br / admin123`);
  console.log(`  Comercial: comercial@absresolve.com.br / comercial123`);
  console.log(`  Cliente portal: CPF 529.982.247-25 / cliente123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
