import { useEffect, useState } from 'react';
import { marketplaceApi } from '../../services/modules.service';
import type { Servico, Beneficio } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Badge } from '../../components/ui';

export function MarketplacePage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [categoria, setCategoria] = useState('');
  const [tab, setTab] = useState<'servicos' | 'beneficios'>('servicos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      marketplaceApi.servicos(categoria ? { categoria, ativo: 'true' } : { ativo: 'true' }),
      marketplaceApi.beneficios({ ativo: 'true' }),
    ]).then(([s, b]) => { setServicos(s); setBeneficios(b); }).finally(() => setLoading(false));
  }, [categoria]);

  const categorias = [...new Set(servicos.map((s) => s.categoria))];

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Catálogo de serviços e clube de benefícios" />

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('servicos')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'servicos' ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>Serviços</button>
        <button onClick={() => setTab('beneficios')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'beneficios' ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>Clube de Benefícios</button>
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
    </div>
  );
}
