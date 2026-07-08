import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { authApi } from '../services/modules.service';
import { Button } from '../components/ui';

function mensagemErro(err: unknown) {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Servidor offline. Tente novamente em instantes.';
    const api = err.response.data as { error?: string };
    if (api?.error) return api.error;
  }
  return err instanceof Error ? err.message : 'Erro ao solicitar redefinição';
}

export function EsqueciSenhaPage() {
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await authApi.esqueciSenha(cpfCnpj);
      setMensagem(r.message);
      setEnviado(true);
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
          <h1 className="mb-1 text-xl font-bold text-primary-800">Esqueci minha senha</h1>
          <p className="mb-5 text-sm text-slate-500">
            Informe seu CPF/CNPJ. Enviaremos um link de redefinição para o e-mail e WhatsApp cadastrados.
          </p>

          {enviado ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{mensagem}</div>
              <Link to="/login" className="block text-center text-sm font-medium text-primary-600">Voltar para o login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
              <div className="mb-5">
                <label htmlFor="cpfCnpj" className="mb-1.5 block text-sm font-medium text-primary-700">CPF / CNPJ</label>
                <input
                  id="cpfCnpj"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  required
                  placeholder="000.000.000-00"
                  className="w-full rounded-lg border border-abs-gray px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <Button type="submit" variant="cta" disabled={loading} className="w-full py-3">
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
              <p className="mt-4 text-center text-sm text-slate-500">
                <Link to="/login" className="font-medium text-primary-600">Voltar para o login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
