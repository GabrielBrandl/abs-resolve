import { useEffect, useState } from 'react';
import { clientePortalApi, marketplaceApi } from '../../services/modules.service';
import type { Cliente, Servico } from '../../types';
import { formatCurrency } from '../../types';
import { PageHeader, Loading, Card, Button, Select } from '../../components/ui';

export function ClienteSolicitarPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    marketplaceApi.servicos({ ativo: 'true' }).then(setServicos).finally(() => setLoading(false));
  }, []);

  const solicitar = async () => {
    await clientePortalApi.solicitarServico({ servicoId, descricao });
    setMsg('Serviço solicitado com sucesso! Acompanhe em Meus Pedidos.');
    setServicoId('');
    setDescricao('');
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Solicitar Serviço" subtitle="Escolha um serviço do marketplace" />
      {msg && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      <Card className="max-w-lg">
        <Select label="Serviço" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          <option value="">Selecione...</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>{s.nome} — {s.preco ? formatCurrency(s.preco) : 'Sob consulta'}</option>
          ))}
        </Select>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Observações</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
        </div>
        <Button onClick={solicitar} disabled={!servicoId}>Solicitar</Button>
      </Card>
    </div>
  );
}

export function ClienteCadastroPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    clientePortalApi.cadastro().then((c) => {
      setCliente(c);
      setTelefone(c.telefone);
      setWhatsapp(c.whatsapp || '');
    }).finally(() => setLoading(false));
  }, []);

  const salvar = async () => {
    const updated = await clientePortalApi.atualizarCadastro({ telefone, whatsapp });
    setCliente(updated);
    setMsg('Cadastro atualizado!');
  };

  if (loading) return <Loading />;

  const end = cliente?.endereco as Record<string, string>;

  return (
    <div>
      <PageHeader title="Meu Cadastro" subtitle="Seus dados pessoais" />
      {msg && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      <Card className="max-w-lg">
        <div className="mb-4 space-y-2 text-sm">
          <p><span className="text-slate-500">Nome:</span> {cliente?.nome}</p>
          <p><span className="text-slate-500">Email:</span> {cliente?.email}</p>
          <p><span className="text-slate-500">Documento:</span> {cliente?.cpf || cliente?.cnpj}</p>
          {end?.rua && <p><span className="text-slate-500">Endereço:</span> {end.rua}, {end.numero} — {end.cidade}/{end.uf}</p>}
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Telefone</label>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">WhatsApp</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <Button onClick={salvar}>Salvar Alterações</Button>
      </Card>
    </div>
  );
}
