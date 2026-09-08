import { useCallback, useEffect, useRef, useState } from 'react';
import { estoqueAdminApi } from '../../services/modules.service';
import type { EstoqueDashboard, MovimentacaoEstoque, ProdutoEstoque, StatusEstoque } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { PageHeader, Loading, Badge, Button, Modal, TableWrapper, Card, Input, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../store/authStore';

const STATUS_OPTS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'ruptura', label: 'Ruptura' },
  { value: 'critico', label: 'Crítico' },
  { value: 'minimo', label: 'Baixo' },
  { value: 'ok', label: 'Normal' },
];

function statusBadge(status: StatusEstoque) {
  switch (status) {
    case 'ruptura':
      return <Badge color="bg-red-100 text-red-800">Ruptura</Badge>;
    case 'critico':
      return <Badge color="bg-orange-100 text-orange-800">Crítico</Badge>;
    case 'minimo':
      return <Badge color="bg-amber-100 text-amber-800">Baixo</Badge>;
    default:
      return <Badge color="bg-green-100 text-green-800">Normal</Badge>;
  }
}

const EMPTY_PRODUTO = {
  sku: '',
  nome: '',
  quantidade: 0,
  minimo: 5,
  critico: 2,
  servicoSlug: '',
  precoUnitario: '',
};

