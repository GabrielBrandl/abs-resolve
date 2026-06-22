import { useEffect, useState } from 'react';
import { solicitacaoApi } from '../../services/modules.service';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Button, Select, ScarcityBadge, Logo } from '../../components/ui';
import { useToast } from '../../components/Toast';

type Step = 'servico' | 'opcoes' | 'fotos' | 'orcamento' | 'upsell' | 'horario' | 'pagamento' | 'concluido';

interface CatalogoItem {
  id: string;
  slug: string;
  nome: string;
  tipo: string;
  pontos: number;
  precosFixos?: Array<{ chave: string; label: string; preco: number }>;
}

export function AgendarServicoPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('servico');
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [servico, setServico] = useState<CatalogoItem | null>(null);
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [opcoes, setOpcoes] = useState({ tipo: 'simples', amperagem: '10a' });
  const [preco, setPreco] = useState(0);
  const [analise, setAnalise] = useState<{ confianca?: number; descricao?: string; acao?: string } | null>(null);
  const [upsells, setUpsells] = useState<Array<{ id: string; nome: string; preco: number }>>([]);
  const [upsellsSel, setUpsellsSel] = useState<string[]>([]);
  const [express, setExpress] = useState(false);
  const [slots, setSlots] = useState<Array<{ data: string; horarioInicio: string; horarioFim: string; label: string; escassez: string }>>([]);
  const [proxima, setProxima] = useState<string | null>(null);
  const [slotSel, setSlotSel] = useState<{ data: string; horarioInicio: string; horarioFim: string } | null>(null);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pagamento, setPagamento] = useState<{ invoiceUrl?: string; pixCode?: string } | null>(null);

  useEffect(() => {
    solicitacaoApi.catalogo().then(setCatalogo).finally(() => setLoading(false));
  }, []);

  const escolherServico = async (s: CatalogoItem) => {
    setServico(s);
    const u = await solicitacaoApi.upsells(s.slug);
    setUpsells(u);
    setStep(s.tipo === 'A' ? 'opcoes' : 'fotos');
  };

  const confirmarOpcoes = async () => {
    if (!servico) return;
    const calc = await solicitacaoApi.calcularTipoA({ servicoSlug: servico.slug, opcoes, upsells: [], express: false });
    setPreco(calc.precoFinal);
    const sol = await solicitacaoApi.criar({ servicoSlug: servico.slug, opcoes }) as { id: string };
    setSolicitacaoId(sol.id);
    setStep('orcamento');
  };

  const enviarFotos = async () => {
    if (!servico || !fotoFiles.length) {
      toast('Selecione pelo menos uma foto', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await solicitacaoApi.uploadFotos('nova', fotoFiles, servico.slug) as {
        id: string; status: string; precoFinal: number; analiseIa: typeof analise;
      };
      setSolicitacaoId(res.id);
      setAnalise(res.analiseIa);
      if (res.status === 'aguardando_fotos') {
        toast('Precisamos de fotos mais nítidas. Tente novamente.', 'error');
        return;
      }
      setPreco(Number(res.precoFinal));
      setStep('orcamento');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro no upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const aprovarOrcamento = () => setStep('upsell');

  const confirmarUpsells = async () => {
    const res = await solicitacaoApi.upsellsAplicar(solicitacaoId, { upsells: upsellsSel, express }) as { precoFinal: number };
    setPreco(Number(res.precoFinal));
    const h = await solicitacaoApi.horarios(solicitacaoId);
    setSlots(h.slots);
    setProxima(h.proximaDisponibilidade);
    setStep('horario');
  };

  const confirmarHorario = async () => {
    if (!slotSel) return;
    await solicitacaoApi.agendar(solicitacaoId, slotSel);
    setStep('pagamento');
  };

  const pagar = async (metodo: string) => {
    const res = await solicitacaoApi.pagar(solicitacaoId, metodo) as { pagamento: { invoiceUrl?: string; pixCode?: string } };
    setPagamento(res.pagamento);
    toast('Pedido criado! Pagamento gerado.', 'success');
    setStep('concluido');
  };

  const toggleUpsell = (id: string) => {
    setUpsellsSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Solicitar Serviço" subtitle="Escolha o problema, receba orçamento, agende e pague — tudo automático" />

      {step === 'servico' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogo.map((s) => (
            <Card key={s.id} className="cursor-pointer border-2 border-transparent hover:border-accent-500 transition" onClick={() => escolherServico(s)}>
              <span className="text-2xl">{s.tipo === 'A' ? '⚡' : '📷'}</span>
              <h3 className="mt-2 font-bold text-primary-700">{s.nome}</h3>
              <p className="text-xs text-slate-500">{s.tipo === 'A' ? 'Preço fixo instantâneo' : 'Orçamento por IA com foto'}</p>
            </Card>
          ))}
        </div>
      )}

      {step === 'opcoes' && servico?.slug === 'tomada' && (
        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Tomada — selecione as opções</h3>
          <Select label="Tipo" value={opcoes.tipo} onChange={(e) => setOpcoes({ ...opcoes, tipo: e.target.value })}>
            <option value="simples">Simples</option>
            <option value="dupla">Dupla</option>
          </Select>
          <Select label="Amperagem" value={opcoes.amperagem} onChange={(e) => setOpcoes({ ...opcoes, amperagem: e.target.value })}>
            <option value="10a">10A</option>
            <option value="20a">20A</option>
          </Select>
          <Button variant="cta" onClick={confirmarOpcoes}>Calcular preço</Button>
        </Card>
      )}

      {step === 'opcoes' && servico?.slug === 'interruptor' && (
        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Interruptor — selecione o tipo</h3>
          <Select label="Tipo" value={opcoes.tipo} onChange={(e) => setOpcoes({ ...opcoes, tipo: e.target.value })}>
            <option value="simples">Simples — R$ 149</option>
            <option value="duplo">Duplo — R$ 159</option>
            <option value="triplo">Triplo — R$ 169</option>
          </Select>
          <Button variant="cta" onClick={confirmarOpcoes}>Calcular preço</Button>
        </Card>
      )}

      {step === 'fotos' && (
        <Card>
          <h3 className="mb-2 font-semibold text-primary-700">Envie fotos do local</h3>
          <p className="mb-4 text-sm text-slate-500">
            Tire fotos nítidas do problema. Nossa IA (OpenAI Vision) analisará e gerará o orçamento automaticamente.
          </p>
          <div className="mb-4 rounded-lg border-2 border-dashed border-primary-300 bg-primary-50/50 p-6 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFotoFiles(Array.from(e.target.files || []))}
              className="mx-auto text-sm"
            />
            {fotoFiles.length > 0 && (
              <p className="mt-2 text-sm text-primary-700">{fotoFiles.length} foto(s) selecionada(s)</p>
            )}
          </div>
          <Button variant="cta" onClick={enviarFotos} disabled={uploading} className="mt-2">
            {uploading ? 'Analisando com IA...' : 'Enviar e analisar com IA'}
          </Button>
        </Card>
      )}

      {step === 'orcamento' && (
        <Card className="text-center">
          <Logo className="mx-auto h-14" />
          <p className="mt-4 text-sm text-slate-500">
            Orçamento {analise?.confianca ? `(confiança IA: ${analise.confianca}%)` : ''}
          </p>
          {analise?.descricao && <p className="text-sm text-primary-600">{analise.descricao}</p>}
          <p className="mt-2 text-3xl font-bold text-primary-700">{formatCurrency(preco)}</p>
          <Button variant="cta" onClick={aprovarOrcamento} className="mt-4">Aprovar orçamento</Button>
        </Card>
      )}

      {step === 'upsell' && (
        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Complementos opcionais</h3>
          {upsells.map((u) => (
            <label key={u.id} className="mb-2 flex items-center gap-2 rounded-lg border border-abs-gray p-3">
              <input type="checkbox" checked={upsellsSel.includes(u.id)} onChange={() => toggleUpsell(u.id)} />
              <span className="flex-1">{u.nome}</span>
              <span className="font-medium text-accent-600">+{formatCurrency(u.preco)}</span>
            </label>
          ))}
          <label className="mb-4 flex items-center gap-2 rounded-lg border-2 border-accent-500 bg-accent-500/10 p-3">
            <input type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} />
            <span className="flex-1 font-medium">Atendimento Express (+ R$ 29)</span>
          </label>
          <Button variant="cta" onClick={confirmarUpsells}>Continuar para horários</Button>
        </Card>
      )}

      {step === 'horario' && (
        <Card>
          <h3 className="mb-4 font-semibold text-primary-700">Escolha um horário</h3>
          {slots.length === 0 ? (
            <p className="text-slate-500">Próxima disponibilidade: {proxima || 'Em breve'}</p>
          ) : (
            <div className="space-y-2">
              {slots.map((s, i) => (
                <button key={i} type="button"
                  onClick={() => setSlotSel({ data: s.data, horarioInicio: s.horarioInicio, horarioFim: s.horarioFim })}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                    slotSel?.data === s.data && slotSel?.horarioInicio === s.horarioInicio
                      ? 'border-primary-600 bg-primary-50' : 'border-abs-gray'
                  }`}>
                  <span>{s.label}</span>
                  <ScarcityBadge nivel={s.escassez as 'disponivel' | 'poucos' | 'ultimo'} />
                </button>
              ))}
            </div>
          )}
          <Button variant="cta" onClick={confirmarHorario} disabled={!slotSel} className="mt-4">Confirmar horário</Button>
        </Card>
      )}

      {step === 'pagamento' && (
        <Card>
          <h3 className="mb-2 font-semibold text-primary-700">Pagamento — {formatCurrency(preco)}</h3>
          <div className="flex gap-2">
            <Button variant="cta" onClick={() => pagar('PIX')}>Pagar com PIX</Button>
            <Button onClick={() => pagar('BOLETO')}>Boleto</Button>
            <Button onClick={() => pagar('CARTAO')}>Cartão</Button>
          </div>
        </Card>
      )}

      {step === 'concluido' && (
        <Card className="text-center">
          <p className="text-2xl">✅</p>
          <h3 className="mt-2 text-xl font-bold text-primary-700">Tudo certo!</h3>
          <p className="text-slate-500">Seu pedido foi criado e o técnico foi agendado.</p>
          {pagamento?.invoiceUrl && (
            <a href={pagamento.invoiceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-primary-600 underline">
              Abrir link de pagamento
            </a>
          )}
          {pagamento?.pixCode && (
            <textarea readOnly value={pagamento.pixCode} className="mt-4 w-full rounded border p-2 text-xs" rows={3} />
          )}
        </Card>
      )}
    </div>
  );
}
