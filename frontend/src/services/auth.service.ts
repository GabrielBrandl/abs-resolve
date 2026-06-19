import { api, setAccessToken } from './api';
import type { ApiResponse, LoginResponse } from '../types';

export const authService = {
  async login(email: string, senha: string) {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, senha });
    if (!data.success || !data.data) throw new Error(data.error || 'Erro ao fazer login');
    setAccessToken(data.data.accessToken);
    return data.data;
  },

  async loginCliente(cpfCnpj: string, senha: string) {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login-cliente', { cpfCnpj, senha });
    if (!data.success || !data.data) throw new Error(data.error || 'Erro ao fazer login');
    setAccessToken(data.data.accessToken);
    return data.data;
  },

  async logout() {
    try { await api.post('/auth/logout'); } finally { setAccessToken(null); }
  },

  async getMe() {
    const { data } = await api.get<ApiResponse<{ user: LoginResponse['user'] }>>('/auth/me');
    if (!data.success || !data.data) throw new Error(data.error || 'Erro');
    return data.data.user;
  },
};
