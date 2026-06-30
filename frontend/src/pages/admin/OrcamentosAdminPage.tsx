import { useEffect, useState } from 'react';
import { catalogoAdminApi } from '../../services/modules.service';
import { formatDate } from '../../types';
import { PageHeader, Loading, Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function OrcamentosAdminPage() {
  const { toast } = useToast();
  const [orcamentos, setOrcamentos] = useState<Array<{
    id: string; status: string; createdAt: string; opcoes?: Record<string, unknown>;
    servico?: { nome: string }; cliente?: { nome: string; email: string; telefone: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [precoFinal, setPrecoFinal] = useState('');
  const [observacao, setObservacao] = useState('');

  const carregar = () => {
    setLoading(true);
    catalogoAdminApi.orcamentos().then(setOrcamentos).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const responder = async (id: string) => {
    const preco = parseFloat(precoFinal);
    if (!preco || preco <= 0) {
      toast('Informe um preço válido', 'error');
      return;
    }
    try {
      await catalogoAdminApi.responderOrcamento(id, { precoFinal: preco, observacao });
      toast('Orçamento respondido!', 'success');
      setRespondendo(null);
      setPrecoFinal('');
      setObservacao('');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao responder', 'error');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Orçamentos Pendentes" subtitle="Solicitações sob orçamento dos clientes" />

      {orcamentos.length === 0 ? (
        <Card><p className="text-slate-400">Nenhum orçamento pendente</p></Card>
      ) : (
        orcamentos.map((o) => (
          <Card key={o.id} className="mb-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold text-primary-800">{o.servico?.nome || 'Serviço'}</h3>
                <p className="text-sm text-slate-500">{formatDate(o.createdAt)}</p>
                {o.cliente && (
                  <p className="mt-1 text-sm">
                    {o.cliente.nome} · {o.cliente.telefone} · {o.cliente.email}
                  </p>
                )}
                {o.opcoes?.descricao != null && (
                  <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600">
                    {String(o.opcoes.descricao)}
                  </p>
                )}
              </div>
              <Button onClick={() => setRespondendo(o.id)}>Responder</Button>
            </div>

            {respondendo === o.id && (
              <div className="mt-4 border-t pt-4">
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium">Preço final (R$)</label>
                  <input
                    type="number"
                    className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
                    value={precoFinal}
                    onChange={(e) => setPrecoFinal(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium">Observação</label>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    rows={2}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="cta" onClick={() => responder(o.id)}>Enviar orçamento</Button>
                  <Button variant="secondary" onClick={() => setRespondendo(null)}>Cancelar</Button>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
