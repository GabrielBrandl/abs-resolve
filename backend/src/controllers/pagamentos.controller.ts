import { paramId } from '../utils/params.js';
import type { Request, Response } from 'express';
import { pagamentosService } from '../services/pagamentos.service.js';
import { asaasService } from '../services/asaas.service.js';
import { notificacaoService } from '../services/notificacao.service.js';
import { success, error } from '../utils/response.js';
import { toNumber } from '../utils/helpers.js';

export class PagamentosController {
  async listar(req: Request, res: Response) {
    try {
      const data = await pagamentosService.listar({
        status: req.query.status as string,
        clienteId: req.query.clienteId as string,
        dataInicio: req.query.dataInicio as string,
        dataFim: req.query.dataFim as string,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async cobrar(req: Request, res: Response) {
    try {
      const data = await pagamentosService.criarCobranca(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async segundaVia(req: Request, res: Response) {
    try {
      const data = await pagamentosService.segundaVia(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async dashboard(_req: Request, res: Response) {
    try {
      const data = await pagamentosService.dashboardFinanceiro();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async webhookAsaas(req: Request, res: Response) {
    try {
      const { event, payment } = req.body;
      const pagamento = await asaasService.processarWebhook(event, payment);

      if (pagamento) {
        notificacaoService
          .notificarPagamento(
            pagamento.cliente.nome,
            toNumber(pagamento.valor),
            pagamento.status,
            pagamento.cliente.email
          )
          .catch(() => {});
      }

      return success(res, { received: true });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const pagamentosController = new PagamentosController();
