import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const [modo, setModo] = useState<'equipe' | 'cliente'>('equipe');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginCliente } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (modo === 'equipe') {
        await login(email, senha);
        navigate('/');
      } else {
        await loginCliente(cpfCnpj, senha);
        navigate('/cliente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">ABS Resolve</h1>
          <p className="mt-2 text-slate-300">Acesse sua conta para continuar</p>
        </div>

        <div className="mb-4 flex rounded-xl bg-white/10 p-1">
          <button type="button" onClick={() => setModo('equipe')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${modo === 'equipe' ? 'bg-white text-slate-900' : 'text-white'}`}>
            Equipe
          </button>
          <button type="button" onClick={() => setModo('cliente')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${modo === 'cliente' ? 'bg-white text-slate-900' : 'text-white'}`}>
            Portal Cliente
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {modo === 'equipe' ? (
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="seu@email.com" />
            </div>
          ) : (
            <div className="mb-4">
              <label htmlFor="cpfCnpj" className="mb-1.5 block text-sm font-medium text-slate-700">CPF ou CNPJ</label>
              <input id="cpfCnpj" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="000.000.000-00" />
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="senha" className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="mt-4 space-y-1 text-center text-xs text-slate-400">
            {modo === 'equipe' ? (
              <p>Demo: admin@absresolve.com.br / admin123</p>
            ) : (
              <p>Demo: CPF 529.982.247-25 / cliente123</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
