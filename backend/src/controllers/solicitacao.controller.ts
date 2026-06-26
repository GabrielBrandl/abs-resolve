import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { solicitacaoService } from '../services/solicitacao.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

async function clienteIdFromReq(req: Request): Promise<string> {
  if (!req.user) throw new Error('Não autenticado');
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { clienteId: true } });
  if (!user?.clienteId) throw new Error('Cliente não vinculado');
  return user.clienteId;
}

export class SolicitacaoController {
  async catalogo(_req: Request, res: Response) {
    try {
      return success(res, await solicitacaoService.listarCatalogo());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async upsells(req: Request, res: Response) {
    try {
      const slug = typeof req.params.slug === 'string' ? req.params.slug : req.params.slug[0];
      return success(res, solicitacaoService.getUpsells(slug));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarCarrinho(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { itens, express } = req.body as {
        itens: Array<{ slug: string; quantidade: number }>;
        express?: boolean;
      };
      const data = await solicitacaoService.criarCarrinho(clienteId, itens || [], !!express);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { express } = req.body;
      const data = await solicitacaoService.atualizarCheckout(paramId(req.params.id), clienteId, !!express);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { servicoSlug, opcoes } = req.body;
      const data = await solicitacaoService.criar(clienteId, servicoSlug, opcoes);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async minhas(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await solicitacaoService.minhasSolicitacoes(clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async fotos(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { fotos } = req.body;
      const data = await solicitacaoService.enviarFotos(paramId(req.params.id), clienteId, fotos);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async uploadFotos(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const files = req.files as Express.Multer.File[];
      if (!files?.length) return error(res, 'Nenhuma foto enviada', 400);

      let solicitacaoId = paramId(req.params.id);
      if (solicitacaoId === 'nova') {
        const { servicoSlug, opcoes } = req.body;
        const sol = await solicitacaoService.criar(clienteId, servicoSlug, opcoes ? JSON.parse(opcoes) : {});
        solicitacaoId = sol.id;
      }

      const data = await solicitacaoService.uploadFotos(solicitacaoId, clienteId, files);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async upsellsAplicar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { upsells, express } = req.body;
      const data = await solicitacaoService.aplicarUpsells(paramId(req.params.id), clienteId, upsells || [], !!express);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async horarios(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const data = await solicitacaoService.horariosDisponiveis(paramId(req.params.id), clienteId);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async agendar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const data = await solicitacaoService.agendar(paramId(req.params.id), clienteId, req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async pagar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { metodo } = req.body;
      const data = await solicitacaoService.finalizarPagamento(paramId(req.params.id), clienteId, (metodo || 'PIX') as 'PIX' | 'BOLETO' | 'CARTAO');
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async calcularTipoA(req: Request, res: Response) {
    try {
      const { servicoSlug, opcoes, upsells, express } = req.body;
      const data = await solicitacaoService.calcularPrecoFinalTipoA(servicoSlug, opcoes || {}, upsells || [], !!express);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const solicitacaoController = new SolicitacaoController();
