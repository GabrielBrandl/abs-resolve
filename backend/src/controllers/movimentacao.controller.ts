import type { Request, Response } from 'express';
import { movimentacaoService, toCsv } from '../services/movimentacao.service.js';
import { clientesService } from '../services/clientes.service.js';
import { pedidosService } from '../services/pedidos.service.js';
import { paramId } from '../utils/params.js';
import { success, error } from '../utils/response.js';

export class MovimentacaoController {
  async listar(req: Request, res: Response) {
    try {
      const data = await movimentacaoService.listar({
        tipo: req.query.tipo as string,
        categoria: req.query.categoria as string,
        dataInicio: req.query.dataInicio as string,
        dataFim: req.query.dataFim as string,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const data = await movimentacaoService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async resumo(_req: Request, res: Response) {
    try {
      const data = await movimentacaoService.resumo();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export class ExportController {
  async clientes(req: Request, res: Response) {
    try {
      const rows = await clientesService.exportarCsv({
        status: req.query.status as string,
        tipo: req.query.tipo as string,
        busca: req.query.busca as string,
      });
      const csv = toCsv(rows, ['nome', 'tipo', 'documento', 'email', 'telefone', 'status']);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=clientes.csv');
      return res.send(csv);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async pedidos(req: Request, res: Response) {
    try {
      const rows = await pedidosService.exportarCsv({
        status: req.query.status as string,
        busca: req.query.busca as string,
      });
      const csv = toCsv(rows, ['numero', 'cliente', 'valor', 'status', 'responsavel', 'createdAt']);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=pedidos.csv');
      return res.send(csv);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export const movimentacaoController = new MovimentacaoController();
export const exportController = new ExportController();
