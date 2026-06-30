import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { clientePortalService } from '../services/cliente-portal.service.js';
import { solicitacaoService } from '../services/solicitacao.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

async function clienteIdFromReq(req: Request): Promise<string> {
  if (!req.user) throw new Error('Não autenticado');
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { clienteId: true } });
  if (!user?.clienteId) throw new Error('Cliente não vinculado');
  return user.clienteId;
}

export class ClientePortalExtraController {
  async pedidosTimeline(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await clientePortalService.pedidosComTimeline(clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async garantias(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await clientePortalService.garantias(clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async avaliar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { nota, comentario } = req.body;
      return success(res, await clientePortalService.avaliar(paramId(req.params.osId), clienteId, nota, comentario));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async pendenteAvaliacao(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await clientePortalService.pendenteAvaliacao(clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async config(_req: Request, res: Response) {
    try {
      return success(res, await clientePortalService.configPublica());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async solicitarOrcamento(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { slug, descricao, endereco } = req.body;
      return success(res, await clientePortalService.solicitarOrcamento(clienteId, slug, descricao, endereco), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarEndereco(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await clientePortalService.atualizarEndereco(clienteId, req.body.endereco));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async statusPagamento(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await solicitacaoService.statusPagamento(paramId(req.params.id), clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async simularPagamento(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await clientePortalService.simularPagamento(paramId(req.params.pagamentoId), clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const clientePortalExtraController = new ClientePortalExtraController();
