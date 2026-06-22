import { useEffect, useState } from 'react';
import { marketplaceApi } from '../../services/modules.service';
import { useAuthStore } from '../../store/authStore';
import type { Servico, Beneficio } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Badge, Button, Modal, Input, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function MarketplacePage() {
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');
  const { toast } = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [categoria, setCategoria] = useState('');
  const [tab, setTab] = useState<'servicos' | 'beneficios' | 'admin'>('servicos');
  const [loading, setLoading] = useState(true);
  const [modalServico, setModalServico] = useState(false);
  const [modalBeneficio, setModalBeneficio] = useState(false);
  const [servicoForm, setServicoForm] = useState({ nome: '', descricao: '', categoria: 'limpeza', preco: '', parceiro: '' });
  const [beneficioForm, setBeneficioForm] = useState({ parceiro: '', descricao: '', categoria: 'desconto', cupom: '', desconto: '', cashback: '' });

  const carregar = () => {
    setLoading(true);
    Promise.all([
      marketplaceApi.servicos(categoria ? { categoria, ativo: 'true' } : { ativo: 'true' }),
      marketplaceApi.beneficios({ ativo: 'true' }),
    ]).then(([s, b]) => { setServicos(s); setBeneficios(b); }).finally(() => setLoading(false));
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

  const criarBeneficio = async () => {
    await marketplaceApi.criarBeneficio({
      ...beneficioForm,
      desconto: beneficioForm.desconto ? parseFloat(beneficioForm.desconto) : null,
      cashback: beneficioForm.cashback ? parseFloat(beneficioForm.cashback) : null,
      ativo: true,
    });
    setModalBeneficio(false);
    toast('Benefício criado!', 'success');
    carregar();
  };

  const categorias = [...new Set(servicos.map((s) => s.categoria))];

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Catálogo de serviços e clube de benefícios" />

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setTab('servicos')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'servicos' ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>Serviços</button>
        <button onClick={() => setTab('beneficios')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'beneficios' ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>Clube de Benefícios</button>
        {isAdmin && (
          <button onClick={() => setTab('admin')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'admin' ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>Gerenciar</button>
        )}
      </div>

      {tab === 'servicos' && (
        <>
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
                    <span className="text-xs text-slate-400">{s.parceiro}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'beneficios' && (
        loading ? <Loading /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beneficios.map((b) => (
              <Card key={b.id}>
                <Badge color="bg-rose-100 text-rose-700">{b.categoria}</Badge>
                <h3 className="mt-2 font-semibold">{b.parceiro}</h3>
                <p className="mt-1 text-sm text-slate-500">{b.descricao}</p>
                {b.cupom && <p className="mt-2 rounded bg-slate-100 px-2 py-1 font-mono text-sm">Cupom: {b.cupom}</p>}
                {b.desconto && <p className="mt-1 text-sm font-medium text-green-600">{b.desconto}% off</p>}
                {b.cashback && <p className="mt-1 text-sm font-medium text-green-600">Cashback: {formatCurrency(b.cashback)}</p>}
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'admin' && isAdmin && (
        <div className="flex flex-wrap gap-4">
          <Card className="flex-1 min-w-[280px]">
            <h3 className="font-semibold">Serviços</h3>
            <p className="mb-3 text-sm text-slate-500">Adicionar item ao catálogo</p>
            <Button onClick={() => setModalServico(true)}>Novo Serviço</Button>
          </Card>
          <Card className="flex-1 min-w-[280px]">
            <h3 className="font-semibold">Benefícios</h3>
            <p className="mb-3 text-sm text-slate-500">Adicionar cupom ou cashback</p>
            <Button onClick={() => setModalBeneficio(true)}>Novo Benefício</Button>
          </Card>
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
        <Input label="Parceiro" value={servicoForm.parceiro} onChange={(e) => setServicoForm({ ...servicoForm, parceiro: e.target.value })} />
        <Button onClick={criarServico} className="mt-2">Salvar</Button>
      </Modal>

      <Modal open={modalBeneficio} onClose={() => setModalBeneficio(false)} title="Novo Benefício">
        <Input label="Parceiro" value={beneficioForm.parceiro} onChange={(e) => setBeneficioForm({ ...beneficioForm, parceiro: e.target.value })} />
        <Input label="Descrição" value={beneficioForm.descricao} onChange={(e) => setBeneficioForm({ ...beneficioForm, descricao: e.target.value })} />
        <Select label="Categoria" value={beneficioForm.categoria} onChange={(e) => setBeneficioForm({ ...beneficioForm, categoria: e.target.value })}>
          <option value="desconto">Desconto</option>
          <option value="cashback">Cashback</option>
        </Select>
        <Input label="Cupom" value={beneficioForm.cupom} onChange={(e) => setBeneficioForm({ ...beneficioForm, cupom: e.target.value })} />
        <Input label="Desconto (%)" type="number" value={beneficioForm.desconto} onChange={(e) => setBeneficioForm({ ...beneficioForm, desconto: e.target.value })} />
        <Input label="Cashback (R$)" type="number" value={beneficioForm.cashback} onChange={(e) => setBeneficioForm({ ...beneficioForm, cashback: e.target.value })} />
        <Button onClick={criarBeneficio} className="mt-2">Salvar</Button>
      </Modal>
    </div>
  );
}
