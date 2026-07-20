import { useEffect, useState } from 'react';
import { parceirosApi } from '../../services/modules.service';
import type { ComissaoItem, ParceiroAdmin, ParceiroDetalhe } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Card, Button, Badge, Modal, Input, TableWrapper } from '../../components/ui';
import { useToast } from '../../components/Toast';

const formVazio = { nome: '', email: '', telefone: '', senha: '', comissaoPercent: '10', cnpj: '', categoria: 'vendas' };

const editFormVazio = {
  nome: '',
  email: '',
  telefone: '',
  cnpj: '',
  categoria: 'vendas',
  codigo: '',
  comissaoPercent: '10',
  senha: '',
  ativo: true,
  recalcularPendentes: false,
};

const comissaoFormVazio = {
  descricao: '',
  valorVenda: '',
  percentual: '',
  valorComissao: '',
  status: 'pendente',
};

export function ParceirosAdminPage() {
  const { toast } = useToast();
  const [parceiros, setParceiros] = useState<ParceiroAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [detalhe, setDetalhe] = useState<ParceiroDetalhe | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(editFormVazio);
  const [comissaoEditId, setComissaoEditId] = useState<string | null>(null);
  const [comissaoForm, setComissaoForm] = useState(comissaoFormVazio);

  const carregar = () => {
    setLoading(true);
    parceirosApi.listar().then(setParceiros).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    try {
      await parceirosApi.criar({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        senha: form.senha,
        comissaoPercent: Number(form.comissaoPercent) || 0,
        cnpj: form.cnpj || undefined,
        categoria: form.categoria || undefined,
      });
      setModalNovo(false);
      setForm(formVazio);
      toast('Parceiro criado!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const abrirEditar = (p: Pick<ParceiroAdmin, 'id' | 'nome' | 'email' | 'telefone' | 'cnpj' | 'categoria' | 'codigo' | 'comissaoPercent' | 'ativo'>) => {
    setEditId(p.id);
    setEditForm({
      nome: p.nome,
      email: p.email,
      telefone: p.telefone,
      cnpj: p.cnpj || '',
      categoria: p.categoria || 'vendas',
      codigo: p.codigo || '',
      comissaoPercent: String(p.comissaoPercent),
      senha: '',
      ativo: p.ativo,
      recalcularPendentes: false,
    });
  };

  const salvarEdicao = async () => {
    if (!editId) return;
    try {
      await parceirosApi.atualizar(editId, {
        nome: editForm.nome,
        email: editForm.email,
        telefone: editForm.telefone,
        cnpj: editForm.cnpj,
        categoria: editForm.categoria,
        codigo: editForm.codigo,
        comissaoPercent: Number(editForm.comissaoPercent) || 0,
        ativo: editForm.ativo,
        recalcularPendentes: editForm.recalcularPendentes,
        ...(editForm.senha ? { senha: editForm.senha } : {}),
      });
      setEditId(null);
      toast('Parceiro atualizado!', 'success');
      carregar();
      if (detalhe?.id === editId) await verDetalhe(editId);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const remover = async (p: ParceiroAdmin) => {
    if (!confirm(`Remover o parceiro ${p.nome}? Os clientes indicados continuam ativos, mas deixam de gerar comissão.`)) return;
    try {
      await parceirosApi.remover(p.id);
      toast('Parceiro removido', 'success');
      if (detalhe?.id === p.id) setDetalhe(null);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const verDetalhe = async (id: string) => {
    try {
      setDetalhe(await parceirosApi.detalhe(id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const recalcularPendentes = async () => {
    if (!detalhe) return;
    if (!confirm(`Recalcular todas as comissões pendentes de ${detalhe.nome} com ${detalhe.comissaoPercent}%?`)) return;
    try {
      const { recalculadas, detalhe: atualizado } = await parceirosApi.recalcularComissoes(detalhe.id);
      setDetalhe(atualizado);
      toast(`${recalculadas} comissão(ões) recalculada(s)`, 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const marcarComissao = async (comissaoId: string, paga: boolean) => {
    try {
      await parceirosApi.marcarComissao(comissaoId, paga);
      if (detalhe) await verDetalhe(detalhe.id);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const abrirEditarComissao = (c: ComissaoItem) => {
    setComissaoEditId(c.id);
    setComissaoForm({
      descricao: c.descricao || '',
      valorVenda: String(c.valorVenda),
      percentual: String(c.percentual),
      valorComissao: String(c.valorComissao),
      status: c.status,
    });
  };

  const salvarComissao = async () => {
    if (!comissaoEditId) return;
    try {
      await parceirosApi.atualizarComissao(comissaoEditId, {
        descricao: comissaoForm.descricao,
        valorVenda: Number(comissaoForm.valorVenda),
        percentual: Number(comissaoForm.percentual),
        valorComissao: Number(comissaoForm.valorComissao),
        status: comissaoForm.status,
      });
      setComissaoEditId(null);
      toast('Comissão atualizada!', 'success');
      if (detalhe) await verDetalhe(detalhe.id);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const excluirComissao = async (c: ComissaoItem) => {
    if (!confirm(`Excluir comissão de ${formatCurrency(c.valorComissao)}?`)) return;
    try {
      await parceirosApi.excluirComissao(c.id);
      toast('Comissão excluída', 'success');
      if (detalhe) await verDetalhe(detalhe.id);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const copiarLink = (link: string | null) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast('Link de indicação copiado!', 'success');
  };

  const statusComissaoBadge = (status: string) => {
    if (status === 'paga') return 'bg-green-100 text-green-700';
    if (status === 'cancelada') return 'bg-slate-100 text-slate-500';
    return 'bg-amber-100 text-amber-700';
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Parceiros de Vendas"
        subtitle="Controle de indicações, vendas e comissões"
        action={<Button onClick={() => setModalNovo(true)}>Novo Parceiro</Button>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Parceiros ativos</p>
          <p className="text-2xl font-bold text-primary-800">{parceiros.filter((p) => p.ativo).length}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Total vendido</p>
          <p className="text-2xl font-bold text-primary-800">{formatCurrency(parceiros.reduce((a, p) => a + p.valorVendido, 0))}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Comissão a pagar</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(parceiros.reduce((a, p) => a + p.comissaoPendente, 0))}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Comissão paga</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(parceiros.reduce((a, p) => a + p.comissaoPaga, 0))}</p>
        </Card>
      </div>

      <TableWrapper>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Parceiro</th>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Comissão</th>
              <th className="px-4 py-3 text-left">Clientes</th>
              <th className="px-4 py-3 text-left">Vendas</th>
              <th className="px-4 py-3 text-left">A pagar</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {parceiros.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Nenhum parceiro cadastrado</td></tr>
            ) : parceiros.map((p) => (
              <tr key={p.id} className={`border-t ${!p.ativo ? 'bg-slate-50 opacity-70' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-slate-400">{p.email}</p>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => copiarLink(p.link)} className="rounded bg-slate-100 px-2 py-1 font-mono text-xs hover:bg-slate-200" title="Copiar link de indicação">
                    {p.codigo || '—'}
                  </button>
                </td>
                <td className="px-4 py-3">{p.comissaoPercent}%</td>
                <td className="px-4 py-3">{p.clientes}</td>
                <td className="px-4 py-3">
                  {p.vendas} · {formatCurrency(p.valorVendido)}
                </td>
                <td className="px-4 py-3 font-medium text-amber-600">{formatCurrency(p.comissaoPendente)}</td>
                <td className="px-4 py-3">
                  <Badge color={p.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button variant="secondary" className="text-xs" onClick={() => verDetalhe(p.id)}>Detalhes</Button>
                    <Button variant="secondary" className="text-xs" onClick={() => abrirEditar(p)}>Editar</Button>
                    <Button variant="danger" className="text-xs" onClick={() => remover(p)}>Remover</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo Parceiro">
        <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <Input label="Email (login do parceiro)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Telefone / WhatsApp" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <Input label="CNPJ (opcional)" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
        <Input label="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
        <Input label="Comissão (%)" type="number" min={0} max={100} value={form.comissaoPercent} onChange={(e) => setForm({ ...form, comissaoPercent: e.target.value })} />
        <Input label="Senha de acesso" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
        <Button onClick={criar} className="mt-2">Criar parceiro</Button>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar parceiro" zIndex={detalhe ? 60 : 50}>
        <Input label="Nome" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
        <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
        <Input label="Telefone" value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
        <Input label="CNPJ" value={editForm.cnpj} onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })} />
        <Input label="Categoria" value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })} />
        <Input label="Código de indicação" value={editForm.codigo} onChange={(e) => setEditForm({ ...editForm, codigo: e.target.value.toUpperCase() })} />
        <Input label="Comissão (%)" type="number" min={0} max={100} value={editForm.comissaoPercent} onChange={(e) => setEditForm({ ...editForm, comissaoPercent: e.target.value })} />
        <Input label="Nova senha (obrigatória se ainda não tem acesso)" type="password" value={editForm.senha} onChange={(e) => setEditForm({ ...editForm, senha: e.target.value })} />
        <p className="mb-2 text-xs text-slate-500">
          Se o parceiro não consegue entrar, defina uma nova senha aqui e peça para usar a aba <strong>Equipe / Parceiro</strong> no login.
        </p>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editForm.ativo} onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })} />
          Parceiro ativo
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editForm.recalcularPendentes}
            onChange={(e) => setEditForm({ ...editForm, recalcularPendentes: e.target.checked })}
          />
          Recalcular comissões pendentes com a nova %
        </label>
        <Button onClick={salvarEdicao} className="mt-2">Salvar alterações</Button>
      </Modal>

      <Modal open={!!comissaoEditId} onClose={() => setComissaoEditId(null)} title="Editar comissão" zIndex={detalhe ? 60 : 50}>
        <Input label="Descrição" value={comissaoForm.descricao} onChange={(e) => setComissaoForm({ ...comissaoForm, descricao: e.target.value })} />
        <Input label="Valor da venda (R$)" type="number" min={0} step="0.01" value={comissaoForm.valorVenda} onChange={(e) => setComissaoForm({ ...comissaoForm, valorVenda: e.target.value })} />
        <Input label="Percentual (%)" type="number" min={0} max={100} step="0.01" value={comissaoForm.percentual} onChange={(e) => setComissaoForm({ ...comissaoForm, percentual: e.target.value })} />
        <Input label="Valor da comissão (R$)" type="number" min={0} step="0.01" value={comissaoForm.valorComissao} onChange={(e) => setComissaoForm({ ...comissaoForm, valorComissao: e.target.value })} />
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={comissaoForm.status}
            onChange={(e) => setComissaoForm({ ...comissaoForm, status: e.target.value })}
          >
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Ao alterar o percentual, o valor da comissão será recalculado automaticamente ao salvar (a menos que você edite o valor manualmente).
        </p>
        <Button onClick={salvarComissao}>Salvar comissão</Button>
      </Modal>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title={detalhe ? `Parceiro — ${detalhe.nome}` : ''}>
        {detalhe && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="mb-1"><span className="text-slate-500">Código:</span> <span className="font-mono font-semibold">{detalhe.codigo}</span></p>
              <p className="mb-1"><span className="text-slate-500">Comissão padrão:</span> <span className="font-semibold">{detalhe.comissaoPercent}%</span></p>
              {detalhe.cnpj && <p className="mb-1"><span className="text-slate-500">CNPJ:</span> {detalhe.cnpj}</p>}
              {detalhe.link && (
                <div className="mt-2 flex items-center gap-2">
                  <input readOnly value={detalhe.link} className="flex-1 rounded border bg-white px-2 py-1 text-xs" />
                  <Button variant="secondary" className="text-xs" onClick={() => copiarLink(detalhe.link)}>Copiar</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-lg border p-2">
                <p className="text-xs text-slate-500">Vendas</p>
                <p className="font-bold">{detalhe.vendas}</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-slate-500">A pagar</p>
                <p className="font-bold text-amber-600">{formatCurrency(detalhe.comissaoPendente)}</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-slate-500">Pago</p>
                <p className="font-bold text-green-600">{formatCurrency(detalhe.comissaoPaga)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="text-xs" onClick={() => abrirEditar(detalhe)}>Editar parceiro</Button>
              <Button variant="secondary" className="text-xs" onClick={() => void recalcularPendentes()}>Recalcular pendentes</Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Comissões</p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {detalhe.comissoes.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma comissão gerada ainda.</p>
                ) : detalhe.comissoes.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{formatCurrency(c.valorComissao)}</p>
                        <Badge color={statusComissaoBadge(c.status)}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {c.percentual}% de {formatCurrency(c.valorVenda)} · {c.descricao || '—'} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button variant="secondary" className="text-xs" onClick={() => abrirEditarComissao(c)}>Editar</Button>
                      {c.status !== 'paga' && (
                        <Button variant="cta" className="text-xs" onClick={() => marcarComissao(c.id, true)}>Pagar</Button>
                      )}
                      {c.status === 'paga' && (
                        <Button variant="secondary" className="text-xs" onClick={() => marcarComissao(c.id, false)}>Desfazer</Button>
                      )}
                      <Button variant="danger" className="text-xs" onClick={() => void excluirComissao(c)}>Excluir</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Clientes indicados ({detalhe.clientes.length})</p>
              <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {detalhe.clientes.map((c) => (
                  <div key={c.id} className="flex justify-between border-b py-1 last:border-0">
                    <span>{c.nome}</span>
                    <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
