import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parceirosApi } from '../../services/modules.service';
import type { ParceiroDetalhe } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { Loading, Card, Button, Badge, Logo } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';

export function ParceiroDashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<ParceiroDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    parceirosApi
      .meuResumo()
      .then(setData)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const copiar = (texto: string | null) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    toast('Copiado!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <Logo variant="sidebar" className="h-9" />
          <span className="text-sm text-accent-400">Portal do Parceiro</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm sm:inline">{user?.nome}</span>
          <button onClick={handleLogout} className="rounded-lg bg-primary-700 px-3 py-1.5 text-sm hover:bg-primary-600">Sair</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 md:p-8">
        {loading ? (
          <Loading />
        ) : erro ? (
          <Card><p className="text-red-600">{erro}</p></Card>
        ) : data ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-primary-800">Olá, {data.nome}!</h1>
              <p className="text-sm text-slate-500">Acompanhe suas indicações e comissões.</p>
            </div>

            <Card>
              <p className="mb-1 text-sm font-medium text-primary-700">Seu link de indicação</p>
              <p className="mb-3 text-xs text-slate-500">Compartilhe este link. Todo cliente que se cadastrar por ele fica vinculado a você e gera comissão.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input readOnly value={data.link || ''} className="flex-1 rounded-lg border bg-slate-50 px-3 py-2 text-sm" />
                <Button variant="cta" onClick={() => copiar(data.link)}>Copiar link</Button>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Código: <span className="font-mono font-semibold text-primary-700">{data.codigo}</span>
                <button onClick={() => copiar(data.codigo)} className="ml-2 text-xs text-primary-600 underline">copiar código</button>
                <span className="ml-3">Sua comissão: <span className="font-semibold">{data.comissaoPercent}%</span></span>
              </p>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <p className="text-xs text-slate-500">Clientes indicados</p>
                <p className="text-2xl font-bold text-primary-800">{data.clientes.length}</p>
              </Card>
              <Card>
                <p className="text-xs text-slate-500">Vendas</p>
                <p className="text-2xl font-bold text-primary-800">{data.vendas}</p>
              </Card>
              <Card>
                <p className="text-xs text-slate-500">Comissão a receber</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.comissaoPendente)}</p>
              </Card>
              <Card>
                <p className="text-xs text-slate-500">Comissão recebida</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.comissaoPaga)}</p>
              </Card>
            </div>

            <Card>
              <h2 className="mb-3 font-semibold">Minhas comissões</h2>
              {data.comissoes.length === 0 ? (
                <p className="text-sm text-slate-400">Ainda não há comissões. Compartilhe seu link para começar!</p>
              ) : (
                <div className="space-y-2">
                  {data.comissoes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                      <div>
                        <p className="font-medium">{formatCurrency(c.valorComissao)}</p>
                        <p className="text-xs text-slate-400">{c.descricao || '—'} · {formatDate(c.createdAt)}</p>
                      </div>
                      <Badge color={c.status === 'paga' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {c.status === 'paga' ? 'Paga' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Clientes indicados</h2>
              {data.clientes.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum cliente indicado ainda.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {data.clientes.map((c) => (
                    <div key={c.id} className="flex justify-between border-b py-1.5 last:border-0">
                      <span>{c.nome}</span>
                      <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
