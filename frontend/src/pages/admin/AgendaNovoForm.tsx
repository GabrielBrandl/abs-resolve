import { useEffect, useMemo, useState } from 'react';
import { catalogoAdminApi, clientesApi } from '../../services/modules.service';
import type { CatalogoServicoAdmin, Cliente } from '../../types';
import { Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

type SlotPadrao = { inicio: string; fim: string };

export type PrefillSlot = {
  data?: string;
  horarioInicio?: string;
  horarioFim?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  tecnicos: Array<{ id: string; nome: string }>;
  slotsPadrao: SlotPadrao[];
  prefill?: PrefillSlot | null;
};

const emptyForm = {
  clienteId: '',
  catalogoServicoId: '',
  data: '',
  horarioInicio: '08:00',
  horarioFim: '10:00',
  tecnicoId: '',
  valor: '',
  oQueFazer: '',
  observacoes: '',
  materiais: '',
  acesso: '',
  contatoNoLocal: '',
  prioridade: 'normal' as 'normal' | 'urgente',
  express: false,
  notificarCliente: true,
};

export function AgendaNovoForm({ open, onClose, onCreated, tecnicos, slotsPadrao, prefill }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [servicos, setServicos] = useState<CatalogoServicoAdmin[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  useEffect(() => {
    if (!open) return;
    catalogoAdminApi
      .servicos()
      .then((lista) => setServicos(lista.filter((s) => s.ativo)))
      .catch(() => toast('Erro ao carregar serviços', 'error'));
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      data: prefill?.data || new Date().toISOString().slice(0, 10),
      horarioInicio: prefill?.horarioInicio || slotsPadrao[0]?.inicio || '08:00',
      horarioFim: prefill?.horarioFim || slotsPadrao[0]?.fim || '10:00',
    });
    setClienteSel(null);
    setBuscaCliente('');
    setClientes([]);
  }, [open, prefill, slotsPadrao]);

  useEffect(() => {
    if (!open || buscaCliente.trim().length < 2) {
      setClientes([]);
      return;
    }
    const t = window.setTimeout(() => {
      setBuscando(true);
      clientesApi
        .listar({ busca: buscaCliente.trim(), limit: '15' })
        .then((r) => setClientes(r.clientes || []))
        .catch(() => setClientes([]))
        .finally(() => setBuscando(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [buscaCliente, open]);

  const servicoSel = useMemo(
    () => servicos.find((s) => s.id === form.catalogoServicoId) || null,
    [servicos, form.catalogoServicoId]
  );

  useEffect(() => {
    if (!servicoSel) return;
    setForm((f) => ({
      ...f,
      valor:
        f.valor ||
        (servicoSel.precoMinimo != null && Number(servicoSel.precoMinimo) > 0
          ? String(servicoSel.precoMinimo)
          : f.valor),
    }));
  }, [servicoSel]);

  const setSlot = (inicio: string) => {
    const slot = slotsPadrao.find((s) => s.inicio === inicio) || slotsPadrao[0];
    if (!slot) return;
    setForm((f) => ({ ...f, horarioInicio: slot.inicio, horarioFim: slot.fim }));
  };

  const salvar = async () => {
    if (!form.clienteId) {
      toast('Selecione o cliente', 'error');
      return;
    }
    if (!form.catalogoServicoId) {
      toast('Selecione o serviço', 'error');
      return;
    }
    if (!form.data || !form.horarioInicio) {
      toast('Informe data e horário', 'error');
      return;
    }
    if (!form.oQueFazer.trim()) {
      toast('Descreva o que precisa ser feito', 'error');
      return;
    }

    setSalvando(true);
    try {
      await catalogoAdminApi.criarAgendamento({
        clienteId: form.clienteId,
        catalogoServicoId: form.catalogoServicoId,
        data: form.data,
        horarioInicio: form.horarioInicio,
        horarioFim: form.horarioFim,
        tecnicoId: form.tecnicoId || null,
        valor: form.valor ? Number(form.valor) : undefined,
        oQueFazer: form.oQueFazer.trim(),
        observacoes: form.observacoes.trim() || undefined,
        materiais: form.materiais.trim() || undefined,
        acesso: form.acesso.trim() || undefined,
        contatoNoLocal: form.contatoNoLocal.trim() || undefined,
        prioridade: form.prioridade,
        express: form.express,
        notificarCliente: form.notificarCliente,
        pontosUsados: servicoSel?.pontos,
      });
      toast('Agendamento criado com sucesso!', 'success');
      onCreated();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar agendamento', 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (!open) return null;

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500';
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/45" aria-label="Fechar" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b bg-primary-800 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Agenda operacional</p>
              <h3 className="text-xl font-bold">Novo agendamento</h3>
              <p className="mt-1 text-sm text-white/80">Preencha serviço, horário e o que o técnico deve fazer</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg hover:bg-white/10">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Cliente */}
          <section>
            <label className={labelCls}>Cliente *</label>
            {clienteSel ? (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5">
                <div>
                  <p className="font-semibold text-primary-900">{clienteSel.nome}</p>
                  <p className="text-xs text-slate-600">
                    {clienteSel.telefone}
                    {clienteSel.email ? ` · ${clienteSel.email}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-700 underline"
                  onClick={() => {
                    setClienteSel(null);
                    setForm((f) => ({ ...f, clienteId: '' }));
                  }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Buscar por nome, telefone ou e-mail…"
                  className={inputCls}
                />
                {buscando && <p className="mt-1 text-xs text-slate-400">Buscando…</p>}
                {clientes.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
                    {clientes.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
                          onClick={() => {
                            setClienteSel(c);
                            setForm((f) => ({ ...f, clienteId: c.id }));
                            setBuscaCliente('');
                            setClientes([]);
                          }}
                        >
                          <span className="font-medium">{c.nome}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {c.telefone} · {c.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          {/* Serviço */}
          <section>
            <label className={labelCls}>Serviço do catálogo *</label>
            <select
              value={form.catalogoServicoId}
              onChange={(e) => setForm((f) => ({ ...f, catalogoServicoId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Selecione o serviço…</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                  {s.categoria ? ` · ${s.categoria}` : ''}
                </option>
              ))}
            </select>
            {servicoSel?.descricao && (
              <p className="mt-1.5 text-xs text-slate-500">{servicoSel.descricao}</p>
            )}
          </section>

          {/* Data / horário */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Turno *</label>
              <select
                value={form.horarioInicio}
                onChange={(e) => setSlot(e.target.value)}
                className={inputCls}
              >
                {slotsPadrao.map((s) => (
                  <option key={s.inicio} value={s.inicio}>
                    {s.inicio} — {s.fim}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Técnico / valor / prioridade */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Técnico</label>
              <select
                value={form.tecnicoId}
                onChange={(e) => setForm((f) => ({ ...f, tecnicoId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Atribuir depois</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className={inputCls}
                placeholder="0,00"
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridade</label>
              <select
                value={form.prioridade}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prioridade: e.target.value as 'normal' | 'urgente' }))
                }
                className={inputCls}
              >
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.express}
                  onChange={(e) => setForm((f) => ({ ...f, express: e.target.checked }))}
                />
                Atendimento express
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.notificarCliente}
                  onChange={(e) => setForm((f) => ({ ...f, notificarCliente: e.target.checked }))}
                />
                Notificar cliente
              </label>
            </div>
          </section>

          {/* O que fazer */}
          <section>
            <label className={labelCls}>O que precisa ser feito *</label>
            <textarea
              value={form.oQueFazer}
              onChange={(e) => setForm((f) => ({ ...f, oQueFazer: e.target.value }))}
              rows={4}
              className={inputCls}
              placeholder="Ex.: Trocar disjuntor do quadro da cozinha, testar circuitos e verificar aquecimento na tomada da geladeira…"
            />
          </section>

          <section>
            <label className={labelCls}>Materiais / com ou sem material</label>
            <textarea
              value={form.materiais}
              onChange={(e) => setForm((f) => ({ ...f, materiais: e.target.value }))}
              rows={2}
              className={inputCls}
              placeholder="Ex.: Cliente fornece tomada; ABS leva disjuntor 20A…"
            />
          </section>

          <section>
            <label className={labelCls}>Acesso ao imóvel</label>
            <input
              value={form.acesso}
              onChange={(e) => setForm((f) => ({ ...f, acesso: e.target.value }))}
              className={inputCls}
              placeholder="Ex.: Portaria, bloco B apto 302, senha 1234…"
            />
          </section>

          <section>
            <label className={labelCls}>Contato no local</label>
            <input
              value={form.contatoNoLocal}
              onChange={(e) => setForm((f) => ({ ...f, contatoNoLocal: e.target.value }))}
              className={inputCls}
              placeholder="Nome e telefone de quem recebe o técnico"
            />
          </section>

          <section>
            <label className={labelCls}>Observações internas</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              className={inputCls}
              placeholder="Notas para a equipe (não obrigatório enviar ao cliente)"
            />
          </section>
        </div>

        <div className="flex gap-2 border-t bg-slate-50 px-5 py-4">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Criar agendamento'}
          </Button>
        </div>
      </aside>
    </div>
  );
}
