import type { Request, Response } from 'express';
import { parceirosService } from '../services/parceiros.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class ParceirosController {
  async listar(_req: Request, res: Response) {
    try {
      return success(res, await parceirosService.listar());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      return success(res, await parceirosService.criar(req.body), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      return success(res, await parceirosService.atualizar(paramId(req.params.id), req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async remover(req: Request, res: Response) {
    try {
      return success(res, await parceirosService.remover(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async detalhe(req: Request, res: Response) {
    try {
      return success(res, await parceirosService.detalhe(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async marcarComissao(req: Request, res: Response) {
    try {
      const { paga } = req.body;
      return success(res, await parceirosService.marcarComissao(paramId(req.params.comissaoId), !!paga));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  /** Dashboard do próprio parceiro logado */
  async meuResumo(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await parceirosService.resumoDoUsuario(req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }
}

export const parceirosController = new ParceirosController();
