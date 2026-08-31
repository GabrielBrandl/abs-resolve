import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { success, error } from '../utils/response.js';
import { assertPassword } from '../utils/security.js';

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
      const email = String(req.body?.email || '');
      const senha = String(req.body?.senha || '');
      if (!email || !senha) return error(res, 'Email e senha são obrigatórios', 400);
      if (email.length > 180 || senha.length > 128) return error(res, 'Credenciais inválidas', 401);

      const result = await authService.login(email, senha);
      setRefreshCookies(res, result.refreshToken, result.refreshTokenValue);
      return success(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro ao fazer login', 401);
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const refreshTokenJwt = req.cookies[REFRESH_COOKIE];
      const refreshTokenValue = req.cookies[REFRESH_VALUE_COOKIE];
      if (!refreshTokenJwt || !refreshTokenValue) return error(res, 'Refresh token não encontrado', 401);

      const result = await authService.refresh(refreshTokenJwt, refreshTokenValue);
      return success(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      clearRefreshCookies(res);
      return error(res, err instanceof Error ? err.message : 'Erro ao renovar token', 401);
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshTokenValue = req.cookies[REFRESH_VALUE_COOKIE];
      await authService.logout(refreshTokenValue);
      clearRefreshCookies(res);
      return success(res, { message: 'Logout realizado com sucesso' });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro ao fazer logout', 500);
    }
  }

  async loginCliente(req: Request, res: Response) {
    try {
      const cpfCnpj = String(req.body?.cpfCnpj || '');
      const senha = String(req.body?.senha || '');
      if (!cpfCnpj || !senha) return error(res, 'CPF/CNPJ e senha são obrigatórios', 400);
      if (cpfCnpj.length > 32 || senha.length > 128) return error(res, 'Credenciais inválidas', 401);

      const result = await authService.loginCliente(cpfCnpj, senha);
      setRefreshCookies(res, result.refreshToken, result.refreshTokenValue);
      return success(res, { user: result.user, accessToken: result.accessToken });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro ao fazer login', 401);
    }
  }

  async registrarCliente(req: Request, res: Response) {
    try {
      try {
        assertPassword(String(req.body?.senha || ''));
      } catch (e) {
        return error(res, e instanceof Error ? e.message : 'Senha fraca', 400);
      }
      const result = await authService.registrarCliente(req.body);
      setRefreshCookies(res, result.refreshToken, result.refreshTokenValue);
      return success(res, { user: result.user, accessToken: result.accessToken }, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro ao cadastrar', 400);
    }
  }

  async checkoutConvidado(req: Request, res: Response) {
    try {
      const result = await authService.checkoutConvidado(req.body);
      setRefreshCookies(res, result.refreshToken, result.refreshTokenValue);
      return success(res, { user: result.user, accessToken: result.accessToken }, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro no checkout', 400);
    }
  }

  async esqueciSenha(req: Request, res: Response) {
    try {
      const { cpfCnpj } = req.body;
      if (!cpfCnpj) return error(res, 'Informe seu CPF/CNPJ', 400);
      await authService.solicitarResetSenha(cpfCnpj);
      return success(res, {
        message: 'Se o documento estiver cadastrado, enviaremos um link de redefinição por e-mail e WhatsApp.',
      });
    } catch {
      // Não revela detalhes por segurança
      return success(res, {
        message: 'Se o documento estiver cadastrado, enviaremos um link de redefinição por e-mail e WhatsApp.',
      });
    }
  }

  async redefinirSenha(req: Request, res: Response) {
    try {
      const { token, senha } = req.body;
      try {
        assertPassword(String(senha || ''));
      } catch (e) {
        return error(res, e instanceof Error ? e.message : 'Senha fraca', 400);
      }
      const result = await authService.redefinirSenha(token, senha);
      return success(res, { message: 'Senha redefinida com sucesso. Faça login com a nova senha.', ...result });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro ao redefinir senha', 400);
    }
  }

  async me(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      const user = await authService.getMe(req.user.userId);
      return success(res, { user });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro ao buscar usuário', 404);
    }
  }
}

export const authController = new AuthController();
