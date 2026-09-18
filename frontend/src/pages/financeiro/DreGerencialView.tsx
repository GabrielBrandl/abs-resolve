import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { financeiroApi } from '../../services/modules.service';
import type { DreDrilldown, DreGerencial, DreLinha, DreCardMetric } from '../../types';
import { formatCurrency, formatDate } from '../../types';
import { Badge, Button, Card, Input, Loading, Modal, Select, TableWrapper } from '../../components/ui';

const CARD_DEFS: Array<{ key: keyof DreGerencial['cards']; label: string; pct?: boolean }> = [
  { key: 'receitaBruta', label: 'Receita bruta' },
  { key: 'receitaLiquida', label: 'Receita líquida' },
  { key: 'custosVariaveis', label: 'Custos variáveis' },
  { key: 'margemContribuicao', label: 'Margem de contribuição' },
  { key: 'margemContribuicaoPct', label: 'Margem contribuição %', pct: true },
  { key: 'despesasComerciais', label: 'Despesas comerciais' },
  { key: 'resultadoOperacional', label: 'Resultado operacional' },
  { key: 'margemOperacionalPct', label: 'Margem operacional %', pct: true },
];

function fmtDelta(m: DreCardMetric, pct?: boolean) {
  if (pct || m.variacaoPp != null) {
    const pp = m.variacaoPp ?? 0;
    const sign = pp > 0 ? '+' : '';
    return { text: `${sign}${pp.toFixed(1)} p.p.`, up: pp > 0, down: pp < 0 };
  }
  if (m.variacaoPct == null) return { text: '—', up: false, down: false };
  const sign = m.variacaoPct > 0 ? '+' : '';
  return {
    text: `${sign}${m.variacaoPct.toFixed(1)}%`,
    up: m.variacaoPct > 0,
    down: m.variacaoPct < 0,
  };
}

function DreLinhaRow({
  linha,
  depth,
  expanded,
  onToggle,
  onDrill,
}: {
  linha: DreLinha;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDrill: (drillKey: string, label: string) => void;
}) {
  const hasFilhos = Boolean(linha.filhos?.length);
  const isOpen = expanded.has(linha.id);
  const isTotal = linha.tipo === 'total';
  const isGrupo = linha.tipo === 'grupo';

  return (
    <>
      <div
        className={`flex items-center justify-between border-t py-2.5 ${
          isTotal ? 'font-bold text-primary-700' : isGrupo ? 'font-semibold text-slate-800' : 'text-slate-700'
        }`}
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-primary-700"
          onClick={() => {
            if (hasFilhos) onToggle(linha.id);
            else onDrill(linha.drillKey, linha.label);
          }}
        >
          {hasFilhos ? (
            <span className="w-4 shrink-0 text-slate-400">{isOpen ? '▾' : '▸'}</span>
          ) : (
            <span className="w-4 shrink-0 text-slate-300">·</span>
          )}
          <span className="truncate">{linha.label}</span>
          {linha.tipo === 'sub' && (
            <span className="shrink-0 text-xs font-normal text-slate-400">ver lançamentos</span>
          )}
        </button>
        <div className="ml-4 flex shrink-0 items-center gap-4">
          {linha.pctSobreReceitaLiquida != null && (
            <span className="w-16 text-right text-xs text-slate-400">
              {linha.pctSobreReceitaLiquida.toFixed(1)}%
            </span>
          )}
          <button
            type="button"
            className="w-32 text-right tabular-nums hover:underline"
            onClick={() => onDrill(linha.drillKey, linha.label)}
          >
            {formatCurrency(linha.valor)}
          </button>
        </div>
      </div>
      {hasFilhos &&
        isOpen &&
        linha.filhos!.map((f) => (
          <DreLinhaRow
            key={f.id}
            linha={f}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onDrill={onDrill}
          />
        ))}
    </>
  );
}

