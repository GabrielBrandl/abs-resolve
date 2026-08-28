import type { Request, Response } from 'express';
import { estoqueService } from '../services/estoque.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class EstoqueAdminController {
  async dashboard(_req: Request, res: Response) {
    try {
      return success(res, await estoqueService.dashboard());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const busca = typeof req.query.busca === 'string' ? req.query.busca : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      return success(res, await estoqueService.listarComFiltros({ busca, status }));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      return success(res, await estoqueService.buscarPorId(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      return success(res, await estoqueService.criar(req.body), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      return success(res, await estoqueService.atualizar(paramId(req.params.id), req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async movimentar(req: Request, res: Response) {
    try {
      const { tipo, quantidade, motivo } = req.body as {
        tipo: 'entrada' | 'saida' | 'ajuste';
        quantidade: number;
        motivo: string;
      };
      const responsavel = req.user?.email || 'admin';
      return success(
        res,
        await estoqueService.movimentar(paramId(req.params.id), {
          tipo,
          quantidade,
          motivo,
          responsavel,
        })
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async liberarReserva(req: Request, res: Response) {
    try {
      const quantidade = Number(req.body.quantidade) || 1;
      const responsavel = req.user?.email || 'admin';
      return success(
        res,
        await estoqueService.liberarReserva(paramId(req.params.id), quantidade, responsavel)
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async historico(req: Request, res: Response) {
    try {
      const limite = Number(req.query.limite) || 50;
      return success(res, await estoqueService.historico(paramId(req.params.id), limite));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async sincronizar(_req: Request, res: Response) {
    try {
      return success(res, await estoqueService.sincronizarCatalogo());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async alertas(_req: Request, res: Response) {
    try {
      return success(res, await estoqueService.alertas());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export const estoqueAdminController = new EstoqueAdminController();
