import { fluxoConfigService } from '../services/fluxo-config.service.js';

const MATERIAL_PERGUNTA_IDS = new Set([
  'fornecimentoTomada',
  'fornecimentoInterruptor',
  'materiaisInstalacaoAr',
  'chuveiroComprado',
  'resistenciaFornecidaPor',
  'fornecimento',
  'quemForneceMaterial',
]);

export type ItemRespostasFluxo = {
  slug?: string;
  nome?: string;
  quantidade?: number;
  respostas?: Record<string, string>;
};

export type LinhaRespostaFormatada = {
  perguntaId: string;
  pergunta: string;
  opcaoId: string;
  label: string;
  material: boolean;
};

function rotuloPerguntaFallback(id: string) {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function formatarRespostasItem(
  slug: string | undefined,
  respostas: Record<string, string> | undefined
): LinhaRespostaFormatada[] {
  if (!respostas || !Object.keys(respostas).length) return [];
  const fluxo = slug ? fluxoConfigService.getFluxoEfetivo(slug) : undefined;
  const linhas: LinhaRespostaFormatada[] = [];

  for (const [perguntaId, opcaoId] of Object.entries(respostas)) {
    if (!opcaoId || perguntaId.endsWith('_texto')) continue;
    const pergunta = fluxo?.perguntas.find((p) => p.id === perguntaId);
    const opcao = pergunta?.opcoes.find((o) => o.id === opcaoId);
    linhas.push({
      perguntaId,
      pergunta: pergunta?.titulo || rotuloPerguntaFallback(perguntaId),
      opcaoId,
      label: opcao?.label || rotuloPerguntaFallback(String(opcaoId)),
      material: MATERIAL_PERGUNTA_IDS.has(perguntaId),
    });
  }

  return linhas;
}

export function extrairItensSolicitacao(opcoes: unknown): ItemRespostasFluxo[] {
  if (!opcoes || typeof opcoes !== 'object') return [];
  const raw = opcoes as { itens?: ItemRespostasFluxo[] };
  if (Array.isArray(raw.itens) && raw.itens.length) return raw.itens;
  // legado: respostas no root
  const flat = opcoes as Record<string, unknown>;
  const respostas: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v === 'string' && !['itens', 'breakdown', 'pontosTotal'].includes(k)) {
      respostas[k] = v;
    }
  }
  if (!Object.keys(respostas).length) return [];
  return [{ respostas }];
}

export function resumoMaterialSolicitacao(opcoes: unknown): string[] {
  const linhas: string[] = [];
  for (const item of extrairItensSolicitacao(opcoes)) {
    const formatadas = formatarRespostasItem(item.slug, item.respostas);
    const materiais = formatadas.filter((l) => l.material);
    const nome = item.nome || item.slug || 'Serviço';
    if (materiais.length) {
      for (const m of materiais) {
        linhas.push(`${nome}: ${m.pergunta} → ${m.label}`);
      }
    } else if (formatadas.length) {
      // sem pergunta explícita de material, lista respostas principais
      continue;
    }
  }
  return linhas;
}

export function resumoCompletoRespostas(opcoes: unknown): Array<{
  nome: string;
  quantidade: number;
  respostas: LinhaRespostaFormatada[];
}> {
  return extrairItensSolicitacao(opcoes).map((item) => ({
    nome: item.nome || item.slug || 'Serviço',
    quantidade: item.quantidade || 1,
    respostas: formatarRespostasItem(item.slug, item.respostas),
  }));
}

export function formatarEnderecoCliente(endereco: unknown): string {
  if (!endereco || typeof endereco !== 'object') return '—';
  const e = endereco as Record<string, string>;
  const parts = [
    [e.rua, e.numero].filter(Boolean).join(', '),
    e.complemento,
    e.bairro,
    [e.cidade, e.uf].filter(Boolean).join(' - '),
    e.cep ? `CEP ${e.cep}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || '—';
}
