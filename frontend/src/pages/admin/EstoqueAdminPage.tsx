import { useEffect, useState } from 'react';
import { catalogoAdminApi } from '../../services/modules.service';
import type { ProdutoEstoque } from '../../types';
import { PageHeader, Loading, Badge, Button, Modal, TableWrapper } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function EstoqueAdminPage() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [minimo, setMinimo] = useState(0);

  const carregar = () => {
    setLoading(true);
    catalogoAdminApi.estoque().then(setProdutos).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!editId) return;
    try {
      await catalogoAdminApi.atualizarEstoque(editId, { quantidade, minimo });
      toast('Estoque atualizado!', 'success');
      setEditId(null);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Estoque" subtitle="Controle de materiais e insumos" />

      <TableWrapper>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Produto</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Quantidade</th>
              <th className="px-4 py-3 text-left">Mínimo</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">{p.quantidade}</td>
                <td className="px-4 py-3">{p.minimo}</td>
                <td className="px-4 py-3">
                  <Badge color={
                    p.status === 'critico' ? 'bg-red-100 text-red-700'
                      : p.status === 'baixo' ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }>
                    {p.status || 'ok'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button onClick={() => { setEditId(p.id); setQuantidade(p.quantidade); setMinimo(p.minimo); }}>
                    Ajustar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!produtos.length && <p className="p-6 text-center text-slate-400">Nenhum produto cadastrado</p>}
      </TableWrapper>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Ajustar estoque">
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Quantidade</label>
          <input type="number" className="w-full rounded-lg border px-3 py-2 text-sm" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Mínimo</label>
          <input type="number" className="w-full rounded-lg border px-3 py-2 text-sm" value={minimo} onChange={(e) => setMinimo(Number(e.target.value))} />
        </div>
        <div className="flex gap-2">
          <Button variant="cta" onClick={salvar}>Salvar</Button>
          <Button variant="secondary" onClick={() => setEditId(null)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
