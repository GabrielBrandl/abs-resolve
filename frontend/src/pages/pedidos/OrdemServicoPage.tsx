import { useEffect, useState } from 'react';
import { osApi, agendamentoApi } from '../../services/modules.service';
import type { OrdemServico } from '../../types';
import { ETAPAS_OS } from '../../types';
import { PageHeader, Loading, Badge, Card, Button, Modal, Input } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function OrdemServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [checklistOs, setChecklistOs] = useState<OrdemServico | null>(null);
  const [checklist, setChecklist] = useState({
    fotoAntes: '', fotoDepois: '', materiais: '', observacoes: '', assinaturaCliente: '',
  });
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

  const salvarChecklist = async () => {
    if (!checklistOs) return;
    await osApi.checklist(checklistOs.id, checklist);
    toast('Checklist salvo! Garantia emitida se completo.', 'success');
    setChecklistOs(null);
    carregar();
  };

  const registrarAusencia = async (os: OrdemServico) => {
    const agId = (os as OrdemServico & { agendamentoId?: string }).agendamentoId;
    if (!agId) { toast('Sem agendamento vinculado', 'error'); return; }
    const res = await agendamentoApi.ausencia(agId) as { primeiraVez: boolean; taxa: number };
    toast(res.primeiraVez ? 'Reagendamento gratuito' : `Taxa de R$ ${res.taxa} aplicada`, res.primeiraVez ? 'success' : 'error');
  };

  return (
    <div>
      <PageHeader title="Ordens de Serviço" subtitle="Checklist obrigatório antes de finalizar" />

      <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="mb-4 rounded-lg border border-abs-gray px-3 py-2 text-sm">
        <option value="">Todas etapas</option>
        {ETAPAS_OS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
      </select>

      {loading ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ordens.map((os) => {
            const etapaInfo = ETAPAS_OS.find((e) => e.key === os.etapa);
            const idx = ETAPAS_OS.findIndex((e) => e.key === os.etapa);
            const completo = (os as OrdemServico & { checklistCompleto?: boolean }).checklistCompleto;
            return (
              <Card key={os.id}>
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-primary-700">{os.pedido?.numero || os.pedidoId}</h3>
                    <p className="text-sm text-slate-500">{os.pedido?.cliente?.nome}</p>
                  </div>
                  <Badge color={completo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {completo ? 'Checklist OK' : etapaInfo?.label}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-1">
                  {ETAPAS_OS.map((e, i) => (
                    <div key={e.key} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-primary-600' : 'bg-abs-gray'}`} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {os.etapa === 'execucao' && (
                    <Button variant="cta" onClick={() => setChecklistOs(os)}>Preencher Checklist</Button>
                  )}
                  {idx < ETAPAS_OS.length - 1 && os.etapa !== 'conclusao' && (
                    <Button variant="secondary" onClick={() => avancarEtapa(os)}>Avançar etapa</Button>
                  )}
                  <Button variant="secondary" onClick={() => registrarAusencia(os)}>Cliente ausente</Button>
                </div>
              </Card>
            );
          })}
          {!ordens.length && <p className="text-slate-400">Nenhuma OS encontrada</p>}
        </div>
      )}

      <Modal open={!!checklistOs} onClose={() => setChecklistOs(null)} title="Checklist do Técnico">
        <p className="mb-3 text-sm text-slate-500">Todos os campos são obrigatórios para finalizar a OS e emitir garantia.</p>
        <Input label="URL Foto Antes" value={checklist.fotoAntes} onChange={(e) => setChecklist({ ...checklist, fotoAntes: e.target.value })} />
        <Input label="URL Foto Depois" value={checklist.fotoDepois} onChange={(e) => setChecklist({ ...checklist, fotoDepois: e.target.value })} />
        <Input label="Materiais utilizados" value={checklist.materiais} onChange={(e) => setChecklist({ ...checklist, materiais: e.target.value })} />
        <Input label="Observações" value={checklist.observacoes} onChange={(e) => setChecklist({ ...checklist, observacoes: e.target.value })} />
        <Input label="Assinatura digital do cliente" value={checklist.assinaturaCliente} onChange={(e) => setChecklist({ ...checklist, assinaturaCliente: e.target.value })} />
        <Button variant="cta" onClick={salvarChecklist} className="mt-2">Finalizar serviço</Button>
      </Modal>
    </div>
  );
}
