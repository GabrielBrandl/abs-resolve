import { api, setAccessToken } from './api';
import { mensagemErroApi } from '../utils/api-error';
import type { ApiResponse, LoginResponse } from '../types';

async function authPost(path: string, body?: unknown) {
  try {
    const { data } = await api.post<ApiResponse<LoginResponse>>(path, body);
    if (!data.success || !data.data) throw new Error(data.error || 'Erro na requisição');
    return data.data;
  } catch (err) {
    throw new Error(mensagemErroApi(err));
  }
}

export const authService = {
  async login(email: string, senha: string) {
    const data = await authPost('/auth/login', { email, senha });
    setAccessToken(data.accessToken);
    return data;
  },

  async loginCliente(cpfCnpj: string, senha: string) {
    const data = await authPost('/auth/login-cliente', { cpfCnpj, senha });
    setAccessToken(data.accessToken);
    return data;
  },

  async logout() {
    try { await api.post('/auth/logout'); } finally { setAccessToken(null); }
  },

  async getMe() {
    const { data } = await api.get<ApiResponse<{ user: LoginResponse['user'] }>>('/auth/me');
    if (!data.success || !data.data) throw new Error(data.error || 'Erro');
    return data.data.user;
  },

  async registrar(body: unknown) {
    const data = await authPost('/auth/registrar', body);
    setAccessToken(data.accessToken);
    return data;
  },

  async checkoutConvidado(body: unknown) {
    const data = await authPost('/auth/checkout-convidado', body);
    setAccessToken(data.accessToken);
    return data;
  },
};
