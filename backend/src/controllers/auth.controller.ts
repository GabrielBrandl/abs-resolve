import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { success, error } from '../utils/response.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_VALUE_COOKIE = 'refresh_token_value';

function setRefreshCookies(res: Response, refreshToken: string, refreshTokenValue: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.cookie(REFRESH_VALUE_COOKIE, refreshTokenValue, cookieOptions);
}

function clearRefreshCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_VALUE_COOKIE, { path: '/' });
}

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return error(res, 'Email e senha são obrigatórios', 400);
      }

      const result = await authService.login(email, senha);
      setRefreshCookies(res, result.refreshToken, result.refreshTokenValue);

      return success(res, {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      return error(res, message, 401);
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const refreshTokenJwt = req.cookies[REFRESH_COOKIE];
      const refreshTokenValue = req.cookies[REFRESH_VALUE_COOKIE];

      if (!refreshTokenJwt || !refreshTokenValue) {
        return error(res, 'Refresh token não encontrado', 401);
      }

      const result = await authService.refresh(refreshTokenJwt, refreshTokenValue);
      return success(res, {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      clearRefreshCookies(res);
      const message = err instanceof Error ? err.message : 'Erro ao renovar token';
      return error(res, message, 401);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshTokenValue = req.cookies[REFRESH_VALUE_COOKIE];
      await authService.logout(refreshTokenValue);
      clearRefreshCookies(res);
      return success(res, { message: 'Logout realizado com sucesso' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer logout';
      return error(res, message, 500);
    }
  }

  async loginCliente(req: Request, res: Response) {
    try {
      const { cpfCnpj, senha } = req.body;
      if (!cpfCnpj || !senha) {
        return error(res, 'CPF/CNPJ e senha são obrigatórios', 400);
      }

      const result = await authService.loginCliente(cpfCnpj, senha);
      setRefreshCookies(res, result.refreshToken, result.refreshTokenValue);

      return success(res, {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      return error(res, message, 401);
    }
  }

  async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return error(res, 'Não autenticado', 401);
      }

      const user = await authService.getMe(req.user.userId);
      return success(res, { user });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar usuário';
      return error(res, message, 404);
    }
  }
}

export const authController = new AuthController();
