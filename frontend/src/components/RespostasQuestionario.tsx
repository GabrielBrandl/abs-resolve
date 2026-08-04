/** Exibe respostas do questionário (incl. com/sem material) em pedidos e OS. */

type OpcoesSolicitacao = {
  itens?: Array<{
    slug?: string;
    nome?: string;
    quantidade?: number;
    respostas?: Record<string, string>;
  }>;
};

const MATERIAL_IDS = new Set([
  'fornecimentoTomada',
  'fornecimentoInterruptor',
  'materiaisInstalacaoAr',
  'chuveiroComprado',
  'resistenciaFornecidaPor',
  'fornecimento',
  'quemForneceMaterial',
]);

const LABEL_OPCAO: Record<string, string> = {
  cliente: 'Cliente fornece / já tem',
  'abs-padrao': 'ABS Resolve fornece (padrão)',
  'abs-premium': 'ABS Resolve fornece (premium)',
  'cliente-fornece': 'Cliente fornece o material',
  'abs-fornece-kit': 'ABS Resolve fornece o kit',
  sim: 'Sim (cliente já comprou)',
  'nao-abs': 'Não — ABS Resolve compra',
};

function humanizar(id: string) {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function extrairItens(opcoes: unknown) {
  if (!opcoes || typeof opcoes !== 'object') return [] as NonNullable<OpcoesSolicitacao['itens']>;
  const raw = opcoes as OpcoesSolicitacao & Record<string, unknown>;
  if (Array.isArray(raw.itens) && raw.itens.length) return raw.itens;
  const respostas: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && !['itens', 'breakdown', 'pontosTotal'].includes(k)) respostas[k] = v;
  }
  return Object.keys(respostas).length ? [{ respostas }] : [];
}

export function RespostasQuestionario({
  opcoes,
  titulo = 'O que o cliente pediu',
}: {
  opcoes: unknown;
  titulo?: string;
}) {
  const itens = extrairItens(opcoes);
  if (!itens.length) return null;

  const temRespostas = itens.some((i) => i.respostas && Object.keys(i.respostas).length > 0);
  if (!temRespostas) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
      <p className="mb-2 font-semibold text-amber-900">{titulo}</p>
      <div className="space-y-3">
        {itens.map((item, idx) => {
          const respostas = Object.entries(item.respostas || {}).filter(
            ([k, v]) => v && !k.endsWith('_texto')
          );
          if (!respostas.length) return null;
          return (
            <div key={idx}>
              {(item.nome || itens.length > 1) && (
                <p className="mb-1 font-medium text-primary-800">
                  {item.quantidade && item.quantidade > 1 ? `${item.quantidade}x ` : ''}
                  {item.nome || `Item ${idx + 1}`}
                </p>
              )}
              <ul className="space-y-1 text-xs text-slate-700">
                {respostas.map(([perguntaId, opcaoId]) => {
                  const material = MATERIAL_IDS.has(perguntaId);
                  const label = LABEL_OPCAO[opcaoId] || humanizar(opcaoId);
                  return (
                    <li
                      key={perguntaId}
                      className={
                        material
                          ? 'rounded-md border border-amber-300 bg-white px-2 py-1.5 font-medium text-amber-950'
                          : 'px-1'
                      }
                    >
                      <span className="text-slate-500">{humanizar(perguntaId)}:</span>{' '}
                      {label}
                      {material ? ' · Material' : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
