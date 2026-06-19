import { create } from 'zustand';
import type { User, Role } from '../types';
import { authService } from '../services/auth.service';
import { getAccessToken } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  loginCliente: (cpfCnpj: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, senha) => {
    const result = await authService.login(email, senha);
    set({ user: result.user, isAuthenticated: true, isLoading: false });
  },

  loginCliente: async (cpfCnpj, senha) => {
    const result = await authService.loginCliente(cpfCnpj, senha);
    set({ user: result.user, isAuthenticated: true, isLoading: false });
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
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    return user ? roles.includes(user.role) : false;
  },
}));
