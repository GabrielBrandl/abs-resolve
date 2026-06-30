import { useEffect, useState } from 'react';
import { marketplaceApi } from '../../services/modules.service';
import { useAuthStore } from '../../store/authStore';
import type { Servico } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Badge, Button, Modal, Input, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function MarketplacePage() {
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  const { toast } = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalServico, setModalServico] = useState(false);
  const [servicoForm, setServicoForm] = useState({ nome: '', descricao: '', categoria: 'limpeza', preco: '' });

  const carregar = () => {
    setLoading(true);
    marketplaceApi.servicos(categoria ? { categoria, ativo: 'true' } : { ativo: 'true' })
      .then(setServicos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [categoria]);

  const criarServico = async () => {
    await marketplaceApi.criarServico({
      ...servicoForm,
      preco: servicoForm.preco ? parseFloat(servicoForm.preco) : null,
      ativo: true,
    });
    setModalServico(false);
    toast('Serviço criado!', 'success');
    carregar();
  };

  const excluirServico = async (id: string) => {
    if (!confirm('Desativar este serviço do marketplace?')) return;
    await marketplaceApi.excluirServico(id);
    toast('Serviço desativado', 'success');
    carregar();
  };

  const categorias = [...new Set(servicos.map((s) => s.categoria))];

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle="Catálogo interno de serviços"
        action={isAdmin ? <Button onClick={() => setModalServico(true)}>Novo Serviço</Button> : undefined}
      />

      <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mb-4 rounded-lg border px-3 py-2 text-sm">
        <option value="">Todas categorias</option>
        {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {loading ? <Loading /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <Card key={s.id}>
              <Badge color="bg-blue-100 text-blue-700">{s.categoria}</Badge>
              <h3 className="mt-2 font-semibold">{s.nome}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.descricao}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-primary-600">{s.preco ? formatCurrency(s.preco) : 'Sob consulta'}</span>
                {isAdmin && (
                  <Button variant="danger" className="text-xs" onClick={() => excluirServico(s.id)}>Desativar</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalServico} onClose={() => setModalServico(false)} title="Novo Serviço">
        <Input label="Nome" value={servicoForm.nome} onChange={(e) => setServicoForm({ ...servicoForm, nome: e.target.value })} />
        <Input label="Descrição" value={servicoForm.descricao} onChange={(e) => setServicoForm({ ...servicoForm, descricao: e.target.value })} />
        <Select label="Categoria" value={servicoForm.categoria} onChange={(e) => setServicoForm({ ...servicoForm, categoria: e.target.value })}>
          <option value="limpeza">Limpeza</option>
          <option value="pintura">Pintura</option>
          <option value="eletrica">Elétrica</option>
        </Select>
        <Input label="Preço (R$)" type="number" value={servicoForm.preco} onChange={(e) => setServicoForm({ ...servicoForm, preco: e.target.value })} />
        <Button onClick={criarServico} className="mt-2">Salvar</Button>
      </Modal>
    </div>
  );
}
