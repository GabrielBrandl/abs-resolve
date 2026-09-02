import { prisma } from '../utils/prisma.js';
import { toNumber } from '../utils/helpers.js';
import { PECAS_CATALOGO, isPecaSlug } from '../config/pecas-catalogo.js';
import {
  getMaterialConfig,
  listarTodasVariantesMateriais,
  findMaterialVariante,
  isMaterialSku,
} from '../config/materiais-catalogo.js';

export type StatusEstoque = 'ok' | 'minimo' | 'critico' | 'ruptura';

export type ProdutoEstoqueEnriquecido = Awaited<ReturnType<EstoqueService['enriquecer']>>;

export class EstoqueService {
  async listar() {
    return prisma.produtoEstoque.findMany({ orderBy: { nome: 'asc' } });
  }

  disponivel(produto: { quantidade: number; reservado: number }) {
    return produto.quantidade - produto.reservado;
  }

  async statusAlerta(produto: { quantidade: number; reservado: number; minimo: number; critico: number }) {
    const disponivel = this.disponivel(produto);
    if (disponivel <= 0) return 'ruptura' as StatusEstoque;
    if (disponivel <= produto.critico) return 'critico' as StatusEstoque;
    if (disponivel <= produto.minimo) return 'minimo' as StatusEstoque;
    return 'ok' as StatusEstoque;
  }

  async enriquecer(produto: Awaited<ReturnType<EstoqueService['listar']>>[number]) {
    const status = await this.statusAlerta(produto);
    const disponivel = this.disponivel(produto);
    return {
      ...produto,
      precoUnitario: produto.precoUnitario ? toNumber(produto.precoUnitario) : null,
      custo: produto.custo ? toNumber(produto.custo) : null,
      disponivel,
      status,
      valorEstoque: produto.precoUnitario ? toNumber(produto.precoUnitario) * produto.quantidade : null,
    };
  }

  async dashboard() {
    const produtos = await this.listar();
    let ruptura = 0;
    let critico = 0;
    let minimo = 0;
    let ok = 0;
    let totalUnidades = 0;
    let reservadoTotal = 0;
    let valorEstoque = 0;

    for (const p of produtos) {
      const status = await this.statusAlerta(p);
      if (status === 'ruptura') ruptura += 1;
      else if (status === 'critico') critico += 1;
      else if (status === 'minimo') minimo += 1;
      else ok += 1;
      totalUnidades += p.quantidade;
      reservadoTotal += p.reservado;
      if (p.precoUnitario) valorEstoque += toNumber(p.precoUnitario) * p.quantidade;
    }

    return {
      totalProdutos: produtos.length,
      ruptura,
      critico,
      minimo,
      ok,
      totalUnidades,
      reservadoTotal,
      valorEstoque,
      alertas: ruptura + critico + minimo,
    };
  }

  async listarComFiltros(filtros?: { busca?: string; status?: string }) {
    const busca = filtros?.busca?.trim().toLowerCase();
    const statusFiltro = filtros?.status?.trim();

    let produtos = await this.listar();
    const enriquecidos = await Promise.all(produtos.map((p) => this.enriquecer(p)));

    return enriquecidos.filter((p) => {
      if (statusFiltro && p.status !== statusFiltro) return false;
      if (!busca) return true;
      return (
        p.nome.toLowerCase().includes(busca) ||
        p.sku.toLowerCase().includes(busca) ||
        (p.servicoSlug?.toLowerCase().includes(busca) ?? false)
      );
    });
  }

  async buscarPorId(id: string) {
    const produto = await prisma.produtoEstoque.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');
    return this.enriquecer(produto);
  }

  async criar(data: {
    sku: string;
    nome: string;
    quantidade?: number;
    minimo?: number;
    critico?: number;
    servicoSlug?: string;
    precoUnitario?: number;
    tipo?: string;
    cor?: string;
    imagemUrl?: string;
    custo?: number;
    ativo?: boolean;
    modeloId?: string;
  }) {
    const sku = data.sku.trim().toLowerCase();
    if (!sku || !data.nome.trim()) throw new Error('SKU e nome são obrigatórios');

    const existente = await prisma.produtoEstoque.findUnique({ where: { sku } });
    if (existente) throw new Error('SKU já cadastrado');

    const produto = await prisma.produtoEstoque.create({
      data: {
        sku,
        nome: data.nome.trim(),
        quantidade: Math.max(0, data.quantidade ?? 0),
        minimo: Math.max(0, data.minimo ?? 5),
        critico: Math.max(0, data.critico ?? 2),
        servicoSlug: data.servicoSlug?.trim() || null,
        precoUnitario: data.precoUnitario ?? null,
        tipo: data.tipo?.trim() || null,
        cor: data.cor?.trim() || null,
        imagemUrl: data.imagemUrl?.trim() || null,
        custo: data.custo ?? null,
        ativo: data.ativo ?? true,
        modeloId: data.modeloId?.trim() || null,
      },
    });

    if (produto.quantidade > 0) {
      await this.registrarMovimentacao({
        produtoId: produto.id,
        tipo: 'entrada',
        categoria: 'cadastro',
        descricao: `Saldo inicial — ${produto.nome}`,
        quantidade: produto.quantidade,
        responsavel: 'admin',
      });
    }

    return this.enriquecer(produto);
  }

