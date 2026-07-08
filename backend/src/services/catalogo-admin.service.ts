import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';
import { estoqueService } from './estoque.service.js';
import { listarHorariosDisponiveis } from '../engines/capacity.engine.js';
import { storageService } from './storage.service.js';

export class CatalogoAdminService {
  async listarServicos() {
    return prisma.catalogoServico.findMany({
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
      include: { precosFixos: true },
    });
  }

  async atualizarServico(id: string, data: Partial<{
    nome: string;
    precoMinimo: number;
    precoTexto: string;
    descricao: string;
    pontos: number;
    garantiaDias: number;
    ativo: boolean;
    ordem: number;
    imagemUrl: string;
  }>) {
    return prisma.catalogoServico.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.precoMinimo !== undefined && { precoMinimo: data.precoMinimo }),
        ...(data.precoTexto !== undefined && { precoTexto: data.precoTexto }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.pontos !== undefined && { pontos: data.pontos }),
        ...(data.garantiaDias !== undefined && { garantiaDias: data.garantiaDias }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.ordem !== undefined && { ordem: data.ordem }),
        ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
      },
    });
  }

  async atualizarImagem(id: string, file: Express.Multer.File) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');

    const { url } = await storageService.upload(`catalogo`, file);
    return prisma.catalogoServico.update({ where: { id }, data: { imagemUrl: url } });
  }

  /** Desativa o serviço (mantém histórico). */
  async excluirServico(id: string) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');
    return prisma.catalogoServico.update({ where: { id }, data: { ativo: false } });
  }

  /** Exclusão permanente — só permitida quando não há solicitações vinculadas. */
  async excluirServicoPermanente(id: string) {
    const servico = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!servico) throw new Error('Serviço não encontrado');

    const solicitacoes = await prisma.solicitacaoServico.count({ where: { servicoId: id } });
    if (solicitacoes > 0) {
      throw new Error(
        'Este serviço já tem solicitações de clientes vinculadas. Use "Desativar" para removê-lo do catálogo sem apagar o histórico.'
      );
    }

    await prisma.$transaction([
      prisma.precoFixo.deleteMany({ where: { servicoId: id } }),
      prisma.fluxoServicoConfig.deleteMany({ where: { slug: servico.slug } }),
      prisma.catalogoServico.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  async getConfig() {
    return prisma.configSistema.findUnique({ where: { id: 'default' } });
  }

  async updateConfig(data: Record<string, number>) {
    return prisma.configSistema.update({
      where: { id: 'default' },
      data: {
        ...(data.expressValor !== undefined && { expressValor: data.expressValor }),
        ...(data.taxaCancelamento !== undefined && { taxaCancelamento: data.taxaCancelamento }),
        ...(data.taxaAusencia !== undefined && { taxaAusencia: data.taxaAusencia }),
        ...(data.impostos !== undefined && { impostos: data.impostos }),
        ...(data.lucro !== undefined && { lucro: data.lucro }),
      },
    });
  }

  async listarEstoque() {
    const produtos = await estoqueService.listar();
    return Promise.all(
      produtos.map(async (p) => ({ ...p, status: await estoqueService.statusAlerta(p) }))
    );
  }

  async atualizarEstoque(id: string, quantidade: number, minimo?: number) {
    return prisma.produtoEstoque.update({
      where: { id },
      data: {
        quantidade,
        ...(minimo !== undefined && { minimo }),
      },
    });
  }

  async listarTecnicos() {
    return prisma.tecnico.findMany({ orderBy: { nome: 'asc' } });
  }

  async criarTecnico(nome: string, capacidadeDiaria = 6) {
    return prisma.tecnico.create({ data: { nome, capacidadeDiaria } });
  }

  async agendaOperacional(dataInicio?: string) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date();
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 14);

    const agendamentos = await prisma.agendamento.findMany({
      where: { data: { gte: inicio, lte: fim }, status: { in: ['confirmado', 'reagendado'] } },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        tecnico: true,
        pedido: { select: { numero: true, descricao: true } },
      },
      orderBy: [{ data: 'asc' }, { horarioInicio: 'asc' }],
    });

    const tecnicos = await prisma.tecnico.findMany({ where: { ativo: true } });
    return { agendamentos, tecnicos, periodo: { inicio, fim } };
  }

  async orcamentosPendentes() {
    return prisma.solicitacaoServico.findMany({
      where: { status: 'orcamento_pendente' },
      include: { servico: true, cliente: { select: { id: true, nome: true, email: true, telefone: true, endereco: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async responderOrcamento(id: string, precoFinal: number, observacao?: string) {
    const sol = await prisma.solicitacaoServico.findUnique({ where: { id } });
    if (!sol || sol.status !== 'orcamento_pendente') throw new Error('Orçamento não encontrado');

    const opcoes = sol.opcoes as Record<string, unknown>;
    return prisma.solicitacaoServico.update({
      where: { id },
      data: {
        precoBase: precoFinal,
        precoFinal,
        status: 'checkout',
        opcoes: { ...opcoes, respostaComercial: observacao } as Prisma.InputJsonValue,
      },
      include: { servico: true, cliente: true },
    });
  }

  async horariosCapacidade(pontos = 2) {
    return listarHorariosDisponiveis(pontos);
  }
}

export const catalogoAdminService = new CatalogoAdminService();
