import type { Request, Response } from 'express';
import { catalogoAdminService } from '../services/catalogo-admin.service.js';
import { fluxoConfigService } from '../services/fluxo-config.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

export class CatalogoAdminController {
  async listar(_req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.listarServicos());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const data = await catalogoAdminService.atualizarServico(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const permanente = req.query.permanente === 'true';
      const id = paramId(req.params.id);
      const data = permanente
        ? await catalogoAdminService.excluirServicoPermanente(id)
        : await catalogoAdminService.excluirServico(id);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async uploadImagem(req: Request, res: Response) {
    try {
      if (!req.file) return error(res, 'Nenhuma imagem enviada', 400);
      const data = await catalogoAdminService.atualizarImagem(paramId(req.params.id), req.file);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async config(_req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.getConfig());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.updateConfig(req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async estoque(_req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.listarEstoque());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async updateEstoque(req: Request, res: Response) {
    try {
      const { quantidade, minimo } = req.body;
      return success(res, await catalogoAdminService.atualizarEstoque(paramId(req.params.id), quantidade, minimo));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async tecnicos(_req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.listarTecnicos());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarTecnico(req: Request, res: Response) {
    try {
      const { nome, capacidadeDiaria } = req.body;
      return success(res, await catalogoAdminService.criarTecnico(nome, capacidadeDiaria), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async agenda(req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.agendaOperacional(req.query.dataInicio as string));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async orcamentos(_req: Request, res: Response) {
    try {
      return success(res, await catalogoAdminService.orcamentosPendentes());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async responderOrcamento(req: Request, res: Response) {
    try {
      const { precoFinal, observacao } = req.body;
      return success(res, await catalogoAdminService.responderOrcamento(paramId(req.params.id), precoFinal, observacao));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async listarFluxos(_req: Request, res: Response) {
    try {
      return success(res, await fluxoConfigService.listar());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async obterFluxo(req: Request, res: Response) {
    try {
      return success(res, await fluxoConfigService.obter(String(req.params.slug)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async atualizarFluxo(req: Request, res: Response) {
    try {
      return success(res, await fluxoConfigService.atualizar(String(req.params.slug), req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async restaurarFluxo(req: Request, res: Response) {
    try {
      return success(res, await fluxoConfigService.restaurarPadrao(String(req.params.slug)));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const catalogoAdminController = new CatalogoAdminController();
