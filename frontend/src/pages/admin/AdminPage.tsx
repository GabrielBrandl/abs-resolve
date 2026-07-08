import { useEffect, useState } from 'react';
import { adminApi, adminApiExtra } from '../../services/modules.service';
import { formatDate } from '../../types';
import { PageHeader, Loading, Tabs, Card, Badge, Button, Modal, Input, Select } from '../../components/ui';
import { BotaoVerFotos } from '../../components/GaleriaFotos';
import { fotosDaSolicitacao, fotosDoChecklist } from '../../utils/fotos';
import { useToast } from '../../components/Toast';

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  tecnico?: { id: string; nome: string; capacidadeDiaria: number };
};

type Atribuicao = Awaited<ReturnType<typeof adminApi.atribuicoes>>[number];

type TecnicoCarga = Awaited<ReturnType<typeof adminApi.tecnicosCarga>>[number];

export function AdminPage() {
  const [tab, setTab] = useState('equipe');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [tecnicosCarga, setTecnicosCarga] = useState<TecnicoCarga[]>([]);
  const [auditoria, setAuditoria] = useState<{ logs: Array<{ acao: string; recurso: string; createdAt: string; user?: { nome: string } }> }>({ logs: [] });
  const [campanhas, setCampanhas] = useState<Array<{ id: string; titulo: string; status: string; agendadaPara: string; cliente: { nome: string } }>>([]);
  const [notificacoes, setNotificacoes] = useState<Array<{ tipo: string; canal: string; destino: string; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(false);
  const [modalEditUser, setModalEditUser] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [modalCliente, setModalCliente] = useState(false);
  const { toast } = useToast();
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', role: 'comercial', capacidadeDiaria: '6' });
  const [editUserForm, setEditUserForm] = useState({ nome: '', email: '', senha: '', role: 'comercial', capacidadeDiaria: '6' });
  const [clienteForm, setClienteForm] = useState({
    nome: '', email: '', senha: '', cpf: '', telefone: '',
    rua: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
  });

  const carregar = () => {
    setLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      equipe: async () => setUsuarios(await adminApi.usuarios()),
      atribuicoes: async () => {
        const [atrib, carga] = await Promise.all([adminApi.atribuicoes(), adminApi.tecnicosCarga()]);
        setAtribuicoes(atrib);
        setTecnicosCarga(carga);
      },
      auditoria: async () => setAuditoria(await adminApi.auditoria() as typeof auditoria),
      notificacoes: async () => setNotificacoes(await adminApi.notificacoes() as typeof notificacoes),
      campanhas: async () => setCampanhas(await adminApiExtra.campanhas()),
    };
    loaders[tab]?.().finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [tab]);

  const criarUsuario = async () => {
    await adminApi.criarUsuario({
      ...userForm,
      capacidadeDiaria: userForm.role === 'operacional' ? Number(userForm.capacidadeDiaria) : undefined,
    });
    setModalUser(false);
    setUserForm({ nome: '', email: '', senha: '', role: 'comercial', capacidadeDiaria: '6' });
    toast('Usuário criado!', 'success');
    carregar();
  };

  const criarCliente = async () => {
    await adminApi.criarCliente({
      nome: clienteForm.nome,
      email: clienteForm.email,
      senha: clienteForm.senha,
      cpf: clienteForm.cpf,
      telefone: clienteForm.telefone,
      endereco: {
        rua: clienteForm.rua,
        numero: clienteForm.numero,
        bairro: clienteForm.bairro,
        cidade: clienteForm.cidade,
        uf: clienteForm.uf,
        cep: clienteForm.cep,
      },
    });
    setModalCliente(false);
    toast('Cliente cadastrado!', 'success');
    carregar();
  };

  const toggleStatus = async (u: Usuario) => {
    try {
      await adminApi.alterarStatus(u.id, !u.ativo);
      toast(u.ativo ? 'Usuário desativado' : 'Usuário reativado', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const abrirEditar = (u: Usuario) => {
    setEditUserId(u.id);
    setEditUserForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      role: u.role,
      capacidadeDiaria: String(u.tecnico?.capacidadeDiaria ?? 6),
    });
    setModalEditUser(true);
  };

  const salvarEdicao = async () => {
    if (!editUserId) return;
    try {
      await adminApi.atualizarUsuario(editUserId, {
        nome: editUserForm.nome,
        email: editUserForm.email,
        role: editUserForm.role,
        ...(editUserForm.senha ? { senha: editUserForm.senha } : {}),
        ...(editUserForm.role === 'operacional' ? { capacidadeDiaria: Number(editUserForm.capacidadeDiaria) } : {}),
      });
      setModalEditUser(false);
      toast('Usuário atualizado!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const excluirUsuario = async (u: Usuario) => {
    const aviso =
      u.role === 'cliente'
        ? `Apagar o cliente ${u.nome}?\n\nIsso remove o cadastro, pedidos, pagamentos, NFS-e e o acesso ao portal. O CPF/CNPJ fica liberado para um novo cadastro. Esta ação não pode ser desfeita.`
        : `Apagar permanentemente o usuário ${u.nome}?`;
    if (!confirm(aviso)) return;
    try {
      await adminApi.excluirUsuario(u.id);
      toast('Usuário excluído', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const atribuirTecnico = async (agendamentoId: string, tecnicoId: string) => {
    try {
      await adminApi.atribuirTecnico(agendamentoId, tecnicoId || null);
      toast('Técnico atribuído!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    comercial: 'Comercial',
    operacional: 'Técnico',
    cliente: 'Cliente',
    parceiro: 'Parceiro',
  };

  return (
    <div>
      <PageHeader
        title="Administração"
        subtitle="Equipe, atribuições e controle do sistema"
        action={
          tab === 'equipe' ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalCliente(true)}>Novo Cliente</Button>
              <Button onClick={() => setModalUser(true)}>Novo Usuário</Button>
            </div>
          ) : tab === 'campanhas' ? (
            <Button variant="cta" onClick={async () => {
              const r = await adminApiExtra.processarCampanhas();
              toast(`${r.processadas} campanha(s) processada(s)!`, 'success');
              carregar();
            }}>Processar Campanhas</Button>
          ) : undefined
        }
      />

      <Tabs tabs={[
        { key: 'equipe', label: 'Equipe' },
        { key: 'atribuicoes', label: 'Serviços / Técnicos' },
        { key: 'auditoria', label: 'Auditoria' },
        { key: 'notificacoes', label: 'Notificações' },
        { key: 'campanhas', label: 'Campanhas CRM' },
      ]} active={tab} onChange={setTab} />

      {loading ? <Loading /> : (
        <>
          {tab === 'equipe' && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Perfil</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className={`border-t ${!u.ativo ? 'bg-slate-50 opacity-70' : ''}`}>
                      <td className="px-4 py-3 font-medium">{u.nome}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge>{roleLabel[u.role] || u.role}</Badge>
                        {u.tecnico && (
                          <span className="ml-2 text-xs text-slate-400">
                            cap. {u.tecnico.capacidadeDiaria}/dia
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {u.ativo ? 'Ativo' : 'Desligado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {u.role !== 'cliente' && (
                            <Button variant="secondary" className="text-xs" onClick={() => abrirEditar(u)}>Editar</Button>
                          )}
                          <Button variant="secondary" className="text-xs" onClick={() => toggleStatus(u)}>
                            {u.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button variant="danger" className="text-xs" onClick={() => excluirUsuario(u)}>Apagar</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'atribuicoes' && (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tecnicosCarga.map((t) => (
                  <Card key={t.id}>
                    <p className="font-semibold text-primary-800">{t.nome}</p>
                    <p className="text-xs text-slate-500">{t.email}</p>
                    <div className="mt-2 flex gap-3 text-sm">
                      <span>{t.agendamentosAtivos} agend.</span>
                      <span>{t.osEmAndamento} OS ativas</span>
                      <span className="text-slate-400">cap. {t.capacidadeDiaria}/dia</span>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Serviço / Pedido</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Técnico</th>
                      <th className="px-4 py-3 text-left">OS / Fotos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atribuicoes.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhum serviço agendado</td></tr>
                    ) : atribuicoes.map((a) => {
                      const servico = a.solicitacao?.servico?.nome || a.pedido?.descricao || '—';
                      const os = a.pedido?.ordemServico;
                      const checklist = os?.checklist as Record<string, string> | undefined;
                      const fotosCliente = a.solicitacao ? fotosDaSolicitacao(a.solicitacao) : [];
                      const fotosTecnico = fotosDoChecklist(checklist);
                      return (
                        <tr key={a.id} className="border-t">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatDate(a.data)}<br />
                            <span className="text-xs text-slate-400">{a.horarioInicio}–{a.horarioFim}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{servico}</p>
                            <p className="text-xs text-slate-400">{a.pedido?.numero}</p>
                          </td>
                          <td className="px-4 py-3">{a.cliente.nome}</td>
                          <td className="px-4 py-3">
                            <select
                              value={a.tecnico?.id || ''}
                              onChange={(e) => atribuirTecnico(a.id, e.target.value)}
                              className="min-w-[140px] rounded-lg border px-2 py-1 text-xs"
                            >
                              <option value="">— Sem técnico —</option>
                              {tecnicosCarga.map((t) => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {os ? (
                              <div className="space-y-1">
                                <Badge color="bg-indigo-100 text-indigo-700">{os.etapa}</Badge>
                                <div className="flex flex-col gap-0.5">
                                  <BotaoVerFotos fotos={fotosCliente} label="Cliente" titulo={`Fotos do cliente — ${a.cliente.nome}`} />
                                  <BotaoVerFotos fotos={fotosTecnico} label="Técnico" titulo={`Fotos do técnico — ${a.pedido?.numero}`} />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-slate-400">—</span>
                                <BotaoVerFotos fotos={fotosCliente} label="Cliente" titulo={`Fotos do cliente — ${a.cliente.nome}`} />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
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
        <Select label="Perfil" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
          <option value="comercial">Comercial</option>
          <option value="operacional">Técnico (campo)</option>
          <option value="admin">Admin</option>
        </Select>
        {userForm.role === 'operacional' && (
          <Input
            label="Capacidade diária (serviços/dia)"
            type="number"
            min={1}
            max={20}
            value={userForm.capacidadeDiaria}
            onChange={(e) => setUserForm({ ...userForm, capacidadeDiaria: e.target.value })}
          />
        )}
        <Button onClick={criarUsuario} className="mt-2">Criar</Button>
      </Modal>

      <Modal open={modalCliente} onClose={() => setModalCliente(false)} title="Novo Cliente">
        <Input label="Nome" value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} />
        <Input label="CPF" value={clienteForm.cpf} onChange={(e) => setClienteForm({ ...clienteForm, cpf: e.target.value })} placeholder="000.000.000-00" />
        <Input label="Email" value={clienteForm.email} onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })} />
        <Input label="Telefone" value={clienteForm.telefone} onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })} />
        <Input label="Senha portal" type="password" value={clienteForm.senha} onChange={(e) => setClienteForm({ ...clienteForm, senha: e.target.value })} />
        <p className="mb-2 text-xs font-medium text-slate-500">Endereço (opcional)</p>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Rua" value={clienteForm.rua} onChange={(e) => setClienteForm({ ...clienteForm, rua: e.target.value })} />
          <Input label="Nº" value={clienteForm.numero} onChange={(e) => setClienteForm({ ...clienteForm, numero: e.target.value })} />
          <Input label="Bairro" value={clienteForm.bairro} onChange={(e) => setClienteForm({ ...clienteForm, bairro: e.target.value })} />
          <Input label="Cidade" value={clienteForm.cidade} onChange={(e) => setClienteForm({ ...clienteForm, cidade: e.target.value })} />
          <Input label="UF" value={clienteForm.uf} onChange={(e) => setClienteForm({ ...clienteForm, uf: e.target.value })} />
          <Input label="CEP" value={clienteForm.cep} onChange={(e) => setClienteForm({ ...clienteForm, cep: e.target.value })} />
        </div>
        <Button onClick={criarCliente} className="mt-2">Cadastrar cliente</Button>
      </Modal>

      <Modal open={modalEditUser} onClose={() => setModalEditUser(false)} title="Editar usuário">
        <Input label="Nome" value={editUserForm.nome} onChange={(e) => setEditUserForm({ ...editUserForm, nome: e.target.value })} />
        <Input label="Email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} />
        <Input label="Nova senha (opcional)" type="password" value={editUserForm.senha} onChange={(e) => setEditUserForm({ ...editUserForm, senha: e.target.value })} />
        <Select label="Perfil" value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}>
          <option value="comercial">Comercial</option>
          <option value="operacional">Técnico (campo)</option>
          <option value="admin">Admin</option>
        </Select>
        {editUserForm.role === 'operacional' && (
          <Input
            label="Capacidade diária"
            type="number"
            min={1}
            max={20}
            value={editUserForm.capacidadeDiaria}
            onChange={(e) => setEditUserForm({ ...editUserForm, capacidadeDiaria: e.target.value })}
          />
        )}
        <Button onClick={salvarEdicao} className="mt-2">Salvar alterações</Button>
      </Modal>
    </div>
  );
}
