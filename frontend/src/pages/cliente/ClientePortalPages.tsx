import { useEffect, useState } from 'react';
import { clientePortalApi } from '../../services/modules.service';
import type { Cliente, EnderecoCliente } from '../../types';
import { PageHeader, Loading, Card, Button, Input } from '../../components/ui';
import { useToast } from '../../components/Toast';

const enderecoVazio: EnderecoCliente = {
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
};

export function ClienteCadastroPage() {
  const { toast } = useToast();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState<EnderecoCliente>(enderecoVazio);
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    clientePortalApi.cadastro().then((c) => {
      setCliente(c);
      setTelefone(c.telefone);
      setWhatsapp(c.whatsapp || '');
      const end = c.endereco as Record<string, string>;
      if (end) {
        setEndereco({
          cep: end.cep || '',
          rua: end.rua || '',
          numero: end.numero || '',
          complemento: end.complemento || '',
          bairro: end.bairro || '',
          cidade: end.cidade || '',
          uf: end.uf || '',
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const buscarCep = async (cep: string) => {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast('CEP não encontrado', 'error');
        return;
      }
      setEndereco((prev) => ({
        ...prev,
        cep: limpo.replace(/(\d{5})(\d{3})/, '$1-$2'),
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    } catch {
      toast('Erro ao buscar CEP', 'error');
    } finally {
      setBuscandoCep(false);
    }
  };

  const salvarContato = async () => {
    setSalvando(true);
    try {
      const updated = await clientePortalApi.atualizarCadastro({ telefone, whatsapp });
      setCliente(updated);
      toast('Contato atualizado!', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const salvarEndereco = async () => {
    if (!endereco.cep || !endereco.rua || !endereco.numero || !endereco.cidade) {
      toast('Preencha CEP, rua, número e cidade', 'error');
      return;
    }
    setSalvando(true);
    try {
      await clientePortalApi.atualizarEndereco(endereco);
      toast('Endereço salvo!', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar endereço', 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title="Meu Cadastro" subtitle="Seus dados pessoais e endereço" />

      <Card className="mb-4 max-w-lg">
        <h3 className="mb-3 font-semibold text-primary-800">Dados pessoais</h3>
        <div className="mb-4 space-y-2 text-sm">
          <p><span className="text-slate-500">Nome:</span> {cliente?.nome}</p>
          <p><span className="text-slate-500">Email:</span> {cliente?.email}</p>
          <p><span className="text-slate-500">Documento:</span> {cliente?.cpf || cliente?.cnpj}</p>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Telefone</label>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">WhatsApp</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <Button onClick={salvarContato} disabled={salvando}>Salvar contato</Button>
      </Card>

      <Card className="max-w-lg">
        <h3 className="mb-3 font-semibold text-primary-800">Endereço de atendimento</h3>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <Input
              label="CEP"
              value={endereco.cep}
              onChange={(e) => {
                const v = e.target.value;
                setEndereco((prev) => ({ ...prev, cep: v }));
                if (v.replace(/\D/g, '').length === 8) buscarCep(v);
              }}
              placeholder="00000-000"
            />
          </div>
          {buscandoCep && <p className="self-end pb-3 text-xs text-slate-400">Buscando...</p>}
        </div>
        <Input label="Rua" value={endereco.rua} onChange={(e) => setEndereco((p) => ({ ...p, rua: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Número" value={endereco.numero} onChange={(e) => setEndereco((p) => ({ ...p, numero: e.target.value }))} />
          <Input label="Complemento" value={endereco.complemento || ''} onChange={(e) => setEndereco((p) => ({ ...p, complemento: e.target.value }))} />
        </div>
        <Input label="Bairro" value={endereco.bairro} onChange={(e) => setEndereco((p) => ({ ...p, bairro: e.target.value }))} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Cidade" value={endereco.cidade} onChange={(e) => setEndereco((p) => ({ ...p, cidade: e.target.value }))} />
          </div>
          <Input label="UF" value={endereco.uf} onChange={(e) => setEndereco((p) => ({ ...p, uf: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} />
        </div>
        <Button variant="cta" onClick={salvarEndereco} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar endereço'}
        </Button>
      </Card>
    </div>
  );
}
