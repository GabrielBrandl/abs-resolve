import { paramId } from '../utils/params.js';
import type { Request, Response } from 'express';
import { pagamentosService } from '../services/pagamentos.service.js';
import { asaasService } from '../services/asaas.service.js';
import { success, error } from '../utils/response.js';

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

  async registrarRecebido(req: Request, res: Response) {
    try {
      const data = await pagamentosService.registrarRecebido({
        pedidoId: req.body.pedidoId,
        metodo: req.body.metodo,
        valor: req.body.valor != null ? Number(req.body.valor) : undefined,
      });
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
      const token = process.env.ASAAS_WEBHOOK_TOKEN;
      if (token && req.headers['asaas-access-token'] !== token) {
        return error(res, 'Webhook não autorizado', 401);
      }

      const { event, payment } = req.body;
      const pagamento = await asaasService.processarWebhook(event, payment);

      // E-mail enviado em confirmarPagamentoRecebido quando status = RECEIVED
      return success(res, { received: true, pagamentoId: pagamento?.id });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const pagamentosController = new PagamentosController();
