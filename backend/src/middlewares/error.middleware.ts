import type { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response.js';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return error(res, err.message, err.statusCode);
  }

  console.error('[ERROR]', err);
  return error(res, 'Erro interno do servidor', 500);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
