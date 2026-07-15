import type { Request, Response } from 'express';
import { paramId } from '../utils/params.js';
import { leadsService } from '../services/leads.service.js';
import { success, error } from '../utils/response.js';

export class LeadsController {
  async capturarConsultor(req: Request, res: Response) {
    try {
      const data = await leadsService.capturarConsultor(req.body);
      return success(res, { id: data.id }, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Dados inválidos', 400);
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const data = await leadsService.listar({
        etapa: req.query.etapa as string,
        responsavel: req.query.responsavel as string,
        origem: req.query.origem as string,
        busca: req.query.busca as string,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      const data = await leadsService.buscarPorId(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const data = await leadsService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarEtapa(req: Request, res: Response) {
    try {
      const data = await leadsService.atualizarEtapa(paramId(req.params.id), req.body.etapa);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async registrarInteracao(req: Request, res: Response) {
    try {
      const data = await leadsService.registrarInteracao(paramId(req.params.id), {
        ...req.body,
        usuarioId: req.user!.userId,
      });
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async historico(req: Request, res: Response) {
    try {
      const data = await leadsService.historico(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async converterCliente(req: Request, res: Response) {
    try {
      const data = await leadsService.converterParaCliente(paramId(req.params.id));
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async etapas(_req: Request, res: Response) {
    return success(res, leadsService.getEtapas());
  }
}

export const leadsController = new LeadsController();
