import { useEffect, useState } from 'react';
import { adminApi, adminApiExtra } from '../../services/modules.service';
import { PageHeader, Loading, Tabs, Card, Badge, Button, Modal, Input, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function AdminPage() {
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; email: string; role: string }>>([]);
  const [parceiros, setParceiros] = useState<Array<{ id: string; nome: string; categoria: string; email: string }>>([]);
  const [auditoria, setAuditoria] = useState<{ logs: Array<{ acao: string; recurso: string; createdAt: string; user?: { nome: string } }> }>({ logs: [] });
  const [campanhas, setCampanhas] = useState<Array<{ id: string; titulo: string; status: string; agendadaPara: string; cliente: { nome: string } }>>([]);
  const [notificacoes, setNotificacoes] = useState<Array<{ tipo: string; canal: string; destino: string; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(false);
  const [modalParceiro, setModalParceiro] = useState(false);
  const { toast } = useToast();
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', role: 'comercial' });
  const [parceiroForm, setParceiroForm] = useState({ nome: '', email: '', telefone: '', categoria: 'limpeza' });

  const carregar = () => {
    setLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      usuarios: async () => setUsuarios(await adminApi.usuarios() as typeof usuarios),
      parceiros: async () => setParceiros(await adminApi.parceiros() as typeof parceiros),
      auditoria: async () => setAuditoria(await adminApi.auditoria() as typeof auditoria),
      notificacoes: async () => setNotificacoes(await adminApi.notificacoes() as typeof notificacoes),
      campanhas: async () => setCampanhas(await adminApiExtra.campanhas()),
    };
    loaders[tab]?.().finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [tab]);

  const criarUsuario = async () => {
    await adminApi.criarUsuario(userForm);
    setModalUser(false);
    toast('Usuário criado!', 'success');
    carregar();
  };

  const criarParceiro = async () => {
    await adminApi.criarParceiro(parceiroForm);
    setModalParceiro(false);
    toast('Parceiro criado!', 'success');
    carregar();
  };

  return (
    <div>
      <PageHeader title="Administração" subtitle="Controle do sistema"
        action={
          tab === 'usuarios' ? <Button onClick={() => setModalUser(true)}>Novo Usuário</Button>
          : tab === 'parceiros' ? <Button onClick={() => setModalParceiro(true)}>Novo Parceiro</Button>
          : tab === 'campanhas' ? <Button variant="cta" onClick={async () => {
              const r = await adminApiExtra.processarCampanhas();
              toast(`${r.processadas} campanha(s) processada(s)!`, 'success');
              carregar();
            }}>Processar Campanhas</Button>
          : undefined
        } />

      <Tabs tabs={[
        { key: 'usuarios', label: 'Usuários' },
        { key: 'parceiros', label: 'Parceiros' },
        { key: 'auditoria', label: 'Auditoria' },
        { key: 'notificacoes', label: 'Notificações' },
        { key: 'campanhas', label: 'Campanhas CRM' },
      ]} active={tab} onChange={setTab} />

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
                <Card key={p.id}><h3 className="font-semibold">{p.nome}</h3><p className="text-sm text-slate-500">{p.categoria} · {p.email}</p></Card>
              ))}
            </div>
          )}
          {tab === 'auditoria' && (
            <Card>
              {auditoria.logs?.map((l, i) => (
                <div key={i} className="border-b py-2 text-sm last:border-0">
                  <span className="font-medium">{l.acao}</span> em <span className="text-primary-600">{l.recurso}</span>
                  {l.user && <span className="text-slate-400"> — {l.user.nome}</span>}
                </div>
              )) || <p className="text-slate-400">Nenhum registro</p>}
            </Card>
          )}
          {tab === 'notificacoes' && (
            <Card>
              {notificacoes.map((n, i) => (
                <div key={i} className="border-b py-2 text-sm last:border-0">
                  <Badge>{n.status}</Badge>
                  <span className="ml-2">{n.canal} → {n.destino}</span>
                </div>
              ))}
            </Card>
          )}
          {tab === 'campanhas' && (
            <Card>
              {campanhas.map((c) => (
                <div key={c.id} className="border-b border-abs-gray py-3 text-sm last:border-0">
                  <Badge color={c.status === 'pendente' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>{c.status}</Badge>
                  <span className="ml-2 font-medium">{c.titulo}</span>
                  <span className="ml-2 text-slate-500">→ {c.cliente.nome}</span>
                  <span className="float-right text-xs text-slate-400">{new Date(c.agendadaPara).toLocaleDateString('pt-BR')}</span>
                </div>
              )) || <p className="text-slate-400">Nenhuma campanha</p>}
            </Card>
          )}
        </>
      )}

      <Modal open={modalUser} onClose={() => setModalUser(false)} title="Novo Usuário">
        <Input label="Nome" value={userForm.nome} onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })} />
        <Input label="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
        <Input label="Senha" type="password" value={userForm.senha} onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })} />
        <Select label="Role" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
          <option value="admin">Admin</option>
          <option value="comercial">Comercial</option>
          <option value="operacional">Operacional</option>
          <option value="parceiro">Parceiro</option>
        </Select>
        <Button onClick={criarUsuario} className="mt-2">Criar</Button>
      </Modal>

      <Modal open={modalParceiro} onClose={() => setModalParceiro(false)} title="Novo Parceiro">
        <Input label="Nome" value={parceiroForm.nome} onChange={(e) => setParceiroForm({ ...parceiroForm, nome: e.target.value })} />
        <Input label="Email" value={parceiroForm.email} onChange={(e) => setParceiroForm({ ...parceiroForm, email: e.target.value })} />
        <Input label="Telefone" value={parceiroForm.telefone} onChange={(e) => setParceiroForm({ ...parceiroForm, telefone: e.target.value })} />
        <Select label="Categoria" value={parceiroForm.categoria} onChange={(e) => setParceiroForm({ ...parceiroForm, categoria: e.target.value })}>
          <option value="limpeza">Limpeza</option>
          <option value="pintura">Pintura</option>
          <option value="eletrica">Elétrica</option>
        </Select>
        <Button onClick={criarParceiro} className="mt-2">Criar</Button>
      </Modal>
    </div>
  );
}
