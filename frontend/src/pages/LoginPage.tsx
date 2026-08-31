import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';
import { getHomeForRole, isClienteRole, canLoginEquipe } from '../utils/auth-routes';

function mensagemErro(err: unknown) {
  if (axios.isAxiosError(err)) {
    if (!err.response || err.response.status === 502) {
      return 'Servidor offline. Rode cd backend && npm run dev em outro terminal.';
    }
    const api = err.response.data as { error?: string };
    if (api?.error) return api.error;
    if (err.response.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  return err instanceof Error ? err.message : 'Erro ao fazer login';
}

export function LoginPage() {
  const [modo, setModo] = useState<'equipe' | 'cliente'>('cliente');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginCliente, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (modo === 'equipe') {
        const user = await login(email.trim(), senha);
        if (!canLoginEquipe(user.role)) {
          await logout();
          setError(
            isClienteRole(user.role)
              ? 'Esta conta é de cliente. Use a aba Cliente e entre com seu CPF.'
              : 'Perfil sem acesso. Contate o administrador.'
          );
          return;
        }
        navigate(getHomeForRole(user.role));
      } else {
        const user = await loginCliente(cpfCnpj, senha);
        if (!isClienteRole(user.role)) {
          await logout();
          setError('Esta conta é da equipe ou parceiro. Use a aba Equipe / Parceiro com o e-mail.');
          return;
        }
        const next = searchParams.get('next');
        navigate(
          next
            ? next
            : searchParams.get('assistente') === '1' && sessionStorage.getItem('abs-guided-selling')
              ? '/agendar?assistente=1'
              : '/'
        );
      }
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
        <div className="mb-4 flex rounded-xl border border-white/20 bg-black/35 p-1 backdrop-blur-md" role="tablist" aria-label="Tipo de acesso">
          {(['cliente', 'equipe'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={modo === tab}
              onClick={() => setModo(tab)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                modo === tab
                  ? 'bg-accent-500 text-primary-900 shadow-md'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab === 'cliente' ? 'Cliente' : 'Equipe / Parceiro'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-2xl">
          {searchParams.get('next')?.includes('/agendar') && (
            <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Seu carrinho está salvo. Entre só para pagar e agendar.
            </p>
          )}
          {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          {modo === 'equipe' ? (
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-primary-700">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-abs-gray px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="seu@email.com" autoComplete="username" />
              <p className="mt-1.5 text-xs text-slate-500">
                Parceiros e equipe entram com o e-mail e a senha cadastrados pelo admin.
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <label htmlFor="cpfCnpj" className="mb-1.5 block text-sm font-medium text-primary-700">CPF</label>
              <input id="cpfCnpj" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} required
                className="w-full rounded-lg border border-abs-gray px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="000.000.000-00" />
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="senha" className="mb-1.5 block text-sm font-medium text-primary-700">Senha</label>
            <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
              className="w-full rounded-lg border border-abs-gray px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              autoComplete="current-password" />
          </div>

          <Button type="submit" variant="cta" disabled={loading} className="w-full py-3">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          {modo === 'cliente' && (
            <>
              <p className="mt-4 text-center text-sm">
                <Link to="/esqueci-senha" className="font-medium text-primary-600">Esqueci minha senha</Link>
              </p>
              <p className="mt-2 text-center text-sm text-slate-500">
                Não tem conta?{' '}
                <Link to={searchParams.get('next') ? `/cadastro?next=${encodeURIComponent(searchParams.get('next') || '')}` : '/cadastro'} className="font-semibold text-primary-600">Cadastre-se — obrigatório</Link>
              </p>
              <p className="mt-2 text-center text-xs text-emerald-700">
                Pagamento no PIX: 5% de desconto automático em todos os serviços.
              </p>
            </>
          )}
        </form>
        <div className="relative z-10 mt-4 rounded-xl bg-black/35 p-4 text-center backdrop-blur-md">
          <p className="text-sm font-semibold text-accent-400">Chamou. ConfioU. Resolveu.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/80">
            {modo === 'cliente'
              ? 'Primeira vez aqui? Cadastre-se e solicite o serviço pelo portal — sem fila e sem espera.'
              : 'Acesso interno da equipe e parceiros. Sem login? Peça liberação ao administrador.'}
          </p>
          {modo === 'cliente' && (
            <Link
              to={searchParams.get('next') ? `/cadastro?next=${encodeURIComponent(searchParams.get('next') || '')}` : '/cadastro'}
              className="mt-3 inline-block text-xs font-semibold text-accent-400 underline decoration-accent-400/40 underline-offset-2 hover:text-accent-300"
            >
              Criar minha conta
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
