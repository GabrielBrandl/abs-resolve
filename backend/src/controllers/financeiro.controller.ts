import type { Request, Response } from 'express';
import { financeiroService } from '../services/financeiro.service.js';
import { success, error } from '../utils/response.js';

export class FinanceiroController {
  async seed(_req: Request, res: Response) {
    try {
      return success(res, await financeiroService.seedPadrao());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async categorias(req: Request, res: Response) {
    try {
      const all = req.query.all === '1';
      return success(res, await financeiroService.listarCategorias(all));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async salvarCategoria(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.salvarCategoria(req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async salvarSubcategoria(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.salvarSubcategoria(req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async contas(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.listarContas(req.query.all === '1'));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async salvarConta(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.salvarConta(req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async centros(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.listarCentrosCusto(req.query.all === '1'));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async salvarCentro(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.salvarCentroCusto(req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async lancamentos(req: Request, res: Response) {
    try {
      const q = req.query as Record<string, string>;
      return success(
        res,
        await financeiroService.listarLancamentos({
          ...q,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 50,
          campoData: q.campoData as 'competencia' | 'vencimento' | 'movimento' | undefined,
        })
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarLancamento(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.criarLancamento(req.body), 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarLancamento(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.atualizarLancamento(req.params.id as string, req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async baixarLancamento(req: Request, res: Response) {
    try {
      return success(
        res,
        await financeiroService.baixarLancamento(
          req.params.id as string,
          req.body?.dataMovimento,
          req.body?.contaId
        )
      );
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async recorrencias(_req: Request, res: Response) {
    try {
      return success(res, await financeiroService.listarRecorrencias());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async salvarRecorrencia(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.salvarRecorrencia(req.body));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async processarRecorrencias(req: Request, res: Response) {
    try {
      return success(res, await financeiroService.processarRecorrencias(req.body?.ate));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async fluxo(req: Request, res: Response) {
    try {
      const q = req.query as Record<string, string>;
      return success(res, await financeiroService.fluxoCaixa(q));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async dre(req: Request, res: Response) {
    try {
      const q = req.query as Record<string, string>;
      return success(res, await financeiroService.dre(q));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async resumo(req: Request, res: Response) {
    try {
      const q = req.query as Record<string, string>;
      return success(res, await financeiroService.resumoDashboardFinanceiro(q));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async exportar(req: Request, res: Response) {
    try {
      const q = req.query as Record<string, string>;
      const csv = await financeiroService.exportarCsv(q);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="lancamentos.csv"');
      return res.send(csv);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export const financeiroController = new FinanceiroController();
