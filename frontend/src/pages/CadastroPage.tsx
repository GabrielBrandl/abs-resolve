import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cpf } from 'cpf-cnpj-validator';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { Logo, Input, Button, Card } from '../components/ui';
import { isClienteRole } from '../utils/auth-routes';
import { normalizeUser } from '../utils/normalize-user';

function mensagemErro(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    if (!err.response || err.response.status === 502) {
      return 'Servidor offline. Abra um terminal, rode cd backend && npm run dev e tente novamente.';
    }
    if (err.response.status === 503) {
      const api = err.response.data as { error?: string };
      return api?.error ?? 'Banco de dados indisponível. Configure DATABASE_URL do Supabase em backend/.env.';
    }
    const api = err.response.data as { error?: string };
    if (api?.error) return api.error;
  }
  return err instanceof Error ? err.message : fallback;
}

export function CadastroPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '', cpf: '', email: '', telefone: '', senha: '', confirmar: '',
    rua: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
    consentimentoLgpd: false,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cpf.isValid(form.cpf.replace(/\D/g, ''))) {
      setError('CPF inválido');
      return;
    }
    if (form.senha !== form.confirmar) {
      setError('Senhas não conferem');
      return;
    }
    if (!form.consentimentoLgpd) {
      setError('Aceite os termos LGPD para continuar');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.registrar({
        tipo: 'PF',
        nome: form.nome,
        cpf: form.cpf,
        email: form.email,
        telefone: form.telefone,
        senha: form.senha,
        consentimentoLgpd: true,
        endereco: {
          rua: form.rua, numero: form.numero, bairro: form.bairro,
          cidade: form.cidade, uf: form.uf, cep: form.cep,
        },
      });
      const user = normalizeUser(result.user);
      if (!user || !isClienteRole(user.role)) {
        setError('Conta criada com perfil inválido. Contate o suporte.');
        return;
      }
      setAuth(user, result.accessToken);
      navigate('/cliente/agendar');
    } catch (err) {
      setError(mensagemErro(err, 'Erro ao cadastrar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen abs-gradient px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <Logo className="mx-auto h-20" />
          <p className="mt-3 text-sm italic text-white/90">Chamou. ConfioU. Resolveu.</p>
          <h1 className="mt-4 text-2xl font-bold text-white">Crie sua conta</h1>
          <p className="text-sm text-white/80">Cadastro obrigatório para solicitar serviços</p>
        </div>

        <Card>
          {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit}>
            <Input label="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            <Input label="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Telefone / WhatsApp" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
            <Input label="Senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
            <Input label="Confirmar senha" type="password" value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} required />

            <p className="mb-2 text-sm font-medium text-primary-700">Endereço de atendimento</p>
            <div className="grid grid-cols-2 gap-2">
              <Input label="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              <Input label="UF" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} />
            </div>
            <Input label="Rua" value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              <Input label="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            </div>
            <Input label="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />

            <label className="mb-4 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.consentimentoLgpd} onChange={(e) => setForm({ ...form, consentimentoLgpd: e.target.checked })} className="mt-1" />
              <span>Autorizo o tratamento dos meus dados conforme a LGPD e os termos da ABS Resolve.</span>
            </label>

            <Button type="submit" variant="cta" disabled={loading} className="w-full">
              {loading ? 'Cadastrando...' : 'Criar conta e solicitar serviço'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Já tem conta? <Link to="/login" className="font-medium text-primary-600">Entrar</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
