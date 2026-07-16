import { fluxoConfigService } from './fluxo-config.service.js';

export interface InterpretacaoResposta {
  opcaoId: string | null;
  label: string | null;
  confianca: number;
  mensagem: string;
  textoLivre: string;
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(texto: string, label: string, id: string): number {
  const t = normalizar(texto);
  const l = normalizar(label);
  const i = normalizar(id.replace(/-/g, ' '));
  if (!t) return 0;
  if (t === l || t === i) return 1;
  if (l.includes(t) || t.includes(l)) return 0.85;
  if (i.includes(t) || t.includes(i)) return 0.75;

  const termos = t.split(' ').filter((w) => w.length > 1);
  if (!termos.length) return 0;
  const alvo = `${l} ${i}`;
  const hits = termos.filter((w) => alvo.includes(w)).length;
  return hits / termos.length;
}

async function interpretarComOpenAI(
  perguntaTitulo: string,
  opcoes: Array<{ id: string; label: string }>,
  texto: string
): Promise<{ opcaoId: string; confianca: number; mensagem: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você é o consultor da ABS Resolve. Dado o texto do cliente e as opções de múltipla escolha, ' +
              'escolha a opção mais próxima. Responda só JSON: {"opcaoId":"...","confianca":0-1,"mensagem":"frase curta em português confirmando o entendimento"}. ' +
              'Se nenhuma opção couber, use opcaoId null e confianca 0.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              pergunta: perguntaTitulo,
              opcoes,
              textoCliente: texto,
            }),
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      opcaoId?: string | null;
      confianca?: number;
      mensagem?: string;
    };
    if (!parsed.opcaoId) return null;
    const existe = opcoes.some((o) => o.id === parsed.opcaoId);
    if (!existe) return null;
    return {
      opcaoId: parsed.opcaoId,
      confianca: typeof parsed.confianca === 'number' ? parsed.confianca : 0.7,
      mensagem: parsed.mensagem?.trim() || '',
    };
  } catch (err) {
    console.warn('interpretar resposta OpenAI falhou:', err);
    return null;
  }
}

export async function interpretarRespostaFluxo(
  slug: string,
  perguntaId: string,
  texto: string
): Promise<InterpretacaoResposta> {
  const textoLivre = texto.trim();
  if (!textoLivre) {
    return {
      opcaoId: null,
      label: null,
      confianca: 0,
      mensagem: 'Escreva uma resposta ou escolha uma das opções.',
      textoLivre: '',
    };
  }

  const fluxo = fluxoConfigService.getFluxoEfetivo(slug);
  if (!fluxo) {
    return {
      opcaoId: null,
      label: null,
      confianca: 0,
      mensagem: 'Serviço não encontrado.',
      textoLivre,
    };
  }
  const pergunta = fluxo.perguntas.find((p) => p.id === perguntaId);
  if (!pergunta) {
    return {
      opcaoId: null,
      label: null,
      confianca: 0,
      mensagem: 'Pergunta não encontrada neste serviço.',
      textoLivre,
    };
  }

  const comIa = await interpretarComOpenAI(pergunta.titulo, pergunta.opcoes, textoLivre);
  if (comIa && comIa.confianca >= 0.45) {
    const opcao = pergunta.opcoes.find((o) => o.id === comIa.opcaoId)!;
    return {
      opcaoId: opcao.id,
      label: opcao.label,
      confianca: comIa.confianca,
      mensagem:
        comIa.mensagem ||
        `Entendi: ${opcao.label}. Vamos seguir com essa opção.`,
      textoLivre,
    };
  }

  let melhor = { id: '', label: '', score: 0 };
  for (const opcao of pergunta.opcoes) {
    const score = scoreMatch(textoLivre, opcao.label, opcao.id);
    if (score > melhor.score) melhor = { id: opcao.id, label: opcao.label, score };
  }

  if (melhor.score >= 0.45) {
    return {
      opcaoId: melhor.id,
      label: melhor.label,
      confianca: melhor.score,
      mensagem: `Entendi: ${melhor.label}. Vamos seguir com essa opção.`,
      textoLivre,
    };
  }

  return {
    opcaoId: null,
    label: null,
    confianca: melhor.score,
    mensagem:
      'Não consegui identificar com segurança. Escolha uma das opções acima ou descreva de outro jeito.',
    textoLivre,
  };
}
