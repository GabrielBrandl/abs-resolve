import type { Request, Response } from 'express';
import { paramId } from '../utils/params.js';
import { receitaTecnicaService } from '../services/receita-tecnica.service.js';
import { success, error } from '../utils/response.js';

export class ReceitaTecnicaController {
  async listarPorServico(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.listarPorServico(paramId(req.params.servicoId)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscar(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.buscar(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      return success(
        res,
        await receitaTecnicaService.criar({
          catalogoServicoId: paramId(req.params.servicoId),
          ...req.body,
        }),
        201
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.atualizar(paramId(req.params.id), req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async duplicar(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.duplicar(paramId(req.params.id)), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async adicionarMaterial(req: Request, res: Response) {
    try {
      return success(
        res,
        await receitaTecnicaService.adicionarMaterial(paramId(req.params.id), req.body),
        201
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarMaterial(req: Request, res: Response) {
    try {
      return success(
        res,
        await receitaTecnicaService.atualizarMaterial(paramId(req.params.materialId), req.body)
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async removerMaterial(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.removerMaterial(paramId(req.params.materialId)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async materiaisOs(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.listarMateriaisOs(paramId(req.params.id)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async regenerarOs(req: Request, res: Response) {
    try {
      return success(
        res,
        await receitaTecnicaService.gerarMateriaisParaOs(paramId(req.params.id), { force: true })
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async adicionarMaterialOs(req: Request, res: Response) {
    try {
      return success(
        res,
        await receitaTecnicaService.adicionarMaterialOs(paramId(req.params.id), req.body),
        201
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarMaterialOs(req: Request, res: Response) {
    try {
      return success(
        res,
        await receitaTecnicaService.atualizarMaterialOs(paramId(req.params.materialId), req.body)
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async removerMaterialOs(req: Request, res: Response) {
    try {
      return success(res, await receitaTecnicaService.removerMaterialOs(paramId(req.params.materialId)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const receitaTecnicaController = new ReceitaTecnicaController();
