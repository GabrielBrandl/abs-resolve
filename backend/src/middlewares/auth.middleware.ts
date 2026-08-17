import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { error } from '../utils/response.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return error(res, 'Token de acesso não fornecido', 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.length > 2048) {
    return error(res, 'Token inválido ou expirado', 401);
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return error(res, 'Sessão expirada. Entre novamente.', 401);
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Token inválido — continua sem usuário autenticado
    }
  }

  next();
}
