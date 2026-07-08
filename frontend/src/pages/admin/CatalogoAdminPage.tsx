import { useEffect, useRef, useState } from 'react';
import { catalogoAdminApi } from '../../services/modules.service';
import type { CatalogoServicoAdmin } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Button, Badge } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';

export function CatalogoAdminPage() {
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));
  const [servicos, setServicos] = useState<CatalogoServicoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CatalogoServicoAdmin>>({});
  const [enviandoImg, setEnviandoImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = () => {
    setLoading(true);
    catalogoAdminApi.servicos().then(setServicos).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const iniciarEdicao = (s: CatalogoServicoAdmin) => {
    setEditId(s.id);
    setForm({ nome: s.nome, precoMinimo: Number(s.precoMinimo), precoTexto: s.precoTexto || '', descricao: s.descricao || '', pontos: s.pontos, garantiaDias: s.garantiaDias, ativo: s.ativo, imagemUrl: s.imagemUrl });
  };

  const salvar = async () => {
    if (!editId) return;
    try {
      await catalogoAdminApi.atualizarServico(editId, form);
      toast('Serviço atualizado!', 'success');
      setEditId(null);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    }
  };

  const enviarImagem = async (file: File) => {
    if (!editId) return;
    setEnviandoImg(true);
    try {
      const atualizado = await catalogoAdminApi.uploadImagem(editId, file);
      setForm((f) => ({ ...f, imagemUrl: atualizado.imagemUrl }));
      toast('Imagem atualizada!', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao enviar imagem', 'error');
    } finally {
      setEnviandoImg(false);
    }
  };

  const desativar = async (s: CatalogoServicoAdmin) => {
    if (!confirm(`Desativar "${s.nome}" do catálogo? Ele deixa de aparecer para os clientes, mas o histórico é mantido.`)) return;
    try {
      await catalogoAdminApi.excluirServico(s.id);
      toast('Serviço desativado', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const excluirPermanente = async (s: CatalogoServicoAdmin) => {
    if (!confirm(`Excluir DEFINITIVAMENTE o serviço "${s.nome}"?\n\nUse isto apenas para serviços de teste. Se houver solicitações de clientes vinculadas, a exclusão será bloqueada — nesse caso use "Desativar".`)) return;
    try {
      await catalogoAdminApi.excluirServicoPermanente(s.id);
      toast('Serviço excluído', 'success');
      if (editId === s.id) setEditId(null);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Catálogo de Serviços" subtitle="Gerencie preços e disponibilidade" />

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Imagem</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Preço</th>
              <th className="px-4 py-3 text-left">Pontos</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3">
                  {s.imagemUrl ? (
                    <img src={s.imagemUrl} alt={s.nome} className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-0.5" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-300">—</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{s.nome}</td>
                <td className="px-4 py-3 capitalize">{s.categoria.replace(/-/g, ' ')}</td>
                <td className="px-4 py-3">{s.precoTexto || (s.precoMinimo ? formatCurrency(s.precoMinimo) : '—')}</td>
                <td className="px-4 py-3">{s.pontos}</td>
                <td className="px-4 py-3">
                  <Badge color={s.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button onClick={() => iniciarEdicao(s)}>Editar</Button>
                    {isAdmin && s.ativo && (
                      <Button variant="secondary" onClick={() => desativar(s)}>Desativar</Button>
                    )}
                    {isAdmin && (
                      <Button variant="danger" onClick={() => excluirPermanente(s)}>Excluir</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editId && (
        <Card className="mt-4 max-w-lg">
          <h3 className="mb-3 font-semibold">Editar serviço</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Imagem do serviço</label>
              <div className="flex items-center gap-3">
                {form.imagemUrl ? (
                  <img src={form.imagemUrl} alt="Prévia" className="h-20 w-20 rounded-lg border border-slate-200 bg-white object-contain p-1" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">Sem imagem</div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) enviarImagem(file);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={enviandoImg}>
                    {enviandoImg ? 'Enviando...' : 'Trocar imagem'}
                  </Button>
                  <p className="mt-1 text-xs text-slate-400">PNG, JPG ou WebP (até 10MB).</p>
                </div>
              </div>
              <input
                className="mt-2 w-full rounded-lg border px-3 py-2 text-xs text-slate-500"
                placeholder="Ou cole a URL de uma imagem"
                value={form.imagemUrl || ''}
                onChange={(e) => setForm((f) => ({ ...f, imagemUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.nome || ''} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Preço mínimo</label>
                <input type="number" className="w-full rounded-lg border px-3 py-2 text-sm" value={form.precoMinimo || ''} onChange={(e) => setForm((f) => ({ ...f, precoMinimo: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Texto preço</label>
                <input className="w-full rounded-lg border px-3 py-2 text-sm" value={form.precoTexto || ''} onChange={(e) => setForm((f) => ({ ...f, precoTexto: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Descrição</label>
              <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} value={form.descricao || ''} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.ativo ?? true} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} />
              Ativo
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="cta" onClick={salvar}>Salvar</Button>
            <Button variant="secondary" onClick={() => setEditId(null)}>Cancelar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
