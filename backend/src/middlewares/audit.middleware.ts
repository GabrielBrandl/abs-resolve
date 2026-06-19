import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { paramId } from '../utils/params.js';

export function auditLog(acao: string, recurso: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      if (typeof body === 'object' && body !== null && 'success' in body && (body as { success: boolean }).success) {
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId,
              acao,
              recurso,
              recursoId: req.params.id ? paramId(req.params.id) : undefined,
              detalhes: { method: req.method, path: req.path, body: req.body },
              ip: req.ip || req.socket.remoteAddress,
            },
          })
          .catch(() => {});
      }
      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}

export async function registrarAuditoria(
  userId: string | undefined,
  acao: string,
  recurso: string,
  recursoId?: string,
  detalhes?: object,
  ip?: string
) {
  await prisma.auditLog.create({
    data: { userId, acao, recurso, recursoId, detalhes, ip },
  });
}
