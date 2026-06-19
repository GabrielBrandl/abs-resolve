import { useEffect, useState } from 'react';
import { marketplaceApi } from '../../services/modules.service';
import type { Beneficio } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Badge } from '../../components/ui';

export function ClienteBeneficiosPage() {
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceApi.beneficios({ ativo: 'true' }).then(setBeneficios).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Clube de Benefícios" subtitle="Descontos exclusivos para clientes ABS Resolve" />
      <div className="grid gap-4 sm:grid-cols-2">
        {beneficios.map((b) => (
          <Card key={b.id}>
            <Badge color="bg-rose-100 text-rose-700">{b.categoria}</Badge>
            <h3 className="mt-2 font-semibold">{b.parceiro}</h3>
            <p className="text-sm text-slate-500">{b.descricao}</p>
            {b.cupom && <p className="mt-2 rounded bg-primary-50 px-3 py-2 font-mono text-primary-700">{b.cupom}</p>}
            {b.desconto && <p className="mt-1 font-medium text-green-600">{b.desconto}% de desconto</p>}
            {b.cashback && <p className="mt-1 font-medium text-green-600">Cashback {formatCurrency(b.cashback)}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
