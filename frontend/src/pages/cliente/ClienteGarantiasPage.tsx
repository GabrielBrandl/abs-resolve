import { useEffect, useState } from 'react';
import { clientePortalApi } from '../../services/modules.service';
import type { Garantia } from '../../types';
import { formatDate } from '../../types';
import { PageHeader, Loading, Badge, Card } from '../../components/ui';

export function ClienteGarantiasPage() {
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientePortalApi.garantias().then(setGarantias).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Minhas Garantias" subtitle="Garantias dos serviços realizados" />
      {garantias.length === 0 ? (
        <Card><p className="text-slate-400">Nenhuma garantia registrada</p></Card>
      ) : (
        garantias.map((g) => (
          <Card key={g.id} className="mb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-primary-800">{g.servicoNome}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(g.dataInicio)} — {formatDate(g.dataFim)}
                </p>
                {g.ativa && (
                  <p className="mt-1 text-sm text-green-600">{g.diasRestantes} dias restantes</p>
                )}
              </div>
              <Badge color={g.ativa ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                {g.ativa ? 'Ativa' : 'Expirada'}
              </Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
