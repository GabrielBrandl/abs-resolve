import type { Request, Response } from 'express';
import { tecnicoService } from '../services/tecnico.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class TecnicoController {
  async minhasOs(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.minhasOs(req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async buscarOs(req: Request, res: Response) {
    try {
      const os = await tecnicoService.buscarOs(paramId(req.params.id), req.user?.userId);
      if (!os) return error(res, 'OS não encontrada', 404);
      return success(res, os);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async etapa(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      const { etapa } = req.body;
      return success(res, await tecnicoService.atualizarEtapa(paramId(req.params.id), etapa, req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async voltarEtapaOs(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.voltarEtapaOs(paramId(req.params.id), req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async checklist(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.atualizarChecklist(paramId(req.params.id), req.user.userId, req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async concluir(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      const { descricaoConclusao, materiais } = req.body;
      return success(res, await tecnicoService.concluirServico(paramId(req.params.id), req.user.userId, {
        descricaoConclusao,
        materiais,
      }));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async uploadFoto(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      const file = req.file;
      if (!file) return error(res, 'Arquivo obrigatório', 400);
      const campo = (req.body.campo as string) || 'fotoDepois';
      const data = await tecnicoService.uploadChecklistFoto(
        paramId(req.params.id),
        req.user.userId,
        campo,
        file
      );
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async agendaHoje(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.agendaHoje(req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async aCaminho(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.marcarACaminho(paramId(req.params.id), req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async chegada(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.marcarChegada(paramId(req.params.id), req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async voltarAgendamento(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      return success(res, await tecnicoService.voltarAgendamento(paramId(req.params.id), req.user.userId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const tecnicoController = new TecnicoController();
