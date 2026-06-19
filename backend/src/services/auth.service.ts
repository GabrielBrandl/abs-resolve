import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRefreshTokenValue,
  getRefreshTokenExpiry,
} from '../utils/jwt.js';
import { sanitizeUser } from '../utils/user.js';

export class AuthService {
  async login(email: string, senha: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas');
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshTokenJwt = signRefreshToken(payload);

    const refreshTokenValue = generateRefreshTokenValue();
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken: refreshTokenJwt,
      refreshTokenValue,
    };
  }

  async refresh(refreshTokenJwt: string, refreshTokenValue: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenJwt);
    } catch {
      throw new Error('Refresh token inválido ou expirado');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (!storedToken || storedToken.userId !== payload.userId) {
      throw new Error('Refresh token inválido');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Refresh token expirado');
    }

    const user = storedToken.user;
    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(newPayload);

    return {
      user: sanitizeUser(user),
      accessToken,
    };
  }

  async logout(refreshTokenValue?: string) {
    if (refreshTokenValue) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshTokenValue } });
    }
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cliente: { select: { id: true, nome: true, tipo: true } } },
    });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    const safe = sanitizeUser(user);
    return { ...safe, cliente: user.cliente };
  }

  async loginCliente(cpfCnpj: string, senha: string) {
    const doc = cpfCnpj.replace(/\D/g, '');
    const cliente = await prisma.cliente.findFirst({
      where: { OR: [{ cpf: doc }, { cnpj: doc }] },
      include: { user: true },
    });

    if (!cliente?.user) {
      throw new Error('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(senha, cliente.user.senhaHash);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas');
    }

    return this.login(cliente.user.email, senha);
  }
}

export const authService = new AuthService();
