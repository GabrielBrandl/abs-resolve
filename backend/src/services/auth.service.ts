import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRefreshTokenValue,
  getRefreshTokenExpiry,
} from '../utils/jwt.js';
import { sanitizeUser } from '../utils/user.js';
import { limparClienteOrfaoPorDocumento } from '../utils/cliente-cascade.js';
import { notificacaoService } from './notificacao.service.js';

export class AuthService {
  private async issueSession(user: User) {
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

  async login(email: string, senha: string) {
    const emailNorm = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: { equals: emailNorm, mode: 'insensitive' } },
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    if (user.ativo === false) {
      throw new Error('Usuário desativado. Contate o administrador.');
    }

    const senhaValida = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas');
    }

    if (user.role === 'cliente') {
      throw new Error('Use o acesso Cliente com seu CPF na tela de login.');
    }

    if (user.role === 'parceiro') {
      const parceiro = await prisma.parceiro.findUnique({ where: { userId: user.id } });
      if (!parceiro) {
        throw new Error('Conta de parceiro incompleta. Peça ao admin para recriar o acesso.');
      }
      if (!parceiro.ativo) {
        throw new Error('Parceiro desativado. Contate o administrador.');
      }
    }

    return this.issueSession(user);
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

    if (cliente.user.role !== 'cliente') {
      throw new Error('Esta conta não é de cliente. Use o acesso Equipe.');
    }

    if (cliente.user.ativo === false) {
      throw new Error('Usuário desativado. Contate o administrador.');
    }

    return this.issueSession(cliente.user);
  }

  async registrarCliente(data: {
    tipo: 'PF' | 'PJ';
    nome: string;
    cpf?: string;
    cnpj?: string;
    email: string;
    telefone: string;
    whatsapp?: string;
    senha: string;
    endereco?: object;
    consentimentoLgpd: boolean;
    ref?: string;
  }) {
    if (!data.consentimentoLgpd) {
      throw new Error('É necessário aceitar os termos LGPD');
    }

    const doc = (data.cpf || data.cnpj || '').replace(/\D/g, '');

    // Remove cadastros órfãos (sem acesso e sem pedidos) que travariam o recadastro
    await limparClienteOrfaoPorDocumento(doc, data.email);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error('Email já cadastrado');

    if (data.tipo === 'PF') {
      const exists = await prisma.cliente.findUnique({ where: { cpf: doc } });
      if (exists) throw new Error('CPF já cadastrado');
    } else {
      const exists = await prisma.cliente.findUnique({ where: { cnpj: doc } });
      if (exists) throw new Error('CNPJ já cadastrado');
    }

    // Indicação por parceiro (código de referência)
    let parceiroId: string | undefined;
    if (data.ref) {
      const parceiro = await prisma.parceiro.findFirst({
        where: { codigo: data.ref.trim().toUpperCase(), ativo: true },
      });
      if (parceiro) parceiroId = parceiro.id;
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const cliente = await prisma.cliente.create({
      data: {
        tipo: data.tipo,
        nome: data.nome,
        cpf: data.tipo === 'PF' ? doc : undefined,
        cnpj: data.tipo === 'PJ' ? doc : undefined,
        email: data.email,
        telefone: data.telefone,
        whatsapp: data.whatsapp || data.telefone,
        endereco: data.endereco || {},
        consentimentoLgpd: true,
        dataAceite: new Date(),
        parceiroId,
      },
    });

    await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
        role: 'cliente',
        clienteId: cliente.id,
      },
    });

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new Error('Erro ao criar conta');

    return this.issueSession(user);
  }

  /**
   * Esqueci minha senha (cliente): recebe CPF/CNPJ, gera um token de redefinição
   * e envia o link por e-mail/WhatsApp. Nunca revela se o documento existe.
   */
  async solicitarResetSenha(cpfCnpj: string) {
    const doc = cpfCnpj.replace(/\D/g, '');
    if (!doc) return;

    const cliente = await prisma.cliente.findFirst({
      where: { OR: [{ cpf: doc }, { cnpj: doc }] },
      include: { user: true },
    });

    if (!cliente?.user || cliente.user.role !== 'cliente' || cliente.user.ativo === false) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.deleteMany({ where: { userId: cliente.user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: cliente.user.id, token, expiresAt },
    });

    const base = (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || 'https://app.absresolve.com.br').replace(/\/$/, '');
    const link = `${base}/redefinir-senha?token=${token}`;

    await notificacaoService.enviarResetSenha({
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      whatsapp: cliente.whatsapp,
      link,
    });
  }

  async redefinirSenha(token: string, novaSenha: string) {
    if (!token) throw new Error('Token inválido');
    if (!novaSenha || novaSenha.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres');

    const registro = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!registro || registro.usedAt || registro.expiresAt < new Date()) {
      throw new Error('Link de redefinição inválido ou expirado. Solicite um novo.');
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: registro.userId }, data: { senhaHash } }),
      prisma.passwordResetToken.update({ where: { id: registro.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId: registro.userId } }),
    ]);

    return { email: registro.user.email };
  }
}

export const authService = new AuthService();
