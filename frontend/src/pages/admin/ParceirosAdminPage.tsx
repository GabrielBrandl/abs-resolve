import { useEffect, useState } from 'react';
import { parceirosApi } from '../../services/modules.service';
import type { ParceiroAdmin, ParceiroDetalhe } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Card, Button, Badge, Modal, Input } from '../../components/ui';
import { useToast } from '../../components/Toast';

const formVazio = { nome: '', email: '', telefone: '', senha: '', comissaoPercent: '10', cnpj: '' };

export function ParceirosAdminPage() {
  const { toast } = useToast();
  const [parceiros, setParceiros] = useState<ParceiroAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [detalhe, setDetalhe] = useState<ParceiroDetalhe | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', telefone: '', comissaoPercent: '10', senha: '', ativo: true });

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
      });
      setModalNovo(false);
      setForm(formVazio);
      toast('Parceiro criado!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const abrirEditar = (p: ParceiroAdmin) => {
    setEditId(p.id);
    setEditForm({
      nome: p.nome,
      email: p.email,
      telefone: p.telefone,
      comissaoPercent: String(p.comissaoPercent),
      senha: '',
      ativo: p.ativo,
    });
  };

  const salvarEdicao = async () => {
    if (!editId) return;
    try {
      await parceirosApi.atualizar(editId, {
        nome: editForm.nome,
        email: editForm.email,
        telefone: editForm.telefone,
        comissaoPercent: Number(editForm.comissaoPercent) || 0,
        ativo: editForm.ativo,
        ...(editForm.senha ? { senha: editForm.senha } : {}),
      });
      setEditId(null);
      toast('Parceiro atualizado!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const remover = async (p: ParceiroAdmin) => {
    if (!confirm(`Remover o parceiro ${p.nome}? Os clientes indicados continuam ativos, mas deixam de gerar comissão.`)) return;
    try {
      await parceirosApi.remover(p.id);
      toast('Parceiro removido', 'success');
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

  const marcarComissao = async (comissaoId: string, paga: boolean) => {
    try {
      await parceirosApi.marcarComissao(comissaoId, paga);
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

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
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
      </div>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo Parceiro">
        <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <Input label="Email (login do parceiro)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Telefone / WhatsApp" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <Input label="CNPJ (opcional)" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
        <Input label="Comissão (%)" type="number" min={0} max={100} value={form.comissaoPercent} onChange={(e) => setForm({ ...form, comissaoPercent: e.target.value })} />
        <Input label="Senha de acesso" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
        <Button onClick={criar} className="mt-2">Criar parceiro</Button>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar parceiro">
        <Input label="Nome" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
        <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
        <Input label="Telefone" value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
        <Input label="Comissão (%)" type="number" min={0} max={100} value={editForm.comissaoPercent} onChange={(e) => setEditForm({ ...editForm, comissaoPercent: e.target.value })} />
        <Input label="Nova senha (opcional)" type="password" value={editForm.senha} onChange={(e) => setEditForm({ ...editForm, senha: e.target.value })} />
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editForm.ativo} onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })} />
          Parceiro ativo
        </label>
        <Button onClick={salvarEdicao} className="mt-2">Salvar alterações</Button>
      </Modal>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title={detalhe ? `Parceiro — ${detalhe.nome}` : ''}>
        {detalhe && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="mb-1"><span className="text-slate-500">Código:</span> <span className="font-mono font-semibold">{detalhe.codigo}</span></p>
              {detalhe.link && (
                <div className="flex items-center gap-2">
                  <input readOnly value={detalhe.link} className="flex-1 rounded border bg-white px-2 py-1 text-xs" />
                  <Button variant="secondary" className="text-xs" onClick={() => copiarLink(detalhe.link)}>Copiar</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
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

            <div>
              <p className="mb-2 text-sm font-semibold">Comissões</p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {detalhe.comissoes.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma comissão gerada ainda.</p>
                ) : detalhe.comissoes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{formatCurrency(c.valorComissao)} <span className="text-xs text-slate-400">({c.percentual}% de {formatCurrency(c.valorVenda)})</span></p>
                      <p className="text-xs text-slate-400">{c.descricao || '—'} · {formatDate(c.createdAt)}</p>
                    </div>
                    <Button
                      variant={c.status === 'paga' ? 'secondary' : 'cta'}
                      className="text-xs"
                      onClick={() => marcarComissao(c.id, c.status !== 'paga')}
                    >
                      {c.status === 'paga' ? 'Paga ✓' : 'Marcar paga'}
                    </Button>
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
