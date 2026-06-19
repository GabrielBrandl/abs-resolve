import { useEffect, useState } from 'react';
import { osApi } from '../../services/modules.service';
import type { OrdemServico } from '../../types';
import { ETAPAS_OS } from '../../types';
import { PageHeader, Loading, Badge, Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function OrdemServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const { toast } = useToast();

  const carregar = () => {
    setLoading(true);
    osApi.listar(filtro ? { etapa: filtro } : undefined).then(setOrdens).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtro]);

  const avancarEtapa = async (os: OrdemServico) => {
    const idx = ETAPAS_OS.findIndex((e) => e.key === os.etapa);
    if (idx < ETAPAS_OS.length - 1) {
      await osApi.etapa(os.id, ETAPAS_OS[idx + 1].key);
      toast('Etapa atualizada!', 'success');
      carregar();
    }
  };

  return (
    <div>
      <PageHeader title="Ordens de Serviço" subtitle="Acompanhamento operacional" />

      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="mb-4 rounded-lg border px-3 py-2 text-sm">
        <option value="">Todas etapas</option>
        {ETAPAS_OS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
      </select>

      {loading ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ordens.map((os) => {
            const etapaInfo = ETAPAS_OS.find((e) => e.key === os.etapa);
            const idx = ETAPAS_OS.findIndex((e) => e.key === os.etapa);
            return (
              <Card key={os.id}>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold">{os.pedido?.numero || os.pedidoId}</h3>
                    <p className="text-sm text-slate-500">{os.pedido?.cliente?.nome}</p>
                  </div>
                  <Badge color="bg-indigo-100 text-indigo-700">{etapaInfo?.label}</Badge>
                </div>
                <div className="mt-3 flex gap-1">
                  {ETAPAS_OS.map((e, i) => (
                    <div key={e.key} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                  ))}
                </div>
                {os.parceiro && <p className="mt-2 text-sm text-slate-500">Parceiro: {os.parceiro}</p>}
                {idx < ETAPAS_OS.length - 1 && (
                  <Button variant="secondary" className="mt-3" onClick={() => avancarEtapa(os)}>
                    Avançar para {ETAPAS_OS[idx + 1].label}
                  </Button>
                )}
              </Card>
            );
          })}
          {!ordens.length && <p className="text-slate-400">Nenhuma OS encontrada</p>}
        </div>
      )}
    </div>
  );
}
