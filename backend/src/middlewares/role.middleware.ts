import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { error } from '../utils/response.js';

export function checkRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return error(res, 'Não autenticado', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, 'Acesso negado: permissão insuficiente', 403);
    }

    next();
  };
}
