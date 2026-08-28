import type { Request, Response } from 'express';
import { nfseAdminService } from '../services/nfse-admin.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class NfseAdminController {
  async dashboard(_req: Request, res: Response) {
    try {
      return success(res, await nfseAdminService.dashboard());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async config(_req: Request, res: Response) {
    try {
      return success(res, nfseAdminService.config());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async listar(req: Request, res: Response) {
    try {
      return success(
        res,
        await nfseAdminService.listar({
          status: req.query.status as string,
          busca: req.query.busca as string,
          de: req.query.de as string,
          ate: req.query.ate as string,
        })
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      return success(res, await nfseAdminService.buscar(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async consultar(req: Request, res: Response) {
    try {
      return success(res, await nfseAdminService.consultar(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async reemitir(req: Request, res: Response) {
    try {
      return success(res, await nfseAdminService.reemitir(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async emitirPagamento(req: Request, res: Response) {
    try {
      const pagamentoId = req.body.pagamentoId as string;
      if (!pagamentoId) return error(res, 'pagamentoId obrigatório', 400);
      return success(res, await nfseAdminService.emitirPorPagamento(pagamentoId), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const nfseAdminController = new NfseAdminController();
