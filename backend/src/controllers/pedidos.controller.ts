import type { Request, Response } from 'express';
import { paramId } from '../utils/params.js';
import { pedidosService } from '../services/pedidos.service.js';
import { ordemServicoService } from '../services/ordemServico.service.js';
import { success, error } from '../utils/response.js';

export class PedidosController {
  async listar(req: Request, res: Response) {
    try {
      const data = await pedidosService.listar({
        status: req.query.status as string,
        busca: req.query.busca as string,
        clienteId: req.query.clienteId as string,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      const data = await pedidosService.buscarPorId(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const data = await pedidosService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarStatus(req: Request, res: Response) {
    try {
      const data = await pedidosService.atualizarStatus(paramId(req.params.id), req.body.status);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async statusList(_req: Request, res: Response) {
    return success(res, pedidosService.getStatusList());
  }
}

export class OrdemServicoController {
  async listar(req: Request, res: Response) {
    try {
      const data = await ordemServicoService.listar({
        etapa: req.query.etapa as string,
        parceiro: req.query.parceiro as string,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      const data = await ordemServicoService.buscarPorId(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const data = await ordemServicoService.criar(paramId(req.params.pedidoId), req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarEtapa(req: Request, res: Response) {
    try {
      const data = await ordemServicoService.atualizarEtapa(paramId(req.params.id), req.body.etapa);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const data = await ordemServicoService.atualizar(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async etapas(_req: Request, res: Response) {
    return success(res, ordemServicoService.getEtapas());
  }

  async checklist(req: Request, res: Response) {
    try {
      const data = await ordemServicoService.atualizarChecklist(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const pedidosController = new PedidosController();
export const ordemServicoController = new OrdemServicoController();
