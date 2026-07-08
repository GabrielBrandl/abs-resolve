import type { Request, Response } from 'express';
import { iaTreinamentoService } from '../services/ia-treinamento.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class IaTreinamentoController {
  async listar(_req: Request, res: Response) {
    try {
      return success(res, await iaTreinamentoService.listar());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async chat(req: Request, res: Response) {
    try {
      const adminId = req.user?.userId;
      if (!adminId) return error(res, 'Não autenticado', 401);

      const { mensagem, servicoSlug, salvar } = req.body;
      const data = await iaTreinamentoService.chat(adminId, mensagem, { servicoSlug, salvar });
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const data = await iaTreinamentoService.atualizar(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const data = await iaTreinamentoService.excluir(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const iaTreinamentoController = new IaTreinamentoController();
