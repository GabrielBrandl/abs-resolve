import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { agendamentoService } from '../services/agendamento.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

async function clienteIdFromReq(req: Request): Promise<string> {
  if (!req.user) throw new Error('Não autenticado');
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { clienteId: true } });
  if (!user?.clienteId) throw new Error('Cliente não vinculado');
  return user.clienteId;
}

export class AgendamentoController {
  async cancelar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const data = await agendamentoService.cancelar(paramId(req.params.id), clienteId);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async ausencia(req: Request, res: Response) {
    try {
      const data = await agendamentoService.registrarAusencia(paramId(req.params.id));
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async reagendar(req: Request, res: Response) {
    try {
      const clienteId = req.user?.role === 'cliente' ? await clienteIdFromReq(req) : req.body.clienteId;
      const data = await agendamentoService.reagendar(paramId(req.params.id), clienteId, req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const agendamentoController = new AgendamentoController();
