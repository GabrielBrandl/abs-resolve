import type { Request, Response } from 'express';
import { paramId } from '../utils/params.js';
import { clientesService } from '../services/clientes.service.js';
import { success, error } from '../utils/response.js';

export class ClientesController {
  async listar(req: Request, res: Response) {
    try {
      const data = await clientesService.listar({
        status: req.query.status as string,
        tipo: req.query.tipo as string,
        busca: req.query.busca as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      const data = await clientesService.buscarPorId(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const data = await clientesService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const data = await clientesService.atualizar(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarStatus(req: Request, res: Response) {
    try {
      const data = await clientesService.atualizarStatus(paramId(req.params.id), req.body.status);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async pagamentos(req: Request, res: Response) {
    try {
      const data = await clientesService.listarPagamentos(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export const clientesController = new ClientesController();
