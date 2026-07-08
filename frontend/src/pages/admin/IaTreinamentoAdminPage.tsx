import { useEffect, useRef, useState } from 'react';
import { iaTreinamentoApi } from '../../services/modules.service';
import type { IaConhecimento } from '../../types';
import { PageHeader, Loading, Card, Button, Badge } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface ChatMsg {
  id: string;
  role: 'admin' | 'ia';
  texto: string;
  hora: string;
}

export function IaTreinamentoAdminPage() {
  const { toast } = useToast();
  const [conhecimentos, setConhecimentos] = useState<IaConhecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [servicoSlug, setServicoSlug] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const carregar = () => {
    setLoading(true);
    iaTreinamentoApi
      .listar()
      .then(setConhecimentos)
      .catch((e) => toast(e instanceof Error ? e.message : 'Erro ao carregar', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const enviar = async () => {
    const texto = mensagem.trim();
    if (!texto || enviando) return;

    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setChat((c) => [...c, { id: `u-${Date.now()}`, role: 'admin', texto, hora }]);
    setMensagem('');
    setEnviando(true);

    try {
      const { resposta } = await iaTreinamentoApi.chat({
        mensagem: texto,
        servicoSlug: servicoSlug.trim() || undefined,
      });
      setChat((c) => [
        ...c,
        { id: `ia-${Date.now()}`, role: 'ia', texto: resposta, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
      ]);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao enviar', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const toggleAtivo = async (item: IaConhecimento) => {
    try {
      await iaTreinamentoApi.atualizar(item.id, { ativo: !item.ativo });
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const excluir = async (item: IaConhecimento) => {
    if (!confirm('Excluir este conhecimento da IA?')) return;
    try {
      await iaTreinamentoApi.excluir(item.id);
      toast('Conhecimento removido', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  if (loading && !conhecimentos.length) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Treinamento da IA"
        subtitle="Alimente a IA com conhecimento técnico — apenas administradores"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex min-h-[520px] flex-col">
          <div className="mb-3 border-b pb-3">
            <h3 className="font-semibold text-slate-800">Chat de treinamento</h3>
            <p className="mt-1 text-xs text-slate-500">
              Escreva informações técnicas, regras de preço, dicas de diagnóstico ou procedimentos. Cada mensagem é salva e usada nos diagnósticos.
            </p>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Serviço específico (opcional — slug do catálogo)
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Ex: troca-tomada, instalacao-chuveiro"
              value={servicoSlug}
              onChange={(e) => setServicoSlug(e.target.value)}
            />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
            {chat.length === 0 && (
              <p className="text-center text-sm text-slate-400">
                Exemplo: &quot;Para troca de tomada 20A, sempre verificar se o disjuntor é exclusivo. Se não for, adicionar R$ 50 ao orçamento.&quot;
              </p>
            )}
            {chat.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'border bg-white text-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.texto}</p>
                  <p className={`mt-1 text-[10px] ${msg.role === 'admin' ? 'text-primary-200' : 'text-slate-400'}`}>
                    {msg.role === 'admin' ? 'Você' : 'IA'} · {msg.hora}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <textarea
              className="min-h-[72px] flex-1 resize-none rounded-lg border px-3 py-2 text-sm"
              placeholder="Digite o conhecimento para a IA..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
            />
            <Button variant="cta" onClick={() => void enviar()} disabled={enviando || !mensagem.trim()}>
              {enviando ? '...' : 'Enviar'}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-slate-800">Base de conhecimento ({conhecimentos.length})</h3>
          <div className="max-h-[600px] space-y-2 overflow-y-auto">
            {conhecimentos.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum conhecimento registrado ainda.</p>
            )}
            {conhecimentos.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 text-sm ${item.ativo ? 'bg-white' : 'bg-slate-50 opacity-60'}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color={item.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {item.servicoSlug && (
                    <Badge color="bg-blue-100 text-blue-700">{item.servicoSlug}</Badge>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    {item.admin?.nome ? ` · ${item.admin.nome}` : ''}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-slate-700">{item.conteudo}</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" onClick={() => void toggleAtivo(item)}>
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="danger" onClick={() => void excluir(item)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
