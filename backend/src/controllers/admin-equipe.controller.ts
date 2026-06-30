import type { Request, Response } from 'express';
import { adminEquipeService } from '../services/admin-equipe.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class AdminEquipeController {
  async listarUsuarios(_req: Request, res: Response) {
    try {
      return success(res, await adminEquipeService.listarUsuarios());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarUsuario(req: Request, res: Response) {
    try {
      const data = await adminEquipeService.criarUsuario(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async criarCliente(req: Request, res: Response) {
    try {
      const data = await adminEquipeService.criarCliente(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async alterarStatus(req: Request, res: Response) {
    try {
      const { ativo } = req.body;
      const data = await adminEquipeService.alterarStatusUsuario(paramId(req.params.id), !!ativo);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarUsuario(req: Request, res: Response) {
    try {
      const data = await adminEquipeService.atualizarUsuario(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async deletarUsuario(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      const data = await adminEquipeService.deletarUsuario(paramId(req.params.id), req.user.userId);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atribuicoes(_req: Request, res: Response) {
    try {
      return success(res, await adminEquipeService.listarAtribuicoes());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async atribuirTecnico(req: Request, res: Response) {
    try {
      const { tecnicoId } = req.body;
      const data = await adminEquipeService.atribuirTecnico(paramId(req.params.id), tecnicoId || null);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async tecnicosCarga(_req: Request, res: Response) {
    try {
      return success(res, await adminEquipeService.listarTecnicosComCarga());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export const adminEquipeController = new AdminEquipeController();
