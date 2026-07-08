import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { authApi } from '../services/modules.service';
import { Button } from '../components/ui';

function mensagemErro(err: unknown) {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Servidor offline. Tente novamente em instantes.';
    const api = err.response.data as { error?: string };
    if (api?.error) return api.error;
  }
  return err instanceof Error ? err.message : 'Erro ao redefinir senha';
}

export function RedefinirSenhaPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (senha.length < 6) return setError('A senha deve ter no mínimo 6 caracteres');
    if (senha !== confirmar) return setError('As senhas não conferem');

    setLoading(true);
    try {
      await authApi.redefinirSenha(token, senha);
      setOk(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg relative flex min-h-screen items-center justify-center bg-cover bg-no-repeat px-4 py-8">
      <div className="absolute inset-0 bg-black/25" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="mb-1 text-xl font-bold text-primary-800">Criar nova senha</h1>

          {!token ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                Link inválido. Solicite a redefinição novamente.
              </div>
              <Link to="/esqueci-senha" className="block text-center text-sm font-medium text-primary-600">Solicitar novo link</Link>
            </div>
          ) : ok ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Senha redefinida com sucesso! Redirecionando para o login...
              </div>
              <Link to="/login" className="block text-center text-sm font-medium text-primary-600">Ir para o login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mb-5 text-sm text-slate-500">Digite sua nova senha de acesso ao portal.</p>
              {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
              <div className="mb-4">
                <label htmlFor="senha" className="mb-1.5 block text-sm font-medium text-primary-700">Nova senha</label>
                <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
                  className="w-full rounded-lg border border-abs-gray px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div className="mb-5">
                <label htmlFor="confirmar" className="mb-1.5 block text-sm font-medium text-primary-700">Confirmar nova senha</label>
                <input id="confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required
                  className="w-full rounded-lg border border-abs-gray px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <Button type="submit" variant="cta" disabled={loading} className="w-full py-3">
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
