import type { Request, Response } from 'express';
import { documentosService } from '../services/documentos.service.js';
import { paramId } from '../utils/params.js';
import { success, error } from '../utils/response.js';

export class DocumentosController {
  async listar(req: Request, res: Response) {
    try {
      const data = await documentosService.listarPorCliente(paramId(req.params.clienteId));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async upload(req: Request, res: Response) {
    try {
      if (!req.file) return error(res, 'Arquivo não enviado', 400);
      const data = await documentosService.upload(paramId(req.params.clienteId), req.file);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      await documentosService.excluir(paramId(req.params.id));
      return success(res, { message: 'Documento excluído' });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }
}

export const documentosController = new DocumentosController();
