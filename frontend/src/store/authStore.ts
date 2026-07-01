import { create } from 'zustand';
import type { User, Role } from '../types';
import { authService } from '../services/auth.service';
import { getAccessToken, setAccessToken } from '../services/api';
import { normalizeUser } from '../utils/normalize-user';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<User>;
  loginCliente: (cpfCnpj: string, senha: string) => Promise<User>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  setAuth: (user: User, accessToken: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, senha) => {
    const result = await authService.login(email, senha);
    const user = normalizeUser(result.user);
    if (!user) throw new Error('Resposta de login inválida');
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  loginCliente: async (cpfCnpj, senha) => {
    const result = await authService.loginCliente(cpfCnpj, senha);
    const user = normalizeUser(result.user);
    if (!user) throw new Error('Resposta de login inválida');
    set({ user, isAuthenticated: true, isLoading: false });
    return user;
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const raw = await authService.getMe();
      const user = normalizeUser(raw);
      if (!user) throw new Error('Usuário inválido');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    return user ? roles.includes(user.role) : false;
  },

  setAuth: (user, accessToken) => {
    setAccessToken(accessToken);
    const normalized = normalizeUser(user) || user;
    set({ user: normalized, isAuthenticated: true, isLoading: false });
  },
}));
