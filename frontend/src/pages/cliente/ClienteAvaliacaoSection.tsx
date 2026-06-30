import { useEffect, useState } from 'react';
import { clientePortalApi } from '../../services/modules.service';
import type { AvaliacaoPendente } from '../../types';
import { Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function ClienteAvaliacaoSection() {
  const { toast } = useToast();
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([]);
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const carregar = () => {
    clientePortalApi.avaliacoesPendentes().then(setPendentes);
  };

  useEffect(() => { carregar(); }, []);

  const enviar = async (osId: string) => {
    const nota = notas[osId];
    if (!nota) {
      toast('Selecione uma nota de 1 a 5', 'error');
      return;
    }
    setSubmitting(osId);
    try {
      await clientePortalApi.avaliar(osId, { nota, comentario: comentarios[osId] });
      toast('Avaliação enviada! Obrigado.', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao avaliar', 'error');
    } finally {
      setSubmitting(null);
    }
  };

  if (!pendentes.length) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-lg font-bold text-primary-800">Avalie seu atendimento</h2>
      {pendentes.map((os) => (
        <Card key={os.id} className="mb-3">
          <p className="font-semibold text-primary-800">Pedido {os.pedido.numero}</p>
          {os.pedido.descricao && <p className="text-sm text-slate-500">{os.pedido.descricao}</p>}
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNotas((prev) => ({ ...prev, [os.id]: n }))}
                className={`text-2xl transition ${(notas[os.id] || 0) >= n ? 'text-amber-400' : 'text-slate-300'}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Comentário (opcional)"
            value={comentarios[os.id] || ''}
            onChange={(e) => setComentarios((prev) => ({ ...prev, [os.id]: e.target.value }))}
            className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
            rows={2}
          />
          <Button className="mt-3" variant="cta" disabled={submitting === os.id} onClick={() => enviar(os.id)}>
            {submitting === os.id ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </Card>
      ))}
    </div>
  );
}
