import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cpf, cnpj } from 'cpf-cnpj-validator';
import { clientesApi } from '../../services/modules.service';
import { PageHeader, Input, Button, Card, Loading } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function ClienteFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tipo, setTipo] = useState<'PF' | 'PJ'>('PF');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [form, setForm] = useState({
    nome: '', cpf: '', razaoSocial: '', nomeFantasia: '', cnpj: '',
    responsavel: '', email: '', telefone: '', whatsapp: '',
    rua: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
    consentimentoLgpd: false, criarAcesso: false, senha: '',
  });

  useEffect(() => {
    if (!id) return;
    clientesApi.buscar(id).then((c) => {
      const end = c.endereco as Record<string, string>;
      setTipo(c.tipo);
      setForm({
        nome: c.nome, cpf: c.cpf || '', cnpj: c.cnpj || '',
        razaoSocial: c.razaoSocial || '', nomeFantasia: c.nomeFantasia || '',
        responsavel: c.responsavel || '', email: c.email,
        telefone: c.telefone, whatsapp: c.whatsapp || '',
        rua: end?.rua || '', numero: end?.numero || '', bairro: end?.bairro || '',
        cidade: end?.cidade || '', uf: end?.uf || '', cep: end?.cep || '',
        consentimentoLgpd: c.consentimentoLgpd, criarAcesso: false, senha: '',
      });
    }).finally(() => setLoadingData(false));
  }, [id]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const payload = () => ({
    tipo, nome: form.nome, cpf: form.cpf, cnpj: form.cnpj,
    razaoSocial: form.razaoSocial, nomeFantasia: form.nomeFantasia,
    responsavel: form.responsavel, email: form.email,
    telefone: form.telefone, whatsapp: form.whatsapp,
    endereco: { rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, uf: form.uf, cep: form.cep },
    consentimentoLgpd: form.consentimentoLgpd,
    ...( !isEdit && form.criarAcesso ? { criarAcesso: true, senha: form.senha } : {}),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (tipo === 'PF' && form.cpf && !cpf.isValid(form.cpf.replace(/\D/g, ''))) { setError('CPF inválido'); return; }
    if (tipo === 'PJ' && form.cnpj && !cnpj.isValid(form.cnpj.replace(/\D/g, ''))) { setError('CNPJ inválido'); return; }

    setLoading(true);
    try {
      const cliente = isEdit && id
        ? await clientesApi.atualizar(id, payload())
        : await clientesApi.criar(payload());
      toast(isEdit ? 'Cliente atualizado!' : 'Cliente criado!', 'success');
      navigate(`/clientes/${cliente.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <Loading />;

  return (
    <div>
      <PageHeader title={isEdit ? 'Editar Cliente' : 'Novo Cliente'} subtitle={isEdit ? 'Atualize os dados do cliente' : 'Cadastro PF ou PJ'} />
      <Card className="max-w-2xl">
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {!isEdit && (
          <div className="mb-4 flex gap-2">
            {(['PF', 'PJ'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${tipo === t ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>
                {t === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
          {tipo === 'PF' ? (
            <Input label="CPF" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} required={!isEdit} />
          ) : (
            <>
              <Input label="CNPJ" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} required={!isEdit} />
              <Input label="Razão Social" value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} />
              <Input label="Nome Fantasia" value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} />
            </>
          )}
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          <Input label="Telefone" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} required />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          <p className="mb-2 text-sm font-medium text-slate-700">Endereço</p>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Rua" value={form.rua} onChange={(e) => set('rua', e.target.value)} />
            <Input label="Número" value={form.numero} onChange={(e) => set('numero', e.target.value)} />
            <Input label="Cidade" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            <Input label="UF" value={form.uf} onChange={(e) => set('uf', e.target.value)} />
          </div>
          {!isEdit && (
            <>
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.consentimentoLgpd} onChange={(e) => set('consentimentoLgpd', e.target.checked)} />
                Consentimento LGPD
              </label>
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.criarAcesso} onChange={(e) => set('criarAcesso', e.target.checked)} />
                Criar acesso portal cliente
              </label>
              {form.criarAcesso && <Input label="Senha portal" type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} />}
            </>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate(isEdit && id ? `/clientes/${id}` : '/clientes')}>Cancelar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