  async atualizar(
    id: string,
    data: {
      nome?: string;
      minimo?: number;
      critico?: number;
      servicoSlug?: string | null;
      precoUnitario?: number | null;
      tipo?: string | null;
      cor?: string | null;
      imagemUrl?: string | null;
      custo?: number | null;
      ativo?: boolean;
      modeloId?: string | null;
    }
  ) {
    const produto = await prisma.produtoEstoque.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome.trim() }),
        ...(data.minimo !== undefined && { minimo: Math.max(0, data.minimo) }),
        ...(data.critico !== undefined && { critico: Math.max(0, data.critico) }),
        ...(data.servicoSlug !== undefined && { servicoSlug: data.servicoSlug || null }),
        ...(data.precoUnitario !== undefined && { precoUnitario: data.precoUnitario }),
        ...(data.tipo !== undefined && { tipo: data.tipo || null }),
        ...(data.cor !== undefined && { cor: data.cor || null }),
        ...(data.imagemUrl !== undefined && { imagemUrl: data.imagemUrl || null }),
        ...(data.custo !== undefined && { custo: data.custo }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.modeloId !== undefined && { modeloId: data.modeloId || null }),
      },
    });
    return this.enriquecer(produto);
  }

  async movimentar(
    id: string,
    params: {
      tipo: 'entrada' | 'saida' | 'ajuste';
      quantidade: number;
      motivo: string;
      responsavel: string;
    }
  ) {
    const produto = await prisma.produtoEstoque.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');

    const qtd = Math.max(0, Math.round(params.quantidade));
    if (qtd <= 0) throw new Error('Quantidade inválida');
    const motivo = params.motivo.trim() || 'Sem motivo informado';

    let novaQuantidade = produto.quantidade;
    let delta = 0;

    if (params.tipo === 'entrada') {
      novaQuantidade += qtd;
      delta = qtd;
    } else if (params.tipo === 'saida') {
      const disponivel = this.disponivel(produto);
      if (qtd > disponivel) throw new Error(`Saldo insuficiente. Disponível: ${disponivel}`);
      novaQuantidade -= qtd;
      delta = qtd;
    } else {
      novaQuantidade = qtd;
      delta = qtd - produto.quantidade;
    }

    if (novaQuantidade < produto.reservado) {
      throw new Error(`Quantidade não pode ser menor que o reservado (${produto.reservado})`);
    }

    const atualizado = await prisma.produtoEstoque.update({
      where: { id },
      data: { quantidade: novaQuantidade },
    });

    await this.registrarMovimentacao({
      produtoId: id,
      tipo: params.tipo === 'entrada' ? 'entrada' : 'saida',
      categoria: params.tipo === 'ajuste' ? 'ajuste' : 'manual',
      descricao: `${motivo} — ${produto.nome} (${delta >= 0 ? '+' : ''}${delta})`,
      quantidade: Math.abs(delta) || qtd,
      responsavel: params.responsavel,
      valor: produto.precoUnitario ? toNumber(produto.precoUnitario) * Math.abs(delta || qtd) : undefined,
    });

    return this.enriquecer(atualizado);
  }

  async liberarReserva(id: string, quantidade = 1, responsavel = 'admin') {
    const produto = await prisma.produtoEstoque.findUnique({ where: { id } });
    if (!produto) throw new Error('Produto não encontrado');
    const qtd = Math.min(Math.max(1, quantidade), produto.reservado);

    const atualizado = await prisma.produtoEstoque.update({
      where: { id },
      data: { reservado: { decrement: qtd } },
    });

    await this.registrarMovimentacao({
      produtoId: id,
      tipo: 'entrada',
      categoria: 'reserva',
      descricao: `Liberação de reserva — ${produto.nome}`,
      quantidade: qtd,
      responsavel,
    });

    return this.enriquecer(atualizado);
  }

  async historico(produtoId: string, limite = 50) {
    const movs = await prisma.movimentacao.findMany({
      where: { produtoEstoqueId: produtoId },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
    return movs.map((m) => ({
      ...m,
      valor: m.valor ? toNumber(m.valor) : null,
    }));
  }

  async sincronizarCatalogo() {
    let criados = 0;
    let atualizados = 0;

    for (const peca of PECAS_CATALOGO) {
      const existente = await prisma.produtoEstoque.findUnique({ where: { sku: peca.slug } });
      if (existente) {
        await prisma.produtoEstoque.update({
          where: { id: existente.id },
          data: {
            nome: peca.nome,
            servicoSlug: peca.servicoRelacionado,
            precoUnitario: peca.precoMinimo,
            imagemUrl: peca.imagemUrl,
          },
        });
        atualizados += 1;
      } else {
        await prisma.produtoEstoque.create({
          data: {
            sku: peca.slug,
            nome: peca.nome,
            quantidade: 0,
            servicoSlug: peca.servicoRelacionado,
            precoUnitario: peca.precoMinimo,
            imagemUrl: peca.imagemUrl,
            ativo: true,
          },
        });
        criados += 1;
      }
    }

    for (const mat of listarTodasVariantesMateriais()) {
      const existente = await prisma.produtoEstoque.findUnique({ where: { sku: mat.sku } });
      if (existente) {
        await prisma.produtoEstoque.update({
          where: { id: existente.id },
          data: {
            nome: mat.nome,
            servicoSlug: mat.servicoSlug,
            precoUnitario: mat.preco,
            tipo: mat.tipo,
            cor: mat.cor,
            imagemUrl: mat.imagemUrl,
            modeloId: mat.modeloId,
          },
        });
        atualizados += 1;
      } else {
        await prisma.produtoEstoque.create({
          data: {
            sku: mat.sku,
            nome: mat.nome,
            quantidade: mat.estoqueInicial,
            servicoSlug: mat.servicoSlug,
            precoUnitario: mat.preco,
            tipo: mat.tipo,
            cor: mat.cor,
            imagemUrl: mat.imagemUrl,
            modeloId: mat.modeloId,
            ativo: true,
          },
        });
        criados += 1;
      }
    }

    const servicosPadrao = [
      { sku: 'troca-tomada_padrao', nome: 'Tomada Simples 10A (serviço)', servicoSlug: 'troca-tomada' },
      { sku: 'troca-interruptor_padrao', nome: 'Interruptor Simples (serviço)', servicoSlug: 'troca-interruptor' },
      { sku: 'troca-disjuntor_padrao', nome: 'Disjuntor 20A (serviço)', servicoSlug: 'troca-disjuntor' },
      { sku: 'instalacao-chuveiro_padrao', nome: 'Kit Chuveiro (serviço)', servicoSlug: 'instalacao-chuveiro' },
      { sku: 'troca-torneira_padrao', nome: 'Torneira Padrão (serviço)', servicoSlug: 'troca-torneira' },
    ];

    for (const s of servicosPadrao) {
      const existente = await prisma.produtoEstoque.findUnique({ where: { sku: s.sku } });
      if (!existente) {
        await prisma.produtoEstoque.create({
          data: { sku: s.sku, nome: s.nome, quantidade: 20, servicoSlug: s.servicoSlug, ativo: true },
        });
        criados += 1;
      }
    }

    const materiaisCount = listarTodasVariantesMateriais().length;
    return { criados, atualizados, total: PECAS_CATALOGO.length + servicosPadrao.length + materiaisCount };
  }

  async listarMateriaisVitrine(servicoSlug: string, tipo?: string) {
    const cfg = getMaterialConfig(servicoSlug);
    if (!cfg) return null;

    const skus = cfg.modelos.flatMap((m) => m.variantes.map((v) => v.sku));
    const estoques = await prisma.produtoEstoque.findMany({
      where: { sku: { in: skus } },
    });
    const bySku = new Map(estoques.map((e) => [e.sku, e]));

    const modelos = cfg.modelos
      .filter((m) => !tipo || m.tipo === tipo)
      .map((modelo) => {
        const variantes = modelo.variantes.map((v) => {
          const est = bySku.get(v.sku);
          const disponivel = est ? this.disponivel(est) : v.estoqueInicial ?? 0;
          const ativo = est?.ativo ?? true;
          const preco = est?.precoUnitario != null ? toNumber(est.precoUnitario) : v.preco;
          return {
            sku: v.sku,
            cor: v.cor,
            labelCor: v.labelCor,
            preco,
            imagemUrl: est?.imagemUrl || v.imagemUrl,
            disponivel,
            ativo,
            disponivelParaCompra: ativo && disponivel > 0,
          };
        });
        return {
          id: modelo.id,
          tipo: modelo.tipo,
          nome: modelo.nome,
          detalhe: modelo.detalhe || null,
          variantes,
          disponivelParaCompra: variantes.some((v) => v.disponivelParaCompra),
        };
      });

    return {
      servicoSlug: cfg.servicoSlug,
      perguntaPossuiId: cfg.perguntaPossuiId,
      opcoesComprarAbs: cfg.opcoesComprarAbs,
      perguntaTipoId: cfg.perguntaTipoId || null,
      labelProduto: cfg.labelProduto,
      tipos: cfg.tipos,
      modelos,
    };
  }

  async precoMaterialSku(sku: string) {
    const found = findMaterialVariante(sku);
    if (!found) return null;
    const est = await prisma.produtoEstoque.findUnique({ where: { sku: found.variante.sku } });
    if (est && (!est.ativo || this.disponivel(est) <= 0)) {
      throw new Error(`${found.nome} está indisponível no estoque.`);
    }
    return {
      nome: found.nome,
      preco: est?.precoUnitario != null ? toNumber(est.precoUnitario) : found.variante.preco,
      imagemUrl: est?.imagemUrl || found.variante.imagemUrl,
      cor: found.variante.labelCor,
      corId: found.variante.cor,
      modeloId: found.modelo.id,
      modeloNome: found.modelo.nome,
      detalhe: found.modelo.detalhe || null,
      servicoSlug: found.servicoSlug,
      sku: found.variante.sku,
    };
  }

  private async registrarMovimentacao(data: {
    produtoId: string;
    tipo: string;
    categoria: string;
    descricao: string;
    quantidade: number;
    responsavel: string;
    valor?: number;
  }) {
    await prisma.movimentacao.create({
      data: {
        tipo: data.tipo,
        categoria: data.categoria,
        descricao: data.descricao,
        quantidade: data.quantidade,
        responsavel: data.responsavel,
        produtoEstoqueId: data.produtoId,
        valor: data.valor ?? null,
      },
    });
  }

  private async localizarProduto(slug: string, chave?: string) {
    const skuChave = chave ? `${slug}_${chave}` : slug;

    if (isPecaSlug(slug) || isMaterialSku(slug)) {
      return prisma.produtoEstoque.findFirst({
        where: { OR: [{ sku: slug }, { servicoSlug: slug }] },
      });
    }

    return prisma.produtoEstoque.findFirst({
      where: {
        OR: [{ sku: skuChave }, { sku: slug }, { servicoSlug: slug }],
      },
    });
  }

  async reservarPorSlug(slug: string, quantidade = 1) {
    const produto = await this.localizarProduto(slug);
    if (!produto) return null;

    const qtd = Math.max(1, quantidade);
    const disponivel = this.disponivel(produto);
    if (disponivel < qtd) throw new Error(`Estoque insuficiente: ${produto.nome} (disp. ${disponivel})`);

    await prisma.produtoEstoque.update({
      where: { id: produto.id },
      data: { reservado: { increment: qtd } },
    });

    await this.registrarMovimentacao({
      produtoId: produto.id,
      tipo: 'saida',
      categoria: 'reserva',
      descricao: `Reserva automática — ${produto.nome} (${qtd} un.)`,
      quantidade: qtd,
      responsavel: 'sistema',
    });

    return produto;
  }

  async reservarPorServico(servicoSlug: string, chave?: string, quantidade = 1) {
    if (isPecaSlug(servicoSlug)) {
      return this.reservarPorSlug(servicoSlug, quantidade);
    }
    const sku = chave ? `${servicoSlug}_${chave}` : servicoSlug;
    return this.reservarPorSlug(sku, quantidade);
  }

  async baixaPorServico(servicoSlug: string, chave?: string, quantidade = 1) {
    const produto = await this.localizarProduto(servicoSlug, chave);
    if (!produto) return null;

    const qtd = Math.max(1, quantidade);

    await prisma.produtoEstoque.update({
      where: { id: produto.id },
      data: {
        reservado: { decrement: Math.min(qtd, produto.reservado) },
        quantidade: { decrement: qtd },
      },
    });

    await this.registrarMovimentacao({
      produtoId: produto.id,
      tipo: 'saida',
      categoria: 'baixa',
      descricao: `Baixa automática — ${produto.nome} (${qtd} un.)`,
      quantidade: qtd,
      responsavel: 'sistema',
    });

    return produto;
  }

  async alertas() {
    const produtos = await this.listar();
    const alertas = [];
    for (const p of produtos) {
      const status = await this.statusAlerta(p);
      if (status !== 'ok') alertas.push(await this.enriquecer(p));
    }
    return alertas;
  }
}

export const estoqueService = new EstoqueService();
