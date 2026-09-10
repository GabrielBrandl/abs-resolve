import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedidosApi, clientesApi } from '../../services/modules.service';
import { exportarCsv } from '../../utils/export';
import { useToast } from '../../components/Toast';
import type { Pedido, Cliente } from '../../types';
import { STATUS_PEDIDO, formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Modal, Input, Select, Button, TableWrapper } from '../../components/ui';

export function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [telefoneBusca, setTelefoneBusca] = useState('');
  const [clientesTelefone, setClientesTelefone] = useState<Array<{ id: string; nome: string; telefone: string; email: string; status: string }>>([]);
  const [buscandoTelefone, setBuscandoTelefone] = useState(false);
  const [form, setForm] = useState({ clienteId: '', valor: '', responsavel: 'Comercial', descricao: '' });
  const { toast } = useToast();

  useEffect(() => {
    pedidosApi.listar({ busca, status }).then(setPedidos).finally(() => setLoading(false));
  }, [busca, status]);

  const abrirModal = async () => {
    const r = await clientesApi.listar({ status: 'ativo' });
    setClientes(r.clientes);
    setModal(true);
  };

  useEffect(() => {
    const telefone = telefoneBusca.replace(/\D/g, '');
    if (telefone.length < 4) { setClientesTelefone([]); return; }
    const timer = window.setTimeout(() => {
      setBuscandoTelefone(true);
      clientesApi.buscarTelefone(telefone)
        .then(setClientesTelefone)
        .catch(() => setClientesTelefone([]))
        .finally(() => setBuscandoTelefone(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [telefoneBusca]);

  const criar = async () => {
    await pedidosApi.criar({ ...form, valor: parseFloat(form.valor) });
    setModal(false);
    const lista = await pedidosApi.listar({ busca, status });
    setPedidos(lista);
  };

  const statusInfo = (s: string) => STATUS_PEDIDO.find((x) => x.key === s);

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Acompanhamento de pedidos" action={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => exportarCsv(() => pedidosApi.exportar(), 'pedidos.csv').then(() => toast('Exportado!', 'success'))}>Exportar CSV</Button>
          <Button onClick={abrirModal}>Novo Pedido</Button>
        </div>
      } />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm sm:flex-1" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm sm:w-auto">
          <option value="">Todos</option>
          {STATUS_PEDIDO.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : (
        <TableWrapper>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const pago = p.pagamentos?.some((pg) => pg.status === 'RECEIVED');
                return (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.numero}</td>
                  <td className="px-4 py-3">{p.cliente?.nome}</td>
                  <td className="px-4 py-3">{formatCurrency(p.valor)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge color={statusInfo(p.status)?.color}>{statusInfo(p.status)?.label || p.status}</Badge>
                      {pago && <Badge color="bg-green-100 text-green-700">Pago</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3"><Link to={`/pedidos/${p.id}`} className="text-primary-600 hover:underline">Ver</Link></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Pedido">
        <Input label="Buscar cliente por telefone" type="tel" placeholder="Digite ao menos 4 números" value={telefoneBusca} onChange={(e) => setTelefoneBusca(e.target.value)} />
        {buscandoTelefone && <p className="mb-3 text-xs text-slate-500">Buscando...</p>}
        {!!clientesTelefone.length && <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="mb-2 text-xs font-medium text-primary-700">Clientes encontrados</p>{clientesTelefone.map((c) => <button key={c.id} type="button" onClick={() => { setForm({ ...form, clienteId: c.id }); setTelefoneBusca(c.telefone); setClientesTelefone([]); }} className="flex w-full justify-between rounded px-2 py-2 text-left text-sm hover:bg-white"><span><b>{c.nome}</b><small className="block text-slate-500">{c.telefone}</small></span><span className="text-primary-600">Selecionar</span></button>)}</div>}
        <Select label="Cliente" value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
          <option value="">Selecione...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Input label="Valor (R$)" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        <Input label="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
        <Input label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <Button onClick={criar} className="mt-2">Criar Pedido</Button>
      </Modal>
    </div>
  );
}
