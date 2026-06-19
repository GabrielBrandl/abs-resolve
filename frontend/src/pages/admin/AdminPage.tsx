import { useEffect, useState } from 'react';
import { adminApi } from '../../services/modules.service';
import { PageHeader, Loading, Tabs, Card, Badge } from '../../components/ui';

export function AdminPage() {
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; email: string; role: string }>>([]);
  const [parceiros, setParceiros] = useState<Array<{ id: string; nome: string; categoria: string; email: string }>>([]);
  const [auditoria, setAuditoria] = useState<{ logs: Array<{ acao: string; recurso: string; createdAt: string; user?: { nome: string } }> }>({ logs: [] });
  const [notificacoes, setNotificacoes] = useState<Array<{ tipo: string; canal: string; destino: string; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      usuarios: async () => setUsuarios(await adminApi.usuarios() as typeof usuarios),
      parceiros: async () => setParceiros(await adminApi.parceiros() as typeof parceiros),
      auditoria: async () => setAuditoria(await adminApi.auditoria() as typeof auditoria),
      notificacoes: async () => setNotificacoes(await adminApi.notificacoes() as typeof notificacoes),
    };
    loaders[tab]?.().finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <PageHeader title="Administração" subtitle="Controle do sistema" />

      <Tabs
        tabs={[
          { key: 'usuarios', label: 'Usuários' },
          { key: 'parceiros', label: 'Parceiros' },
          { key: 'auditoria', label: 'Auditoria' },
          { key: 'notificacoes', label: 'Notificações' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? <Loading /> : (
        <>
          {tab === 'usuarios' && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th></tr></thead>
                <tbody>{usuarios.map((u) => (
                  <tr key={u.id} className="border-t"><td className="px-4 py-3">{u.nome}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3"><Badge>{u.role}</Badge></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab === 'parceiros' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {parceiros.map((p) => (
                <Card key={p.id}>
                  <h3 className="font-semibold">{p.nome}</h3>
                  <p className="text-sm text-slate-500">{p.categoria} · {p.email}</p>
                </Card>
              ))}
            </div>
          )}

          {tab === 'auditoria' && (
            <Card>
              {auditoria.logs?.map((l, i) => (
                <div key={i} className="border-b border-slate-100 py-2 text-sm last:border-0">
                  <span className="font-medium">{l.acao}</span> em <span className="text-primary-600">{l.recurso}</span>
                  {l.user && <span className="text-slate-400"> — {l.user.nome}</span>}
                  <span className="float-right text-xs text-slate-400">{new Date(l.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              )) || <p className="text-slate-400">Nenhum registro</p>}
            </Card>
          )}

          {tab === 'notificacoes' && (
            <Card>
              {notificacoes.map((n, i) => (
                <div key={i} className="border-b border-slate-100 py-2 text-sm last:border-0">
                  <Badge color={n.status === 'enviada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{n.status}</Badge>
                  <span className="ml-2">{n.canal} → {n.destino}</span>
                  <span className="float-right text-xs text-slate-400">{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
