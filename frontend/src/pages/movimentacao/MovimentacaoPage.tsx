import { useEffect, useState } from 'react';
import { movimentacaoApi } from '../../services/modules.service';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Card, Modal, Input, Select, Button, Badge } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface Movimentacao {
  id: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor?: number | string;
  quantidade: number;
  responsavel: string;
  createdAt: string;
}

export function MovimentacaoPage() {
  const [items, setItems] = useState<Movimentacao[]>([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filtro, setFiltro] = useState('');
  const { toast } = useToast();
  const [form, setForm] = useState({
    tipo: 'entrada', categoria: 'material', descricao: '', valor: '', quantidade: '1', responsavel: '',
  });

  const carregar = () => {
    setLoading(true);
    Promise.all([
      movimentacaoApi.listar(filtro ? { tipo: filtro } : undefined),
      movimentacaoApi.resumo(),
    ]).then(([lista, r]) => {
      setItems(lista as Movimentacao[]);
      setResumo(r);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtro]);

  const salvar = async () => {
    await movimentacaoApi.criar({
      ...form,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      quantidade: parseInt(form.quantidade, 10),
    });
    setModal(false);
    toast('Movimentação registrada!', 'success');
    carregar();
  };

  return (
    <div>
      <PageHeader title="Controle de Entrada/Saída" subtitle="Movimentação de materiais e recursos"
        action={<Button onClick={() => setModal(true)}>Nova Movimentação</Button>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-slate-500">Entradas</p><p className="text-xl font-bold text-green-600">{formatCurrency(resumo.entradas)}</p></Card>
        <Card><p className="text-sm text-slate-500">Saídas</p><p className="text-xl font-bold text-red-600">{formatCurrency(resumo.saidas)}</p></Card>
        <Card><p className="text-sm text-slate-500">Saldo</p><p className="text-xl font-bold">{formatCurrency(resumo.saldo)}</p></Card>
      </div>

      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="mb-4 rounded-lg border px-3 py-2 text-sm">
        <option value="">Todos</option>
        <option value="entrada">Entradas</option>
        <option value="saida">Saídas</option>
      </select>

      {loading ? <Loading /> : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left"><tr>
              <th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Qtd</th><th className="px-4 py-3">Valor</th>
            </tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-3">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3"><Badge color={m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{m.tipo}</Badge></td>
                  <td className="px-4 py-3">{m.categoria}</td>
                  <td className="px-4 py-3">{m.descricao}</td>
                  <td className="px-4 py-3">{m.quantidade}</td>
                  <td className="px-4 py-3">{m.valor ? formatCurrency(m.valor) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Movimentação">
        <Select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </Select>
        <Select label="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
          <option value="material">Material</option>
          <option value="equipamento">Equipamento</option>
          <option value="insumo">Insumo</option>
          <option value="outro">Outro</option>
        </Select>
        <Input label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <Input label="Quantidade" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
        <Input label="Valor unitário (R$)" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        <Input label="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
        <Button onClick={salvar} className="mt-2">Salvar</Button>
      </Modal>
    </div>
  );
}
