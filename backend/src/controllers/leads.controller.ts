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

  async dashboard(req: Request, res: Response) {
    try {
      return success(
        res,
        await leadsService.dashboard({
          de: req.query.de as string,
          ate: req.query.ate as string,
          responsavel: req.query.responsavel as string,
          origem: req.query.origem as string,
          campanha: req.query.campanha as string,
          categoria: req.query.categoria as string,
          servicoId: req.query.servicoId as string,
          etapa: req.query.etapa as string,
        })
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async indicadores(req: Request, res: Response) {
    try {
      return success(
        res,
        await leadsService.indicadores({
          de: req.query.de as string,
          ate: req.query.ate as string,
          responsavel: req.query.responsavel as string,
          origem: req.query.origem as string,
          campanha: req.query.campanha as string,
          categoria: req.query.categoria as string,
          servicoId: req.query.servicoId as string,
          etapa: req.query.etapa as string,
        })
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async listar(req: Request, res: Response) {
    try {
      const data = await leadsService.listar({
        etapa: req.query.etapa as string,
        responsavel: req.query.responsavel as string,
        origem: req.query.origem as string,
        campanha: req.query.campanha as string,
        categoria: req.query.categoria as string,
        servicoId: req.query.servicoId as string,
        prioridade: req.query.prioridade as string,
        busca: req.query.busca as string,
        de: req.query.de as string,
        ate: req.query.ate as string,
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

  async timeline(req: Request, res: Response) {
    try {
      return success(res, await leadsService.timeline(paramId(req.params.id)));
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

  async atualizar(req: Request, res: Response) {
    try {
      const data = await leadsService.atualizar(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarEtapa(req: Request, res: Response) {
    try {
      const data = await leadsService.atualizarEtapa(
        paramId(req.params.id),
        req.body.etapa,
        req.body.motivoPerda,
        req.body.proximoContato
      );
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarStatusComercial(req: Request, res: Response) {
    try {
      const data = await leadsService.atualizarStatusComercial(paramId(req.params.id), req.body);
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
      const data = await leadsService.converterParaCliente(paramId(req.params.id), req.user!.userId);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async criarOrcamento(req: Request, res: Response) {
    try {
      const data = await leadsService.criarOrcamento(paramId(req.params.id), {
        ...req.body,
        usuarioId: req.user!.userId,
      });
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async criarPedido(req: Request, res: Response) {
    try {
      const data = await leadsService.criarPedido(paramId(req.params.id), {
        ...req.body,
        usuarioId: req.user!.userId,
      });
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async agendarFollowUp(req: Request, res: Response) {
    try {
      const data = await leadsService.agendarFollowUp(paramId(req.params.id), {
        ...req.body,
        usuarioId: req.user!.userId,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async vincularOrcamento(req: Request, res: Response) {
    try {
      const data = await leadsService.vincularOrcamento(
        paramId(req.params.id),
        req.body.solicitacaoId,
        req.user!.userId
      );
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const data = await leadsService.excluir(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async etapas(_req: Request, res: Response) {
    return success(res, leadsService.getEtapas());
  }

  async motivosPerda(_req: Request, res: Response) {
    return success(res, leadsService.getMotivosPerda());
  }
}

export const leadsController = new LeadsController();
