import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';
import { estoqueService } from './estoque.service.js';
import { listarHorariosDisponiveis } from '../engines/capacity.engine.js';
import { storageService } from './storage.service.js';
import { CATEGORIAS } from '../config/catalogo-servicos.js';
import { fluxoConfigService } from './fluxo-config.service.js';

type TipoPreco = 'fixo' | 'a_partir' | 'sob_orcamento';

function formatPrecoBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizarPreco(data: {
  tipoPreco?: string;
  precoMinimo?: number | null;
  precoTexto?: string | null;
}): { tipoPreco?: TipoPreco; precoTexto?: string } {
  const result: { tipoPreco?: TipoPreco; precoTexto?: string } = {};
  let tipo = (data.tipoPreco as TipoPreco | undefined) ?? undefined;
  const preco = data.precoMinimo;

  if (tipo === 'sob_orcamento' && preco != null && preco > 0) {
    tipo = 'fixo';
  }

  if (tipo) result.tipoPreco = tipo;

  if (!data.precoTexto?.trim() && preco != null && preco > 0) {
    result.precoTexto =
      tipo === 'a_partir' ? `A partir de ${formatPrecoBRL(preco)}` : formatPrecoBRL(preco);
  }

  return result;
}

function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function slugUnico(base: string): Promise<string> {
  let slug = base || 'servico';
  let n = 0;
  while (await prisma.catalogoServico.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export class CatalogoAdminService {
  async sincronizarTiposPreco() {
    const r = await prisma.catalogoServico.updateMany({
      where: { tipoPreco: 'sob_orcamento', precoMinimo: { gt: 0 } },
      data: { tipoPreco: 'fixo' },
    });
    if (r.count > 0) {
      console.log(`[catalogo] ${r.count} serviço(s) corrigido(s): sob_orcamento → fixo (tinham preço definido)`);
    }
    return r.count;
  }

  async listarServicos() {
    return prisma.catalogoServico.findMany({
      orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
      include: { precosFixos: true },
    });
  }

  listarCategorias() {
    return CATEGORIAS.map((c) => ({ slug: c.slug, nome: c.nome, icone: c.icone }));
  }

  async criarServico(data: {
    nome: string;
    slug?: string;
    categoria: string;
    descricao?: string;
    precoMinimo?: number | null;
    precoTexto?: string;
    tipoPreco?: string;
    pontos?: number;
    garantiaDias?: number;
    ordem?: number;
    imagemUrl?: string;
    ativo?: boolean;
  }) {
    if (!data.nome?.trim()) throw new Error('Nome é obrigatório');

    const categoriaValida = CATEGORIAS.some((c) => c.slug === data.categoria);
    if (!categoriaValida) throw new Error('Categoria inválida');

    const slugBase = data.slug?.trim()
      ? gerarSlug(data.slug.trim())
      : gerarSlug(data.nome);
    if (!slugBase) throw new Error('Não foi possível gerar o identificador (slug) do serviço');

    const slug = await slugUnico(slugBase);
    const precoMinimo = data.precoMinimo ?? null;
    let tipoPreco = (data.tipoPreco as TipoPreco) || 'fixo';
    if (tipoPreco === 'sob_orcamento' && precoMinimo != null && precoMinimo > 0) {
      tipoPreco = 'fixo';
    }

    const normalizado = normalizarPreco({
      tipoPreco,
      precoMinimo,
      precoTexto: data.precoTexto ?? null,
    });
    const tipoFinal = normalizado.tipoPreco ?? tipoPreco;

    const maxOrdem = await prisma.catalogoServico.aggregate({
      where: { categoria: data.categoria },
      _max: { ordem: true },
    });
    const ordem = data.ordem ?? (maxOrdem._max.ordem ?? 0) + 1;

    const servico = await prisma.catalogoServico.create({
      data: {
        slug,
        nome: data.nome.trim(),
        categoria: data.categoria,
        tipo: 'C',
        pontos: data.pontos ?? 1,
        descricao: data.descricao?.trim() || null,
        precoMinimo,
        precoTexto: data.precoTexto?.trim() || normalizado.precoTexto || null,
        tipoPreco: tipoFinal,
        garantiaDias: data.garantiaDias ?? 90,
        imagemUrl: data.imagemUrl?.trim() || null,
        ordem,
        upsells: [],
        ativo: data.ativo ?? true,
      },
      include: { precosFixos: true },
    });

    await fluxoConfigService.criarFluxoPrecoFixo(
      slug,
      precoMinimo != null && precoMinimo > 0 ? precoMinimo : null
    );

    return servico;
  }

  async atualizarServico(id: string, data: Partial<{
    nome: string;
    precoMinimo: number;
    precoTexto: string;
    tipoPreco: string;
    descricao: string;
    pontos: number;
    garantiaDias: number;
    ativo: boolean;
    ordem: number;
    imagemUrl: string;
  }>) {
    const atual = await prisma.catalogoServico.findUnique({ where: { id } });
    if (!atual) throw new Error('Serviço não encontrado');

    const precoMinimo =
      data.precoMinimo !== undefined ? data.precoMinimo : Number(atual.precoMinimo) || null;
    const tipoPreco = data.tipoPreco ?? atual.tipoPreco;
    const precoTexto = data.precoTexto ?? atual.precoTexto;
    const normalizado = normalizarPreco({ tipoPreco, precoMinimo, precoTexto });

    return prisma.catalogoServico.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.precoMinimo !== undefined && { precoMinimo: data.precoMinimo }),
        ...(data.precoTexto !== undefined && { precoTexto: data.precoTexto }),
        ...(data.tipoPreco !== undefined && { tipoPreco: data.tipoPreco }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.pontos !== undefined && { pontos: data.pontos }),
        ...(data.garantiaDias !== undefined && { garantiaDias: data.garantiaDias }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.ordem !== undefined && { ordem: data.ordem }),
        ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl }),
        ...(normalizado.tipoPreco && { tipoPreco: normalizado.tipoPreco }),
        ...(normalizado.precoTexto && !data.precoTexto?.trim() && { precoTexto: normalizado.precoTexto }),
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