export function EstoqueAdminPage() {
  const { toast } = useToast();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  const [dashboard, setDashboard] = useState<EstoqueDashboard | null>(null);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  const [modalNovo, setModalNovo] = useState(false);
  const [modalMov, setModalMov] = useState<ProdutoEstoque | null>(null);
  const [modalConfig, setModalConfig] = useState<ProdutoEstoque | null>(null);
  const [modalHist, setModalHist] = useState<ProdutoEstoque | null>(null);
  const [historico, setHistorico] = useState<MovimentacaoEstoque[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const [novo, setNovo] = useState({ ...EMPTY_PRODUTO });
  const [mov, setMov] = useState({ tipo: 'entrada' as 'entrada' | 'saida' | 'ajuste', quantidade: 1, motivo: '' });
  const [config, setConfig] = useState({
    nome: '',
    minimo: 5,
    critico: 2,
    servicoSlug: '',
    precoUnitario: '',
    tipo: '',
    cor: '',
    imagemUrl: '',
    imagens: [] as string[],
    custo: '',
    ativo: true,
  });
  const [enviandoImg, setEnviandoImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      estoqueAdminApi.dashboard(),
      estoqueAdminApi.listar({
        busca: busca.trim() || undefined,
        status: statusFiltro || undefined,
      }),
    ])
      .then(([dash, lista]) => {
        setDashboard(dash);
        setProdutos(lista);
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'Erro ao carregar', 'error'))
      .finally(() => setLoading(false));
  }, [busca, statusFiltro, toast]);

  useEffect(() => {
    const t = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca, statusFiltro]);

  const sincronizar = async () => {
    try {
      const r = await estoqueAdminApi.sincronizar();
      toast(`Catálogo sincronizado: ${r.criados} novos, ${r.atualizados} atualizados`, 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao sincronizar', 'error');
    }
  };

  const criarProduto = async () => {
    try {
      await estoqueAdminApi.criar({
        sku: novo.sku,
        nome: novo.nome,
        quantidade: novo.quantidade,
        minimo: novo.minimo,
        critico: novo.critico,
        servicoSlug: novo.servicoSlug || undefined,
        precoUnitario: novo.precoUnitario ? parseFloat(novo.precoUnitario) : undefined,
      });
      toast('Produto cadastrado!', 'success');
      setModalNovo(false);
      setNovo({ ...EMPTY_PRODUTO });
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar', 'error');
    }
  };

  const movimentar = async () => {
    if (!modalMov) return;
    try {
      await estoqueAdminApi.movimentar(modalMov.id, mov);
      toast('Movimentação registrada!', 'success');
      setModalMov(null);
      setMov({ tipo: 'entrada', quantidade: 1, motivo: '' });
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro na movimentação', 'error');
    }
  };

  const salvarConfig = async () => {
    if (!modalConfig) return;
    try {
      await estoqueAdminApi.atualizar(modalConfig.id, {
        nome: config.nome,
        minimo: config.minimo,
        critico: config.critico,
        servicoSlug: config.servicoSlug || null,
        precoUnitario: config.precoUnitario ? parseFloat(config.precoUnitario) : null,
        tipo: config.tipo || null,
        cor: config.cor || null,
        imagemUrl: config.imagemUrl || null,
        imagens: config.imagens,
        custo: config.custo ? parseFloat(config.custo) : null,
        ativo: config.ativo,
      });
      toast('Produto atualizado!', 'success');
      setModalConfig(null);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    }
  };

  const enviarImagens = async (files: FileList | File[]) => {
    if (!modalConfig) return;
    const lista = Array.from(files).filter(Boolean);
    if (!lista.length) return;
    setEnviandoImg(true);
    try {
      const atualizado = await estoqueAdminApi.uploadImagens(modalConfig.id, lista);
      const imagens = Array.isArray(atualizado.imagens) ? atualizado.imagens : [];
      setConfig((c) => ({ ...c, imagemUrl: atualizado.imagemUrl || '', imagens }));
      setModalConfig(atualizado);
      toast(`${lista.length} imagem(ns) adicionada(s)`, 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao enviar imagens', 'error');
    } finally {
      setEnviandoImg(false);
    }
  };

  const removerFoto = async (url: string) => {
    if (!modalConfig) return;
    try {
      const atualizado = await estoqueAdminApi.removerImagem(modalConfig.id, url);
      const imagens = Array.isArray(atualizado.imagens) ? atualizado.imagens : [];
      setConfig((c) => ({ ...c, imagemUrl: atualizado.imagemUrl || '', imagens }));
      setModalConfig(atualizado);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao remover', 'error');
    }
  };

  const tornarCapa = async (url: string) => {
    if (!modalConfig) return;
    const imagens = [url, ...config.imagens.filter((u) => u !== url)];
    try {
      const atualizado = await estoqueAdminApi.atualizar(modalConfig.id, {
        imagemUrl: url,
        imagens,
      });
      setConfig((c) => ({
        ...c,
        imagemUrl: atualizado.imagemUrl || url,
        imagens: Array.isArray(atualizado.imagens) ? atualizado.imagens : imagens,
      }));
      setModalConfig(atualizado);
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao definir capa', 'error');
    }
  };

  const abrirHistorico = async (p: ProdutoEstoque) => {
    setModalHist(p);
    setHistLoading(true);
    try {
      setHistorico(await estoqueAdminApi.historico(p.id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao carregar histórico', 'error');
    } finally {
      setHistLoading(false);
    }
  };

  const liberarReserva = async (p: ProdutoEstoque) => {
    try {
      await estoqueAdminApi.liberarReserva(p.id, 1);
      toast('Reserva liberada', 'success');
      carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error');
    }
  };

  const abrirMov = (p: ProdutoEstoque) => {
    setModalMov(p);
    setMov({ tipo: 'entrada', quantidade: 1, motivo: '' });
  };

  const abrirConfig = (p: ProdutoEstoque) => {
    setModalConfig(p);
    const imagens =
      Array.isArray(p.imagens) && p.imagens.length
        ? p.imagens
        : p.imagemUrl
          ? [p.imagemUrl]
          : [];
    setConfig({
      nome: p.nome,
      minimo: p.minimo,
      critico: p.critico,
      servicoSlug: p.servicoSlug || '',
      precoUnitario: p.precoUnitario != null ? String(p.precoUnitario) : '',
      tipo: p.tipo || '',
      cor: p.cor || '',
      imagemUrl: p.imagemUrl || '',
      imagens,
      custo: p.custo != null ? String(p.custo) : '',
      ativo: p.ativo !== false,
    });
  };

  if (loading && !dashboard) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Controle de Estoque"
        subtitle="Materiais, peças avulsas e insumos vinculados ao catálogo"
        action={
          <>
            {isAdmin && (
              <Button variant="secondary" onClick={sincronizar}>Sincronizar catálogo</Button>
            )}
            <Button onClick={() => setModalNovo(true)}>Novo produto</Button>
          </>
        }
      />

      {dashboard && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-slate-500">Produtos cadastrados</p>
            <p className="text-2xl font-bold text-primary-700">{dashboard.totalProdutos}</p>
            <p className="mt-1 text-xs text-slate-400">{dashboard.totalUnidades} un. em estoque</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Valor em estoque</p>
            <p className="text-2xl font-bold text-primary-700">{formatCurrency(dashboard.valorEstoque)}</p>
            <p className="mt-1 text-xs text-slate-400">{dashboard.reservadoTotal} un. reservadas</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Alertas</p>
            <p className="text-2xl font-bold text-red-600">{dashboard.alertas}</p>
            <p className="mt-1 text-xs text-slate-400">
              {dashboard.ruptura} ruptura · {dashboard.critico} crítico · {dashboard.minimo} baixo
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Situação normal</p>
            <p className="text-2xl font-bold text-green-600">{dashboard.ok}</p>
            <p className="mt-1 text-xs text-slate-400">produtos com saldo adequado</p>
          </Card>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Buscar por nome, SKU ou serviço..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm sm:max-w-md"
        />
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? <Loading /> : (
        <TableWrapper>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Disponível</th>
                <th className="px-4 py-3">Reservado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Mín / Crít</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-t dark:border-slate-700">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.nome}</p>
                    {p.servicoSlug && (
                      <p className="text-xs text-slate-400">Serviço: {p.servicoSlug}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold">{p.disponivel}</td>
                  <td className="px-4 py-3">
                    {p.reservado > 0 ? (
                      <span className="text-amber-700">{p.reservado}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.quantidade}</td>
                  <td className="px-4 py-3 text-slate-500">{p.minimo} / {p.critico}</td>
                  <td className="px-4 py-3">
                    {p.precoUnitario != null ? formatCurrency(p.precoUnitario) : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button className="!px-2 !py-1 text-xs" onClick={() => abrirMov(p)}>Movimentar</Button>
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => abrirConfig(p)}>Editar</Button>
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => abrirHistorico(p)}>Histórico</Button>
                      {p.reservado > 0 && (
                        <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => liberarReserva(p)}>
                          Liberar reserva
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!produtos.length && (
            <p className="p-8 text-center text-slate-400">
              Nenhum produto encontrado. Use &quot;Sincronizar catálogo&quot; para importar peças da loja.
            </p>
          )}
        </TableWrapper>
      )}

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo produto">
        <Input label="SKU" value={novo.sku} onChange={(e) => setNovo({ ...novo, sku: e.target.value })} placeholder="peca-tomada-simples" />
        <Input label="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
        <Input label="Quantidade inicial" type="number" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: Number(e.target.value) })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mínimo" type="number" value={novo.minimo} onChange={(e) => setNovo({ ...novo, minimo: Number(e.target.value) })} />
          <Input label="Crítico" type="number" value={novo.critico} onChange={(e) => setNovo({ ...novo, critico: Number(e.target.value) })} />
        </div>
        <Input label="Serviço vinculado (slug)" value={novo.servicoSlug} onChange={(e) => setNovo({ ...novo, servicoSlug: e.target.value })} placeholder="troca-tomada" />
        <Input label="Preço unitário (R$)" type="number" step="0.01" value={novo.precoUnitario} onChange={(e) => setNovo({ ...novo, precoUnitario: e.target.value })} />
        <div className="mt-4 flex gap-2">
          <Button variant="cta" onClick={criarProduto}>Cadastrar</Button>
          <Button variant="secondary" onClick={() => setModalNovo(false)}>Cancelar</Button>
        </div>
      </Modal>

      <Modal open={!!modalMov} onClose={() => setModalMov(null)} title={`Movimentar — ${modalMov?.nome || ''}`}>
        <Select label="Tipo" value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value as typeof mov.tipo })}>
          <option value="entrada">Entrada (compra / recebimento)</option>
          <option value="saida">Saída (uso / perda)</option>
          <option value="ajuste">Ajuste (definir saldo exato)</option>
        </Select>
        <Input
          label={mov.tipo === 'ajuste' ? 'Novo saldo total' : 'Quantidade'}
          type="number"
          min={0}
          value={mov.quantidade}
          onChange={(e) => setMov({ ...mov, quantidade: Number(e.target.value) })}
        />
        <Input label="Motivo / observação" value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} placeholder="Ex: compra fornecedor, contagem física..." />
        {modalMov && (
          <p className="mb-3 text-xs text-slate-500">
            Disponível agora: {modalMov.disponivel} · Reservado: {modalMov.reservado}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="cta" onClick={movimentar}>Confirmar</Button>
          <Button variant="secondary" onClick={() => setModalMov(null)}>Cancelar</Button>
        </div>
      </Modal>

      <Modal open={!!modalConfig} onClose={() => setModalConfig(null)} title={`Editar — ${modalConfig?.nome || ''}`}>
        <Input label="Nome" value={config.nome} onChange={(e) => setConfig({ ...config, nome: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mínimo" type="number" value={config.minimo} onChange={(e) => setConfig({ ...config, minimo: Number(e.target.value) })} />
          <Input label="Crítico" type="number" value={config.critico} onChange={(e) => setConfig({ ...config, critico: Number(e.target.value) })} />
        </div>
        <Input label="Serviço vinculado" value={config.servicoSlug} onChange={(e) => setConfig({ ...config, servicoSlug: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tipo / categoria" value={config.tipo} onChange={(e) => setConfig({ ...config, tipo: e.target.value })} placeholder="gourmet" />
          <Input label="Cor / acabamento" value={config.cor} onChange={(e) => setConfig({ ...config, cor: e.target.value })} placeholder="preto" />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Galeria de imagens</label>
          <p className="mb-2 text-xs text-slate-500">Várias fotos por produto. A capa aparece nos cards e na vitrine.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(config.imagens.length ? config.imagens : config.imagemUrl ? [config.imagemUrl] : []).map((url) => (
              <div key={url} className="relative w-20">
                <img
                  src={url}
                  alt=""
                  className={`h-20 w-20 rounded-lg border bg-white object-contain p-0.5 ${
                    config.imagemUrl === url ? 'border-[#002d62] ring-2 ring-[#002d62]/30' : 'border-slate-200'
                  }`}
                />
                <div className="mt-1 flex flex-col gap-0.5">
                  {config.imagemUrl !== url ? (
                    <button type="button" className="text-[10px] font-bold text-[#1d4ed8]" onClick={() => void tornarCapa(url)}>
                      Capa
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700">Capa</span>
                  )}
                  <button type="button" className="text-[10px] font-bold text-red-600" onClick={() => void removerFoto(url)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
            {!config.imagens.length && !config.imagemUrl && (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                Sem imagens
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) void enviarImagens(files);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={enviandoImg || !modalConfig}>
              {enviandoImg ? 'Enviando...' : 'Adicionar imagens'}
            </Button>
            <p className="text-xs text-slate-400">PNG, JPG ou WebP · várias de uma vez</p>
          </div>
          <Input
            label="URL da capa (opcional)"
            value={config.imagemUrl}
            onChange={(e) =>
              setConfig((c) => {
                const url = e.target.value;
                const imgs = [...c.imagens];
                if (url && !imgs.includes(url)) imgs.unshift(url);
                return { ...c, imagemUrl: url, imagens: imgs };
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Custo (R$)" type="number" step="0.01" value={config.custo} onChange={(e) => setConfig({ ...config, custo: e.target.value })} />
          <Input label="Preço de venda (R$)" type="number" step="0.01" value={config.precoUnitario} onChange={(e) => setConfig({ ...config, precoUnitario: e.target.value })} />
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={config.ativo}
            onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
          />
          Ativo na vitrine
        </label>
        {modalConfig && (
          <p className="mb-2 text-xs text-slate-500">SKU: {modalConfig.sku} · Estoque: {modalConfig.quantidade} (use Movimentar para alterar saldo)</p>
        )}
        <div className="flex gap-2">
          <Button variant="cta" onClick={salvarConfig}>Salvar</Button>
          <Button variant="secondary" onClick={() => setModalConfig(null)}>Cancelar</Button>
        </div>
      </Modal>

      <Modal open={!!modalHist} onClose={() => setModalHist(null)} title={`Histórico — ${modalHist?.nome || ''}`}>
        {histLoading ? <Loading /> : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {historico.length === 0 && <p className="text-sm text-slate-400">Sem movimentações registradas</p>}
            {historico.map((h) => (
              <div key={h.id} className="rounded-lg border p-3 text-sm dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge color={h.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {h.tipo} · {h.categoria}
                  </Badge>
                  <span className="text-xs text-slate-400">{formatDate(h.createdAt)}</span>
                </div>
                <p className="mt-2">{h.descricao}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Qtd: {h.quantidade}
                  {h.valor != null && ` · ${formatCurrency(h.valor)}`}
                  {' · '}{h.responsavel}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