export function DreGerencialView() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [dimensao, setDimensao] = useState('consolidado');
  const [dre, setDre] = useState<DreGerencial | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState('');
  const [drillLoading, setDrillLoading] = useState(false);
  const [drill, setDrill] = useState<DreDrilldown | null>(null);
  const [erro, setErro] = useState('');

  const params = useCallback(() => {
    const p: Record<string, string> = { periodo, dimensao };
    if (periodo === 'personalizado') {
      if (de) p.de = de;
      if (ate) p.ate = ate;
    }
    return p;
  }, [periodo, dimensao, de, ate]);

  const carregar = useCallback(async () => {
    if (periodo === 'personalizado' && (!de || !ate)) return;
    setLoading(true);
    setErro('');
    try {
      const r = await financeiroApi.dre(params());
      setDre(r);
      setExpanded(new Set(r.linhas.filter((l) => l.tipo === 'grupo').map((l) => l.id)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar DRE');
      setDre(null);
    } finally {
      setLoading(false);
    }
  }, [params, periodo, de, ate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const abrirDrill = async (drillKey: string, label: string) => {
    setDrillTitle(label);
    setDrillOpen(true);
    setDrillLoading(true);
    setDrill(null);
    try {
      const r = await financeiroApi.dreDrilldown({ ...params(), drillKey });
      setDrill(r);
    } catch (e) {
      setDrill({
        drillKey,
        periodo: dre?.periodo || { inicioYmd: '', fimYmd: '', label: '' },
        total: 0,
        items: [],
      });
      setErro(e instanceof Error ? e.message : 'Erro no drill-down');
    } finally {
      setDrillLoading(false);
    }
  };

  const mkt = dre?.marketing;
  const showMarketing = Boolean(
    mkt && (mkt.investimento > 0 || mkt.clientesAdquiridos > 0 || mkt.receitaAtribuida > 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="hoje">Hoje</option>
          <option value="ontem">Ontem</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Mês atual</option>
          <option value="mes_passado">Mês anterior</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="personalizado">Personalizado</option>
        </Select>
        {periodo === 'personalizado' && (
          <>
            <Input label="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            <Input label="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </>
        )}
        <Select label="Dimensão" value={dimensao} onChange={(e) => setDimensao(e.target.value)}>
          <option value="consolidado">Consolidado</option>
          <option value="categoria">Por categoria</option>
          <option value="servico">Por serviço</option>
          <option value="prestador">Por prestador</option>
          <option value="cliente">Por cliente</option>
          <option value="canal">Por canal</option>
        </Select>
        <Button variant="secondary" onClick={carregar}>
          Atualizar
        </Button>
      </div>

      {erro && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      {loading || !dre ? (
        <Loading />
      ) : (
        <>
          {!dre.temDadosReais && (
            <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
              Cadastre receitas e despesas por categoria para compor a DRE.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CARD_DEFS.map(({ key, label, pct }) => {
              const m = dre.cards[key];
              const delta = fmtDelta(m, pct);
              return (
                <Card key={key}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-bold text-primary-700">
                    {pct ? `${m.valor.toFixed(1)}%` : formatCurrency(m.valor)}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      delta.up ? 'text-emerald-600' : delta.down ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    {delta.up ? '▲' : delta.down ? '▼' : '●'} {delta.text} vs período anterior
                  </p>
                </Card>
              );
            })}
          </div>

          <Card>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-primary-700">DRE gerencial</h2>
              <p className="text-xs text-slate-400">
                {dre.periodo.label}
                {dre.periodoAnterior
                  ? ` · vs ${dre.periodoAnterior.inicioYmd} → ${dre.periodoAnterior.fimYmd}`
                  : ''}
              </p>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Regime competência · clique no grupo para expandir · clique no valor/sublinha para
              lançamentos
            </p>
            <div>
              {dre.linhas.map((l) => (
                <DreLinhaRow
                  key={l.id}
                  linha={l}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  onDrill={abrirDrill}
                />
              ))}
            </div>
          </Card>

          {showMarketing && mkt && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-primary-700">Marketing / aquisição</h2>
              <p className="mb-4 text-xs text-amber-700">
                {mkt.nota ||
                  'ROAS = receita atribuída / investimento. Não é lucro — use margem após mídia.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Investimento em mídia', formatCurrency(mkt.investimento)],
                  ['Clientes adquiridos (paid)', String(mkt.clientesAdquiridos)],
                  ['Receita atribuída', formatCurrency(mkt.receitaAtribuida)],
                  ['CAC', mkt.cac != null ? formatCurrency(mkt.cac) : '—'],
                  ['ROAS', mkt.roas != null ? `${mkt.roas.toFixed(2)}x` : '—'],
                  ['Margem após mídia', formatCurrency(mkt.margemAposMidia)],
                  [
                    'Margem após mídia %',
                    mkt.margemAposMidiaPct != null ? `${mkt.margemAposMidiaPct.toFixed(1)}%` : '—',
                  ],
                ].map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="text-lg font-semibold text-slate-800">{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {dimensao !== 'consolidado' && dre.dimensoes && dre.dimensoes.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-bold text-primary-700">Visão dimensional</h2>
              <TableWrapper>
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Dimensão</th>
                      <th className="p-3 text-right">Receita bruta</th>
                      <th className="p-3 text-right">Custos var.</th>
                      <th className="p-3 text-right">Margem</th>
                      <th className="p-3 text-right">Margem %</th>
                      <th className="p-3 text-right">Resultado op.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dre.dimensoes.map((d) => (
                      <tr key={d.chave} className="border-t">
                        <td className="p-3 font-medium">{d.label}</td>
                        <td className="p-3 text-right">{formatCurrency(d.receitaBruta)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.custosVariaveis)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.margemContribuicao)}</td>
                        <td className="p-3 text-right">{d.margemPct.toFixed(1)}%</td>
                        <td className="p-3 text-right">{formatCurrency(d.resultadoOperacional)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            </Card>
          )}
        </>
      )}

      <Modal open={drillOpen} onClose={() => setDrillOpen(false)} title={`Lançamentos · ${drillTitle}`}>
        {drillLoading ? (
          <Loading />
        ) : (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto">
            <p className="text-sm text-slate-500">
              Total: <strong>{formatCurrency(drill?.total || 0)}</strong> · {drill?.items.length || 0}{' '}
              lançamento(s)
            </p>
            {!drill?.items.length ? (
              <p className="text-sm text-slate-500">Nenhum lançamento nesta linha no período.</p>
            ) : (
              <TableWrapper>
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2">Vínculo</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drill.items.map((i) => (
                      <tr key={i.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{formatDate(i.dataCompetencia)}</td>
                        <td className="p-2">
                          <div className="font-medium">{i.descricao}</div>
                          <div className="text-xs text-slate-400">
                            {i.categoria}
                            {i.subcategoria ? ` · ${i.subcategoria}` : ''}
                          </div>
                        </td>
                        <td className="p-2">{i.clienteNome || '—'}</td>
                        <td className="p-2">
                          {i.pedidoId ? (
                            <Link className="text-primary-700 underline" to={`/pedidos/${i.pedidoId}`}>
                              Pedido {i.pedidoNumero || i.pedidoId.slice(0, 8)}
                            </Link>
                          ) : i.ordemServicoId ? (
                            <Link className="text-primary-700 underline" to="/ordens-servico">
                              OS
                            </Link>
                          ) : (
                            '—'
                          )}
                          {i.prestadorNome && (
                            <div className="text-xs text-slate-400">{i.prestadorNome}</div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <Badge>{i.natureza}</Badge>
                          <div className="mt-1 font-medium">{formatCurrency(i.valor)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
